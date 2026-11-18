-- Extend shared library only; patient plan resolver remains limited to planned content.
create or replace function private.validate_planner_library(p_nodes jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if jsonb_typeof(p_nodes) is distinct from 'array' or jsonb_array_length(p_nodes) not between 1 and 5000 or octet_length(p_nodes::text)>2000000 then
  raise exception 'Invalid library size';
 end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(p_nodes) x)<>jsonb_array_length(p_nodes) then
  raise exception 'Duplicate library IDs';
 end if;
 if exists (
  select 1 from jsonb_array_elements(p_nodes) n
  where coalesce(n->>'kind','') not in ('problem','definition','goal','objective','intervention','implemented_intervention')
    or jsonb_typeof(n->'id') is distinct from 'string' or length(n->>'id') not between 1 and 100
    or jsonb_typeof(n->'text') is distinct from 'string' or length(btrim(n->>'text')) not between 1 and 2000
    or jsonb_typeof(n->'active') is distinct from 'boolean'
 ) then raise exception 'Invalid library item'; end if;
 if exists (
  with nodes as materialized (select x->>'id' as id,x->>'kind' as kind,x->>'parent' as parent from jsonb_array_elements(p_nodes) x)
  select 1 from nodes n left join nodes p on p.id=n.parent
  where (n.kind='problem' and n.parent is not null)
     or (n.kind<>'problem' and p.kind is distinct from case when n.kind='implemented_intervention' then 'intervention' when n.kind='intervention' then 'objective' else 'problem' end)
 ) then raise exception 'Invalid parent relationship'; end if;
end;
$$;

create table public.emr_implemented_intervention_entries (
 id uuid primary key,
 patient_id uuid not null references public.clinical_patients(id),
 owner_id uuid not null default auth.uid() references auth.users(id),
 plan_version_id uuid not null references public.emr_treatment_plan_versions(id),
 library_revision integer not null references public.emr_treatment_library_versions(revision),
 session_date date not null,
 selection_ids jsonb not null,
 snapshot jsonb not null,
 created_at timestamptz not null default now()
);
create index implemented_patient_idx on public.emr_implemented_intervention_entries(patient_id,owner_id,session_date desc,created_at desc);
create index implemented_owner_idx on public.emr_implemented_intervention_entries(owner_id);
create index implemented_plan_idx on public.emr_implemented_intervention_entries(plan_version_id);
create index implemented_library_idx on public.emr_implemented_intervention_entries(library_revision);
alter table public.emr_implemented_intervention_entries enable row level security;
revoke all on public.emr_implemented_intervention_entries from public,anon,authenticated;
grant select on public.emr_implemented_intervention_entries to authenticated;
grant insert(id,patient_id,plan_version_id,library_revision,session_date,selection_ids) on public.emr_implemented_intervention_entries to authenticated;
create policy implemented_read on public.emr_implemented_intervention_entries for select to authenticated
 using(owner_id=(select auth.uid()) and (select private.current_user_is_admin()) and (select private.patient_secure_session()));
create policy implemented_add on public.emr_implemented_intervention_entries for insert to authenticated
 with check(owner_id=(select auth.uid()) and (select private.current_user_is_admin()) and (select private.patient_secure_session()));
create function private.bind_implemented_interventions() returns trigger language plpgsql security invoker set search_path='' as $$
declare plan jsonb;plan_revision integer;library jsonb;problem jsonb;planned jsonb;objective jsonb;option jsonb;item jsonb;items jsonb:='[]';
begin
 if auth.uid() is null or not private.current_user_is_admin() or not private.patient_secure_session() then raise exception 'Clinic sign-in and MFA required' using errcode='42501';end if;
 if not exists(select 1 from public.clinical_patients where id=new.patient_id and directory_deleted_at is null and demographics->>'active' is distinct from 'false') then raise exception 'Patient unavailable' using errcode='42501';end if;
 select v.snapshot,v.revision into plan,plan_revision from public.emr_treatment_plan_versions v join public.emr_treatment_plans p on p.id=v.plan_id where v.id=new.plan_version_id and p.patient_id=new.patient_id and p.owner_id=auth.uid() and v.actor_id=auth.uid();
 if plan is null then raise exception 'Saved patient plan unavailable' using errcode='42501';end if;
 if new.session_date>(now() at time zone 'America/Chicago')::date or new.session_date<'1900-01-01' then raise exception 'Choose a valid nonfuture session date';end if;
 -- Serialize against shared-library publishing so selection wording cannot drift.
 perform 1 from public.emr_treatment_library where id='clinic' and revision=new.library_revision for share;
 if not found then raise exception 'Library changed; refresh choices before saving' using errcode='40001';end if;
 select nodes into library from public.emr_treatment_library_versions where revision=new.library_revision;
 if jsonb_typeof(new.selection_ids) is distinct from 'array' or jsonb_array_length(new.selection_ids) not between 1 and 100 or octet_length(new.selection_ids::text)>30000 then raise exception 'Select 1 to 100 implemented interventions';end if;
 if (select count(distinct (x->>'problemId',x->>'implementedId')) from jsonb_array_elements(new.selection_ids) x)<>jsonb_array_length(new.selection_ids) then raise exception 'Duplicate intervention selection';end if;
 for item in select value from jsonb_array_elements(new.selection_ids) loop
  select x into problem from jsonb_array_elements(plan->'problems') x where x->>'id'=item->>'problemId' and x->>'kind'='problem';
  if problem is null then raise exception 'Problem does not belong to the selected plan';end if;
  select x into option from jsonb_array_elements(library) x where x->>'id'=item->>'implementedId' and x->>'kind'='implemented_intervention' and x->>'active'='true';
  if option is null then raise exception 'Choose an active implemented intervention';end if;
  with recursive nodes(n,parent) as(select problem,null::jsonb union all select child,n from nodes cross join lateral jsonb_array_elements(coalesce(n->'children','[]')) child)
  select n,parent into planned,objective from nodes where n->>'kind'='intervention' and n->>'id'=option->>'parent' and parent->>'kind'='objective';
  if planned is null or objective is null then raise exception 'Implemented intervention is not linked to this problem and its planned interventions';end if;
  if not exists(select 1 from jsonb_array_elements(library) x where x->>'id'=planned->>'id' and x->>'kind'='intervention' and x->>'active'='true' and x->>'parent'=objective->>'id')
   or not exists(select 1 from jsonb_array_elements(library) x where x->>'id'=objective->>'id' and x->>'kind'='objective' and x->>'active'='true' and x->>'parent'=problem->>'id')
   or not exists(select 1 from jsonb_array_elements(library) x where x->>'id'=problem->>'id' and x->>'kind'='problem' and x->>'active'='true') then raise exception 'The source library branch is inactive or changed';end if;
  items:=items||jsonb_build_array(jsonb_build_object('id',option->>'id','text',option->>'text','problemId',problem->>'id','problemText',problem->>'text','plannedId',planned->>'id','plannedText',planned->>'text','objectiveId',objective->>'id','objectiveText',objective->>'text'));
 end loop;
 new.snapshot:=jsonb_build_object('plan_title',plan->>'title','plan_revision',plan_revision,'plan_status',plan->>'status','selections',items);
 new.owner_id:=auth.uid();new.created_at:=now();return new;
end;$$;
revoke all on function private.bind_implemented_interventions() from public,anon,authenticated;
create trigger bind_implemented before insert on public.emr_implemented_intervention_entries for each row execute function private.bind_implemented_interventions();
