-- Central patient-bound EMR workspaces. No synthetic chart/credential migration.
create table public.emr_workspaces(
 patient_id uuid not null references public.clinical_patients(id),owner_id uuid not null default auth.uid() references auth.users(id),
 revision integer not null default 0 check(revision>=0),state jsonb not null default '{"records":[]}' check(jsonb_typeof(state)='object' and octet_length(state::text)<=12000000),
 updated_at timestamptz not null default now(),primary key(patient_id,owner_id));
create index emr_workspaces_owner_idx on public.emr_workspaces(owner_id,updated_at desc);
create table public.emr_workspace_versions(
 patient_id uuid not null,owner_id uuid not null default auth.uid(),revision integer not null check(revision>0),state jsonb not null,
 actor_id uuid not null default auth.uid() references auth.users(id),created_at timestamptz not null default now(),
 primary key(patient_id,owner_id,revision),foreign key(patient_id,owner_id) references public.emr_workspaces(patient_id,owner_id));
create index emr_workspace_versions_owner_idx on public.emr_workspace_versions(owner_id);
create index emr_workspace_versions_actor_idx on public.emr_workspace_versions(actor_id);
alter table public.emr_workspaces enable row level security;alter table public.emr_workspace_versions enable row level security;
revoke all on public.emr_workspaces,public.emr_workspace_versions from public,anon,authenticated;
grant select,insert on public.emr_workspaces to authenticated;grant update(revision,state,updated_at) on public.emr_workspaces to authenticated;
grant select,insert on public.emr_workspace_versions to authenticated;
create policy emr_workspace_access on public.emr_workspaces for all to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin()) with check(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin());
create policy emr_version_read on public.emr_workspace_versions for select to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin());
create policy emr_version_insert on public.emr_workspace_versions for insert to authenticated with check(owner_id=(select auth.uid()) and actor_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin() and exists(select 1 from public.emr_workspaces w where w.patient_id=emr_workspace_versions.patient_id and w.owner_id=emr_workspace_versions.owner_id and w.revision=emr_workspace_versions.revision and w.state=emr_workspace_versions.state));
create function private.guard_emr_workspace() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.patient_id<>old.patient_id or new.owner_id<>old.owner_id or new.revision<>old.revision+1 then raise exception 'Invalid workspace identity or revision';end if;
  if jsonb_array_length(new.state->'records')<jsonb_array_length(old.state->'records') or exists(select 1 from jsonb_array_elements(old.state->'records') with ordinality e(value,n) where new.state->'records'->(e.n::integer-1)<>e.value) then raise exception 'Saved clinical records are immutable';end if;
 end if;
 if jsonb_typeof(new.state->'records') is distinct from 'array' then raise exception 'Clinical records required';end if;
 new.updated_at=now();return new;
end $$;
revoke all on function private.guard_emr_workspace() from public,anon,authenticated;
create trigger guard_emr_workspace before insert or update on public.emr_workspaces for each row execute function private.guard_emr_workspace();
create function public.save_emr_workspace(p_patient uuid,p_expected integer,p_state jsonb,p_demographics jsonb default null,p_patient_revision integer default null) returns integer language plpgsql security invoker set search_path='' as $$
declare w public.emr_workspaces;n integer;
begin
 insert into public.emr_workspaces(patient_id) values(p_patient) on conflict do nothing;
 select * into w from public.emr_workspaces where patient_id=p_patient and owner_id=auth.uid() for update;
 if not found then raise exception 'Workspace unavailable' using errcode='42501';end if;
 if w.revision<>p_expected then raise exception 'Another session saved this patient. Reopen the chart to review the latest revision.' using errcode='40001';end if;
 n=w.revision+1;
 if p_demographics is not null then
  update public.clinical_patients set demographics=demographics||p_demographics where id=p_patient and revision=p_patient_revision;
  if not found then raise exception 'Patient demographics changed. Reopen the chart.' using errcode='40001';end if;
 end if;
 update public.emr_workspaces set state=p_state,revision=n where patient_id=p_patient and owner_id=auth.uid();
 insert into public.emr_workspace_versions(patient_id,revision,state) values(p_patient,n,p_state);
 return n;
end $$;
revoke all on function public.save_emr_workspace(uuid,integer,jsonb,jsonb,integer) from public,anon;grant execute on function public.save_emr_workspace(uuid,integer,jsonb,jsonb,integer) to authenticated;
