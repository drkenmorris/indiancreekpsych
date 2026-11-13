create table public.emr_modality_providers (
 provider_id uuid primary key references public.profiles(id)
);

create table public.emr_treatment_modalities (
 patient_id uuid primary key references public.clinical_patients(id),
 assigned_provider_id uuid references public.profiles(id),
 revision integer not null default 1,
 sessions jsonb not null default '[]',
 updated_by uuid not null default auth.uid() references auth.users(id),
 updated_at timestamptz not null default now()
);
create index emr_modality_assigned_idx on public.emr_treatment_modalities(assigned_provider_id);
alter table public.emr_modality_providers enable row level security;
alter table public.emr_treatment_modalities enable row level security;
revoke all on public.emr_modality_providers,public.emr_treatment_modalities from public,anon,authenticated;
grant select,insert on public.emr_modality_providers to authenticated;
grant select,insert on public.emr_treatment_modalities to authenticated;
grant update(sessions,assigned_provider_id,revision) on public.emr_treatment_modalities to authenticated;

create function private.modality_role() returns text
language sql stable security invoker set search_path='' as $$
 select account_type from public.profiles
 where id=auth.uid() and auth.jwt()->>'aal'='aal2' and account_type in ('admin','staff')
$$;

create function private.modality_directory(p_include_staff boolean)
returns table(id uuid,name text,enrolled boolean)
language sql stable security definer set search_path='' as $$
 select p.id, coalesce(nullif(btrim(p.full_name),''),nullif(btrim(p.preferred_name),''),'Unnamed clinic account'),
        p.account_type='admin' or r.provider_id is not null
 from public.profiles p join auth.users u on u.id=p.id
 left join public.emr_modality_providers r on r.provider_id=p.id
 where private.modality_role() in ('admin','staff')
   and (private.modality_role()='admin' or exists (
    select 1 from public.emr_modality_providers self where self.provider_id=auth.uid()))
   and p.account_type in ('admin','staff') and u.email_confirmed_at is not null
   and (u.banned_until is null or u.banned_until<=now())
   and (p.account_type='admin' or r.provider_id is not null or (p_include_staff and private.modality_role()='admin'))
 order by 2,1
$$;

create function private.modality_patient_active(p_patient uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists (select 1 from public.clinical_patients
 where id=p_patient and directory_deleted_at is null and demographics->>'active' is distinct from 'false'
   and (private.modality_role()='admin' or (private.modality_role()='staff' and exists (
    select 1 from public.emr_treatment_modalities m where m.patient_id=p_patient and m.assigned_provider_id=auth.uid()
   ))))
$$;

create policy modality_roster_admin_read on public.emr_modality_providers for select to authenticated
 using ((select private.modality_role())='admin');
create policy modality_roster_admin_add on public.emr_modality_providers for insert to authenticated
 with check ((select private.modality_role())='admin' and exists (
  select 1 from private.modality_directory(true) p where p.id=provider_id and not p.enrolled));

create policy modality_read on public.emr_treatment_modalities for select to authenticated
 using (((select private.modality_role())='admin' or
   (assigned_provider_id=(select auth.uid()) and exists (
    select 1 from private.modality_directory(false) p where p.id=(select auth.uid()))))
  and private.modality_patient_active(patient_id));
create policy modality_insert on public.emr_treatment_modalities for insert to authenticated
 with check ((select private.modality_role())='admin' and private.modality_patient_active(patient_id));
create policy modality_update on public.emr_treatment_modalities for update to authenticated
 using (((select private.modality_role())='admin' or
   (assigned_provider_id=(select auth.uid()) and exists (
    select 1 from private.modality_directory(false) p where p.id=(select auth.uid()))))
  and private.modality_patient_active(patient_id))
 with check (((select private.modality_role())='admin' or
   (assigned_provider_id=(select auth.uid()) and exists (
    select 1 from private.modality_directory(false) p where p.id=(select auth.uid()))))
  and private.modality_patient_active(patient_id));

create function private.guard_emr_modality() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.revision is distinct from old.revision+1 then raise exception 'Modality revision conflict' using errcode='40001'; end if;
  if new.assigned_provider_id is distinct from old.assigned_provider_id and private.modality_role() is distinct from 'admin' then
   raise exception 'Only an administrator can change the chart assignment' using errcode='42501';
  end if;
 elsif new.revision is distinct from 1 then
  raise exception 'Invalid initial revision';
 end if;
 if new.assigned_provider_id is not null and not exists (
  select 1 from private.modality_directory(false) p where p.id=new.assigned_provider_id
 ) then raise exception 'Select an active chart provider'; end if;
 if jsonb_typeof(new.sessions) is distinct from 'array' or jsonb_array_length(new.sessions)>50 then
  raise exception 'Use up to 50 session rows';
 end if;
 if exists (
  select 1 from jsonb_array_elements(new.sessions) s
  where jsonb_typeof(s) is distinct from 'object'
    or coalesce(s->>'code','') not in ('90791','90832','90834','90837','90846','90847','90849','90853')
    or coalesce(s->>'frequency','') not in ('three_weekly','twice_weekly','weekly','every_two_weeks','monthly')
    or jsonb_typeof(s->'count') is distinct from 'number'
    or coalesce(s->>'count','') !~ '^([1-9]|[1-9][0-9]|100)$'
    or not exists (select 1 from private.modality_directory(false) p where p.id::text=s->>'providerId')
    or (select count(*) from jsonb_object_keys(case when jsonb_typeof(s)='object' then s else '{}'::jsonb end))<>4
 ) then raise exception 'Invalid session row or inactive session provider'; end if;
 new.updated_by:=auth.uid();
 new.updated_at:=now();
 return new;
end;
$$;
create trigger emr_modality_guard before insert or update on public.emr_treatment_modalities
 for each row execute function private.guard_emr_modality();

create function public.emr_modality_directory(p_include_staff boolean default false)
returns table(id uuid,name text,enrolled boolean)
language sql stable security invoker set search_path='' as $$
 select * from private.modality_directory(p_include_staff)
$$;

create function private.modality_assigned_charts()
returns table(id uuid,name text)
language sql stable security definer set search_path='' as $$
 select c.id, coalesce(nullif(btrim(concat_ws(' ',c.demographics->>'first_name',c.demographics->>'last_name')),''),'Unnamed patient')
 from public.emr_treatment_modalities m join public.clinical_patients c on c.id=m.patient_id
 where m.assigned_provider_id=auth.uid() and private.modality_role() in ('admin','staff')
   and exists (select 1 from private.modality_directory(false) p where p.id=auth.uid())
   and private.modality_patient_active(c.id)
 order by 2,1
$$;
create function public.emr_modality_assigned_charts()
returns table(id uuid,name text)
language sql stable security invoker set search_path='' as $$
 select * from private.modality_assigned_charts()
$$;

revoke all on function private.modality_role(),private.modality_directory(boolean),private.modality_patient_active(uuid),
 private.guard_emr_modality(),private.modality_assigned_charts(),public.emr_modality_directory(boolean),public.emr_modality_assigned_charts()
 from public,anon,authenticated;
grant execute on function private.modality_role(),private.modality_directory(boolean),private.modality_patient_active(uuid),
 private.modality_assigned_charts(),public.emr_modality_directory(boolean),public.emr_modality_assigned_charts() to authenticated;
