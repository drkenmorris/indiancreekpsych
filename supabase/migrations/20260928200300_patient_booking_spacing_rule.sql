create or replace function private.get_available_appointment_slots_impl(p_from date, p_to date)
returns table(starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $function$
with settings as (
  select *
  from public.appointment_settings
  where id
    and scheduling_enabled
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and account_type in ('patient','admin')
    )
),
dates as (
  select d::date as local_date
  from generate_series(p_from::timestamp, least(p_to,p_from+31)::timestamp, interval '1 day') d
),
anchors as (
  select a.starts_at
  from public.appointments a
  cross join settings s
  where a.status='booked'
    and (a.starts_at at time zone s.timezone)::date between p_from and least(p_to,p_from+31)
  union
  select (d.local_date+r.anchor_time) at time zone s.timezone
  from dates d
  cross join settings s
  join public.appointment_availability_rules r on r.enabled and r.anchor_time is not null
  where r.weekday=extract(dow from d.local_date)::int
),
candidates as (
  select distinct
    a.starts_at + offset_hours * interval '1 hour' as starts_at,
    a.starts_at + offset_hours * interval '1 hour'
      + make_interval(mins => s.appointment_duration_minutes) as ends_at
  from anchors a
  cross join settings s
  cross join (values (-1),(1)) as offsets(offset_hours)
  where ((a.starts_at + offset_hours * interval '1 hour') at time zone s.timezone)::date
      = (a.starts_at at time zone s.timezone)::date
)
select c.starts_at,c.ends_at
from candidates c
cross join settings s
where (c.starts_at at time zone s.timezone)::date between p_from and least(p_to,p_from + 31)
  and (c.starts_at at time zone s.timezone)::date = (c.ends_at at time zone s.timezone)::date
  and c.starts_at >= now() + make_interval(hours => s.minimum_notice_hours)
  and c.starts_at <= now() + make_interval(days => s.maximum_advance_days)
  and exists (
    select 1
    from public.appointment_availability_rules r
    where r.enabled
      and r.weekday = extract(dow from c.starts_at at time zone s.timezone)::int
      and (c.starts_at at time zone s.timezone)::time >= r.start_time
      and (c.ends_at at time zone s.timezone)::time <= r.end_time
  )
  and not exists (
    select 1
    from public.appointment_availability_rules r
    where r.enabled
      and r.anchor_time is not null
      and r.weekday=extract(dow from c.starts_at at time zone s.timezone)::int
      and tstzrange(
        ((c.starts_at at time zone s.timezone)::date+r.anchor_time) at time zone s.timezone,
        (((c.starts_at at time zone s.timezone)::date+r.anchor_time) at time zone s.timezone)+interval '1 hour',
        '[)'
      ) && tstzrange(c.starts_at,c.ends_at,'[)')
  )
  and not exists (
    select 1 from public.appointment_blocks b
    where tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(c.starts_at,c.ends_at,'[)')
  )
  and not exists (
    select 1 from public.appointments a
    where a.status='booked'
      and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(c.starts_at,c.ends_at,'[)')
  )
  and (
    coalesce((select private.current_user_is_admin()), false)
    or (
      not exists (
        select 1
        from public.appointments a
        where a.patient_id = (select auth.uid())
          and a.status in ('booked','completed','no_show')
          and (a.starts_at at time zone s.timezone)::date < (c.starts_at at time zone s.timezone)::date
          and (c.starts_at at time zone s.timezone)::date <= (a.starts_at at time zone s.timezone)::date + 6
      )
      and not exists (
        select 1
        from public.appointments a
        where a.patient_id = (select auth.uid())
          and a.status in ('booked','completed','no_show')
          and (a.starts_at at time zone s.timezone)::date > (c.starts_at at time zone s.timezone)::date
          and (c.starts_at at time zone s.timezone)::date > (a.starts_at at time zone s.timezone)::date - 3
      )
    )
  )
order by c.starts_at;
$function$;
