
create index if not exists appointments_patient_id_idx
on public.appointments (patient_id);

create or replace function private.get_available_appointment_slots_impl(
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
      select 1 from public.appointment_blocks b
      where tstzrange(b.starts_at, b.ends_at, '[)') &&
            tstzrange(c.starts_at, c.ends_at, '[)')
    )
    and not exists (
      select 1 from public.appointments a
      where a.status = 'booked'
        and tstzrange(a.starts_at, a.ends_at, '[)') &&
            tstzrange(c.starts_at, c.ends_at, '[)')
    )
  order by c.starts_at;
$$;

revoke all on function private.get_available_appointment_slots_impl(date, date) from public;
grant execute on function private.get_available_appointment_slots_impl(date, date) to authenticated;

create or replace function public.get_available_appointment_slots(
  p_from date,
  p_to date
)
returns table(starts_at timestamptz, ends_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.get_available_appointment_slots_impl(p_from, p_to);
$$;

revoke all on function public.get_available_appointment_slots(date, date) from public;
revoke all on function public.get_available_appointment_slots(date, date) from anon;
grant execute on function public.get_available_appointment_slots(date, date) to authenticated;
