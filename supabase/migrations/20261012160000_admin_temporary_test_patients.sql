-- Admin-only, time-limited creation of clearly synthetic patient accounts.
-- Never changes global email-confirmation settings for normal patients.
create table if not exists private.patient_test_mode (
  singleton boolean primary key default true check (singleton),
  expires_at timestamptz not null default '-infinity',
  created_count integer not null default 0 check (created_count between 0 and 5),
  enabled_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into private.patient_test_mode(singleton) values (true) on conflict (singleton) do nothing;
alter table private.patient_test_mode enable row level security;
revoke all on private.patient_test_mode from public,anon,authenticated;

create table if not exists private.patient_test_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 constraint test_account_lifespan check (expires_at <= created_at + interval '24 hours')
);
alter table private.patient_test_accounts enable row level security;
revoke all on private.patient_test_accounts from public,anon,authenticated;

create function private.require_patient_test_admin()
returns void language plpgsql stable security definer set search_path=''
as $$
begin
 if auth.uid() is null or coalesce(auth.jwt()->>'aal','') <> 'aal2'
  or not exists (select 1 from public.profiles p where p.id=auth.uid() and p.account_type='admin')
  or not exists (select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null)
 then raise exception 'Verified administrator with second factor required' using errcode='42501'; end if;
end
$$;
revoke all on function private.require_patient_test_admin() from public,anon,authenticated;

create function private.patient_test_mode_status_impl()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare s private.patient_test_mode%rowtype;
begin
 perform private.require_patient_test_admin();
 select * into s from private.patient_test_mode where singleton=true;
 return jsonb_build_object(
  'active',coalesce(s.expires_at>now() and s.created_count<5,false),
  'expires_at',s.expires_at,
  'remaining', greatest(0,5-coalesce(s.created_count,0)),
  'max_accounts',5,
  'account_hours',24
 );
end
$$;
revoke all on function private.patient_test_mode_status_impl() from public,anon,authenticated;

create function private.set_patient_test_mode_impl(p_enable boolean)
returns jsonb language plpgsql security definer set search_path=''
as $$
begin
 perform private.require_patient_test_admin();
 if p_enable then
   update private.patient_test_mode
   set expires_at=now()+interval '60 minutes',created_count=0,enabled_by=auth.uid(),updated_at=now()
   where singleton=true;
 else
   update private.patient_test_mode
   set expires_at=now(),updated_at=now()
   where singleton=true;
 end if;
 return private.patient_test_mode_status_impl();
end
$$;
revoke all on function private.set_patient_test_mode_impl(boolean) from public,anon,authenticated;

create function private.consume_patient_test_slot_impl()
returns timestamptz language plpgsql security definer set search_path=''
as $$
declare n integer;
begin
 perform private.require_patient_test_admin();
 update private.patient_test_mode
 set created_count=created_count+1,updated_at=now()
 where singleton=true and expires_at>now() and created_count<5
 returning created_count into n;
 if n is null then
   raise exception 'Test account creation is disabled, expired, or at the five-account limit';
 end if;
 return now()+interval '24 hours';
end
$$;
revoke all on function private.consume_patient_test_slot_impl() from public,anon,authenticated;

create function private.register_patient_test_account_impl(p_user_id uuid,p_expires_at timestamptz)
returns void language plpgsql security definer set search_path=''
as $$
begin
 perform private.require_patient_test_admin();
 if not exists (
   select 1 from auth.users u
   where u.id=p_user_id
    and u.email_confirmed_at is not null
    and u.created_at > now()-interval '3 minutes'
    and u.email like 'icp-qa-%@example.com'
    and u.raw_app_meta_data->>'qa_test_account'='true'
 ) then raise exception 'Only newly-created verified synthetic QA users may be registered'; end if;
 if not exists (
  select 1 from private.patient_test_mode m
  where m.singleton=true and m.enabled_by=auth.uid()
   and m.expires_at>now() and m.created_count between 1 and 5
 ) then raise exception 'Test mode has expired or is unavailable'; end if;
 if p_expires_at>now()+interval '24 hours' or p_expires_at<now()+interval '22 hours' then
   raise exception 'Invalid synthetic account expiration';
 end if;
 insert into private.patient_test_accounts(user_id,created_by,expires_at)
 values(p_user_id,auth.uid(),p_expires_at)
 on conflict(user_id) do nothing;
end
$$;
revoke all on function private.register_patient_test_account_impl(uuid,timestamptz) from public,anon,authenticated;

create function public.patient_test_mode_status()
returns jsonb language sql security invoker set search_path=''
as $$ select private.patient_test_mode_status_impl() $$;
create function public.set_patient_test_mode(p_enable boolean)
returns jsonb language sql security invoker set search_path=''
as $$ select private.set_patient_test_mode_impl(p_enable) $$;
create function public.consume_patient_test_slot()
returns timestamptz language sql security invoker set search_path=''
as $$ select private.consume_patient_test_slot_impl() $$;
create function public.register_patient_test_account(p_user_id uuid,p_expires_at timestamptz)
returns void language sql security invoker set search_path=''
as $$ select private.register_patient_test_account_impl(p_user_id,p_expires_at) $$;
revoke all on function public.patient_test_mode_status(),public.set_patient_test_mode(boolean),
 public.consume_patient_test_slot(),public.register_patient_test_account(uuid,timestamptz)
 from public,anon;
grant execute on function public.patient_test_mode_status(),public.set_patient_test_mode(boolean),
 public.consume_patient_test_slot(),public.register_patient_test_account(uuid,timestamptz)
 to authenticated;
grant execute on function private.require_patient_test_admin(),
 private.patient_test_mode_status_impl(),private.set_patient_test_mode_impl(boolean),
 private.consume_patient_test_slot_impl(),private.register_patient_test_account_impl(uuid,timestamptz)
 to authenticated;

-- Expired synthetic accounts cannot use the PHI intake/booking authorization boundary.
-- Genuine patients and administrators keep the pre-existing behavior unchanged.
create or replace function private.patient_secure_session()
returns boolean language sql stable security definer set search_path=''
as $$
select auth.uid() is not null and coalesce(auth.jwt()->>'aal','')='aal2'
 and exists (select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
 and exists (select 1 from public.profiles where id=auth.uid() and account_type in ('patient','admin'))
 and (
  not exists (select 1 from auth.users u where u.id=auth.uid() and u.raw_app_meta_data->>'qa_test_account'='true')
  or exists (select 1 from private.patient_test_accounts t where t.user_id=auth.uid() and t.expires_at>now())
 );
$$;
