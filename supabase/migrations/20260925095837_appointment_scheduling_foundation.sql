
create schema if not exists private;

create or replace function private.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and account_type = 'admin'
  );
$$;

revoke all on function private.current_user_is_admin() from public;
grant execute on function private.current_user_is_admin() to authenticated;

create or replace function private.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.account_type is distinct from old.account_type
     and not private.current_user_is_admin() then
    raise exception 'Account type cannot be changed by the current user';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
before update of account_type on public.profiles
for each row execute function private.prevent_profile_role_escalation();

create table if not exists public.appointment_settings (
  id boolean primary key default true check (id),
  scheduling_enabled boolean not null default false,
  timezone text not null default 'America/Chicago',
  appointment_duration_minutes integer not null default 50 check (appointment_duration_minutes between 15 and 240),
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 240),
  minimum_notice_hours integer not null default 24 check (minimum_notice_hours between 0 and 720),
  maximum_advance_days integer not null default 60 check (maximum_advance_days between 1 and 365),
  updated_at timestamptz not null default now()
);

insert into public.appointment_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.appointment_availability_rules (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.appointment_blocks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  label text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked','cancelled','completed','no_show')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (ends_at > starts_at)
);

alter table public.appointment_settings enable row level security;
alter table public.appointment_availability_rules enable row level security;
alter table public.appointment_blocks enable row level security;
alter table public.appointments enable row level security;

grant select on public.appointment_settings to authenticated;
grant select on public.appointment_availability_rules to authenticated;
grant select, insert, update, delete on public.appointment_settings to authenticated;
grant select, insert, update, delete on public.appointment_availability_rules to authenticated;
grant select, insert, update, delete on public.appointment_blocks to authenticated;
grant select, insert, update on public.appointments to authenticated;

create policy appointment_settings_select_authenticated
on public.appointment_settings for select
to authenticated
using (true);

create policy appointment_settings_admin_write
on public.appointment_settings for update
to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

create policy availability_rules_select_authenticated
on public.appointment_availability_rules for select
to authenticated
using (true);

create policy availability_rules_admin_insert
on public.appointment_availability_rules for insert
to authenticated
with check ((select private.current_user_is_admin()));

create policy availability_rules_admin_update
on public.appointment_availability_rules for update
to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

create policy availability_rules_admin_delete
on public.appointment_availability_rules for delete
to authenticated
using ((select private.current_user_is_admin()));

create policy appointment_blocks_admin_all
on public.appointment_blocks for all
to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

create policy appointments_select_own_or_admin
on public.appointments for select
to authenticated
using (
  patient_id = (select auth.uid())
  or (select private.current_user_is_admin())
);

create policy appointments_patient_insert
on public.appointments for insert
to authenticated
with check (
  patient_id = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and account_type in ('patient','admin')
  )
);

create policy appointments_update_own_or_admin
on public.appointments for update
to authenticated
using (
  patient_id = (select auth.uid())
  or (select private.current_user_is_admin())
)
with check (
  patient_id = (select auth.uid())
  or (select private.current_user_is_admin())
);

create unique index if not exists appointments_one_start_time_booked
on public.appointments (starts_at)
where status = 'booked';

create or replace function private.validate_appointment_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.appointment_settings%rowtype;
  local_start timestamp;
  local_end timestamp;
  rule_start timestamp;
  matching_rule public.appointment_availability_rules%rowtype;
  is_admin boolean;
begin
  is_admin := private.current_user_is_admin();

  if tg_op = 'INSERT' then
    select * into s from public.appointment_settings where id = true;

    if not is_admin and new.patient_id <> (select auth.uid()) then
      raise exception 'You may only book appointments for your own account';
    end if;

    if not is_admin and not exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and account_type = 'patient'
    ) then
      raise exception 'Only patient accounts may book appointments';
    end if;

    if not s.scheduling_enabled then
      raise exception 'Online scheduling is not currently enabled';
    end if;

    new.ends_at := new.starts_at + make_interval(mins => s.appointment_duration_minutes);
    new.status := 'booked';

    if not is_admin and new.starts_at < now() + make_interval(hours => s.minimum_notice_hours) then
      raise exception 'This appointment does not meet the minimum notice requirement';
    end if;

    if not is_admin and new.starts_at > now() + make_interval(days => s.maximum_advance_days) then
      raise exception 'This appointment is beyond the booking window';
    end if;

    local_start := new.starts_at at time zone s.timezone;
    local_end := new.ends_at at time zone s.timezone;

    select r.* into matching_rule
    from public.appointment_availability_rules r
    where r.enabled
      and r.weekday = extract(dow from local_start)::int
      and local_start::time >= r.start_time
      and local_end::time <= r.end_time
    order by r.start_time
    limit 1;

    if matching_rule.id is null then
      raise exception 'This time is outside configured availability';
    end if;

    rule_start := date_trunc('day', local_start) + matching_rule.start_time;
    if mod(
      floor(extract(epoch from (local_start - rule_start)) / 60)::int,
      s.slot_interval_minutes
    ) <> 0 then
      raise exception 'This time does not match the configured booking interval';
    end if;

    if exists (
      select 1 from public.appointment_blocks b
      where tstzrange(b.starts_at, b.ends_at, '[)') &&
            tstzrange(new.starts_at, new.ends_at, '[)')
    ) then
      raise exception 'This time has been blocked from scheduling';
    end if;

    if exists (
      select 1 from public.appointments a
      where a.status = 'booked'
        and tstzrange(a.starts_at, a.ends_at, '[)') &&
            tstzrange(new.starts_at, new.ends_at, '[)')
    ) then
      raise exception 'This appointment time is no longer available';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' and not is_admin then
    if old.patient_id <> (select auth.uid()) then
      raise exception 'You may only modify your own appointment';
    end if;

    if new.patient_id is distinct from old.patient_id
       or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at
       or new.created_at is distinct from old.created_at then
      raise exception 'Patients may not change appointment details';
    end if;

    if old.status = 'booked' and new.status = 'cancelled' then
      new.cancelled_at := coalesce(new.cancelled_at, now());
      return new;
    end if;

    if new.status is distinct from old.status then
      raise exception 'Patients may only cancel booked appointments';
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_validate_booking on public.appointments;
create trigger appointments_validate_booking
before insert or update on public.appointments
for each row execute function private.validate_appointment_booking();

create or replace function private.touch_appointment_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists appointment_settings_touch on public.appointment_settings;
create trigger appointment_settings_touch
before update on public.appointment_settings
for each row execute function private.touch_appointment_settings();

create or replace function private.touch_availability_rule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists availability_rules_touch on public.appointment_availability_rules;
create trigger availability_rules_touch
before update on public.appointment_availability_rules
for each row execute function private.touch_availability_rule();

create or replace function public.get_available_appointment_slots(
  p_from date,
  p_to date
)
returns table(starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with settings as (
    select *
    from public.appointment_settings
    where id = true
      and scheduling_enabled
      and exists (
        select 1 from public.profiles
        where id = (select auth.uid())
          and account_type in ('patient','admin')
      )
  ),
  dates as (
    select d::date as local_date
    from generate_series(
      p_from::timestamp,
      least(p_to, p_from + 31)::timestamp,
      interval '1 day'
    ) d
  ),
  candidates as (
    select
      gs as starts_at,
      gs + make_interval(mins => s.appointment_duration_minutes) as ends_at
    from settings s
    join dates d on true
    join public.appointment_availability_rules r
      on r.enabled
     and r.weekday = extract(dow from d.local_date)::int
    cross join lateral generate_series(
      (d.local_date + r.start_time)::timestamp at time zone s.timezone,
      ((d.local_date + r.end_time)::timestamp at time zone s.timezone)
        - make_interval(mins => s.appointment_duration_minutes),
      make_interval(mins => s.slot_interval_minutes)
    ) gs
  )
  select c.starts_at, c.ends_at
  from candidates c
  cross join settings s
  where c.starts_at >= now() + make_interval(hours => s.minimum_notice_hours)
    and c.starts_at <= now() + make_interval(days => s.maximum_advance_days)
    and not exists (
      select 1
      from public.appointment_blocks b
      where tstzrange(b.starts_at, b.ends_at, '[)') &&
            tstzrange(c.starts_at, c.ends_at, '[)')
    )
    and not exists (
      select 1
      from public.appointments a
      where a.status = 'booked'
        and tstzrange(a.starts_at, a.ends_at, '[)') &&
            tstzrange(c.starts_at, c.ends_at, '[)')
    )
  order by c.starts_at;
$$;

revoke all on function public.get_available_appointment_slots(date, date) from public;
revoke all on function public.get_available_appointment_slots(date, date) from anon;
grant execute on function public.get_available_appointment_slots(date, date) to authenticated;
