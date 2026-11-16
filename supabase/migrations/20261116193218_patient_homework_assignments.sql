create table public.emr_homework_assignments (
 id uuid primary key,
 patient_id uuid not null references public.clinical_patients(id),
 owner_id uuid not null default auth.uid() references auth.users(id),
 plan_version_id uuid not null references public.emr_treatment_plan_versions(id),
 problem_id text not null,
 objective_id text not null,
 intervention_id text not null,
 narrative jsonb not null,
 snapshot jsonb not null,
 created_at timestamptz not null default now()
);
create index emr_homework_patient_idx on public.emr_homework_assignments(patient_id,owner_id,created_at desc,id);
create index emr_homework_owner_idx on public.emr_homework_assignments(owner_id);
create index emr_homework_plan_idx on public.emr_homework_assignments(plan_version_id);
alter table public.emr_homework_assignments enable row level security;
revoke all on public.emr_homework_assignments from public,anon,authenticated;
grant select on public.emr_homework_assignments to authenticated;
grant insert(id,patient_id,plan_version_id,problem_id,objective_id,intervention_id,narrative) on public.emr_homework_assignments to authenticated;
create policy homework_read on public.emr_homework_assignments for select to authenticated
 using(owner_id=(select auth.uid()) and (select private.current_user_is_admin()) and (select private.patient_secure_session())
 and exists(select 1 from public.emr_treatment_plans p join public.emr_treatment_plan_versions v on v.plan_id=p.id where v.id=plan_version_id and p.patient_id=emr_homework_assignments.patient_id));
create policy homework_add on public.emr_homework_assignments for insert to authenticated
 with check(owner_id=(select auth.uid()) and (select private.current_user_is_admin()) and (select private.patient_secure_session())
 and exists(select 1 from public.emr_treatment_plans p join public.emr_treatment_plan_versions v on v.plan_id=p.id where v.id=plan_version_id and p.patient_id=emr_homework_assignments.patient_id));
create function private.bind_homework_assignment() returns trigger
language plpgsql security invoker set search_path='' as $$
declare source jsonb; source_revision integer; problem jsonb; objective jsonb; intervention jsonb; characters integer; node_count integer;
begin
 if auth.uid() is null or not private.current_user_is_admin() or not private.patient_secure_session() then raise exception 'Clinic sign-in and MFA required' using errcode='42501'; end if;
 select v.snapshot,v.revision into source,source_revision from public.emr_treatment_plan_versions v join public.emr_treatment_plans p on p.id=v.plan_id
 where v.id=new.plan_version_id and p.patient_id=new.patient_id and p.owner_id=auth.uid() and v.actor_id=auth.uid();
 if source is null then raise exception 'Select a saved treatment plan for this patient' using errcode='42501'; end if;
 if exists(select 1 from public.clinical_patients c where c.id=new.patient_id and (c.directory_deleted_at is not null or c.demographics->>'active'='false')) then raise exception 'Patient unavailable' using errcode='42501'; end if;
 select node into problem from jsonb_array_elements(source->'problems') node where node->>'id'=new.problem_id and node->>'kind'='problem';
 if problem is null then raise exception 'Choose a problem in the selected patient plan'; end if;
 with recursive nodes(n) as (select problem union all select child from nodes cross join lateral jsonb_array_elements(coalesce(n->'children','[]')) child)
 select n into objective from nodes where n->>'kind'='objective' and n->>'id'=new.objective_id;
 if objective is null then raise exception 'Choose an objective linked to the selected problem'; end if;
 with recursive nodes(n) as (select objective union all select child from nodes cross join lateral jsonb_array_elements(coalesce(n->'children','[]')) child)
 select n into intervention from nodes where n->>'kind'='intervention' and n->>'id'=new.intervention_id;
 if intervention is null then raise exception 'Choose an intervention linked to the selected objective'; end if;
 if not private.valid_response_richtext(new.narrative) or octet_length(new.narrative::text)>150000 then raise exception 'Invalid homework narrative formatting'; end if;
 with recursive nodes(n) as (select new.narrative union all select child from nodes cross join lateral jsonb_array_elements(coalesce(n->'content','[]')) child)
 select coalesce(sum(char_length(n->>'text')),0),count(*) into characters,node_count from nodes;
 if characters not between 1 and 20000 or node_count>2000 or not exists(
  with recursive nodes(n) as (select new.narrative union all select child from nodes cross join lateral jsonb_array_elements(coalesce(n->'content','[]')) child)
  select 1 from nodes where coalesce(n->>'text','') ~ '[^[:space:]]'
 ) then raise exception 'Enter a homework assignment of up to 20000 characters'; end if;
 new.owner_id:=auth.uid();new.created_at:=now();
 new.snapshot:=jsonb_build_object('patient_name',source->>'patient_name','clinician_name',source->>'clinician_name','plan_title',source->>'title','plan_revision',source_revision,'plan_status',source->>'status',
 'problem',jsonb_build_object('id',new.problem_id,'text',problem->>'text'),'objective',jsonb_build_object('id',new.objective_id,'text',objective->>'text'),'intervention',jsonb_build_object('id',new.intervention_id,'text',intervention->>'text'),'assignment',new.narrative);
 return new;
end;
$$;
create trigger bind_homework before insert on public.emr_homework_assignments for each row execute function private.bind_homework_assignment();
revoke all on function private.bind_homework_assignment() from public,anon,authenticated;
