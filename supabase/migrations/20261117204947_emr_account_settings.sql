-- Account-scoped EMR configuration; never a patient-data or credential store.
create table public.emr_account_settings (
 account_id uuid primary key references public.profiles(id),
 revision integer not null check(revision>0),
 settings jsonb not null check(jsonb_typeof(settings)='object' and octet_length(settings::text)<=20000),
 updated_at timestamptz not null default now()
);
alter table public.emr_account_settings enable row level security;
revoke all on public.emr_account_settings from public,anon,authenticated;
grant select,insert on public.emr_account_settings to authenticated;
grant update(settings,revision) on public.emr_account_settings to authenticated;
create policy emr_settings_read on public.emr_account_settings for select to authenticated
 using(account_id=(select auth.uid()) and (select private.current_user_is_admin()) and (select private.patient_secure_session()));
create policy emr_settings_insert on public.emr_account_settings for insert to authenticated
 with check(account_id=(select auth.uid()) and (select private.current_user_is_admin()) and (select private.patient_secure_session()) and revision=1);
create policy emr_settings_update on public.emr_account_settings for update to authenticated
 using(account_id=(select auth.uid()) and (select private.current_user_is_admin()) and (select private.patient_secure_session()))
 with check(account_id=(select auth.uid()) and (select private.current_user_is_admin()) and (select private.patient_secure_session()));
create function private.emr_settings_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if new.account_id<>old.account_id or new.revision<>old.revision+1 then raise exception 'Settings revision conflict' using errcode='40001'; end if;
 new.updated_at=now();return new;
end;$$;
revoke all on function private.emr_settings_guard() from public,anon,authenticated;
create trigger emr_settings_guard before update on public.emr_account_settings for each row execute function private.emr_settings_guard();
