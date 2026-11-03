-- Shared patient identity and versioned DSM records. No patient-response import/backfill.
create table public.clinical_patients (
 id uuid primary key default gen_random_uuid(),
 account_id uuid unique references public.profiles(id),
 entered_by uuid default auth.uid() references auth.users(id),
 revision integer not null default 1 check(revision>0),
 demographics jsonb not null default '{}'::jsonb check(jsonb_typeof(demographics)='object' and octet_length(demographics::text)<=24000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index clinical_patients_account_idx on public.clinical_patients(account_id);
alter table public.clinical_patients enable row level security;
revoke all on public.clinical_patients from public,anon,authenticated;
grant select,insert,update on public.clinical_patients to authenticated;
create policy clinical_patient_admin_read on public.clinical_patients for select to authenticated using ((select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin());
create policy clinical_patient_own_read on public.clinical_patients for select to authenticated using (account_id=(select auth.uid()) and private.patient_secure_session());
create policy clinical_patient_admin_insert on public.clinical_patients for insert to authenticated with check(entered_by=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin());
create policy clinical_patient_admin_update on public.clinical_patients for update to authenticated using((select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin()) with check((select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin());
create function private.clinical_patient_identity_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.id is distinct from old.id or new.account_id is distinct from old.account_id or new.entered_by is distinct from old.entered_by or new.created_at is distinct from old.created_at then raise exception 'Patient identity cannot be reassigned';end if;
  new.updated_at=now();new.revision=old.revision+1;
 end if;
 if new.account_id is not null and not exists(select 1 from public.profiles where id=new.account_id and account_type='patient') then raise exception 'A patient account is required';end if;
 return new;
end $$;
revoke all on function private.clinical_patient_identity_guard() from public,anon,authenticated;
create trigger clinical_patient_identity_guard before insert or update on public.clinical_patients for each row execute function private.clinical_patient_identity_guard();
-- Profile lifecycle creates an identity row only, never a duplicate copy of intake answers.
create function private.register_central_patient() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.account_type='patient' then insert into public.clinical_patients(id,account_id,entered_by) values(new.id,new.id,new.id) on conflict(account_id) do nothing;end if;
 return new;
end $$;
revoke all on function private.register_central_patient() from public,anon,authenticated;
create trigger register_central_patient after insert or update of account_type on public.profiles for each row execute function private.register_central_patient();
insert into public.clinical_patients(id,account_id,entered_by) select id,id,id from public.profiles where account_type='patient' on conflict(account_id) do nothing;

create table public.dsm_records (
 id uuid primary key default gen_random_uuid(),
 patient_id uuid not null references public.clinical_patients(id),
 owner_id uuid not null default auth.uid() references auth.users(id),
 label text not null check(char_length(btrim(label)) between 1 and 140),
 revision integer not null default 0 check(revision>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index dsm_records_patient_owner_idx on public.dsm_records(patient_id,owner_id,updated_at desc);
create table public.dsm_record_versions (
 id uuid primary key default gen_random_uuid(),record_id uuid not null references public.dsm_records(id),
 owner_id uuid not null default auth.uid() references auth.users(id),
 revision integer not null check(revision>0),
 state jsonb not null check(jsonb_typeof(state)='object' and octet_length(state::text)<=8000000),
 report jsonb not null check(jsonb_typeof(report)='object' and octet_length(report::text)<=8000000),
 provenance jsonb not null check(jsonb_typeof(provenance)='object'),
 content_hash text not null check(content_hash~'^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),unique(record_id,revision)
);
create index dsm_versions_record_idx on public.dsm_record_versions(record_id,revision desc);
alter table public.dsm_records enable row level security;alter table public.dsm_record_versions enable row level security;
revoke all on public.dsm_records,public.dsm_record_versions from public,anon,authenticated;
grant select,insert on public.dsm_records to authenticated;grant update(revision,updated_at) on public.dsm_records to authenticated;
grant select,insert on public.dsm_record_versions to authenticated;
create policy dsm_record_read on public.dsm_records for select to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin());
create policy dsm_record_insert on public.dsm_records for insert to authenticated with check(owner_id=(select auth.uid()) and revision=0 and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin());
create policy dsm_record_update on public.dsm_records for update to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin()) with check(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin());
create policy dsm_version_read on public.dsm_record_versions for select to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin() and exists(select 1 from public.dsm_records r where r.id=record_id and r.owner_id=dsm_record_versions.owner_id));
create policy dsm_version_insert on public.dsm_record_versions for insert to authenticated with check(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin() and exists(select 1 from public.dsm_records r where r.id=record_id and r.owner_id=(select auth.uid()) and r.revision=dsm_record_versions.revision));
create function public.save_dsm_record(p_id uuid,p_expected_revision integer,p_state jsonb,p_report jsonb,p_provenance jsonb,p_hash text) returns integer language plpgsql security invoker set search_path='' as $$
declare r public.dsm_records;next_revision integer;
begin
 select * into r from public.dsm_records where id=p_id for update;
 if not found then raise exception 'Record unavailable' using errcode='42501';end if;
 if r.revision<>p_expected_revision then raise exception 'Revision conflict' using errcode='40001';end if;
 next_revision=r.revision+1;
 update public.dsm_records set revision=next_revision,updated_at=now() where id=p_id;
 insert into public.dsm_record_versions(record_id,revision,state,report,provenance,content_hash) values(p_id,next_revision,p_state,p_report,p_provenance,p_hash);
 return next_revision;
end $$;
revoke all on function public.save_dsm_record(uuid,integer,jsonb,jsonb,jsonb,text) from public,anon;grant execute on function public.save_dsm_record(uuid,integer,jsonb,jsonb,jsonb,text) to authenticated;

-- Preserve central demographic revisions rather than overwriting their history.
create table public.clinical_patient_revisions(
 id bigint generated always as identity primary key,patient_id uuid not null references public.clinical_patients(id),
 revision integer not null,actor_id uuid references auth.users(id),demographics jsonb not null,created_at timestamptz not null default now(),unique(patient_id,revision));
alter table public.clinical_patient_revisions enable row level security;
revoke all on public.clinical_patient_revisions from public,anon,authenticated;grant select on public.clinical_patient_revisions to authenticated;
create policy clinical_revision_admin_read on public.clinical_patient_revisions for select to authenticated using((select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin());
create function private.log_clinical_demographics() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.clinical_patient_revisions(patient_id,revision,actor_id,demographics) values(new.id,new.revision,coalesce(auth.uid(),new.entered_by),new.demographics);return new;end $$;
revoke all on function private.log_clinical_demographics() from public,anon,authenticated;
create trigger clinical_demographic_history after insert or update on public.clinical_patients for each row execute function private.log_clinical_demographics();
create function private.stamp_dsm_record() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then new.created_at=now();new.updated_at=now();
 else
  if new.id is distinct from old.id or new.patient_id is distinct from old.patient_id or new.owner_id is distinct from old.owner_id or new.label is distinct from old.label or new.created_at is distinct from old.created_at or new.revision<>old.revision+1 then raise exception 'Invalid record revision or identity change';end if;
  new.updated_at=now();
 end if;return new;
end $$;
revoke all on function private.stamp_dsm_record() from public,anon,authenticated;
create trigger stamp_dsm_record before insert or update on public.dsm_records for each row execute function private.stamp_dsm_record();
create function private.stamp_dsm_version() returns trigger language plpgsql set search_path='' as $$
begin new.created_at=now();return new;end $$;
revoke all on function private.stamp_dsm_version() from public,anon,authenticated;
create trigger stamp_dsm_version before insert on public.dsm_record_versions for each row execute function private.stamp_dsm_version();
