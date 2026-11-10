-- Central, immutable group session records. No synthetic roster or browser storage.
-- Shared session content intentionally excludes participant-specific clinical notes.
create table public.emr_group_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  group_name text not null check (char_length(btrim(group_name)) between 2 and 160),
  facilitators text not null check (char_length(btrim(facilitators)) between 2 and 250),
  scheduled_start timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  shared_topic text not null check (char_length(btrim(shared_topic)) between 2 and 250),
  shared_content text not null check (char_length(btrim(shared_content)) between 2 and 8000),
  reviewed boolean not null check (reviewed = true),
  created_at timestamptz not null default now()
);
create index emr_group_sessions_owner_date_idx on public.emr_group_sessions(owner_id,scheduled_start desc);
create table public.emr_group_participation (
  session_id uuid not null references public.emr_group_sessions(id),
  owner_id uuid not null references auth.users(id),
  patient_id uuid not null references public.clinical_patients(id),
  attendance text not null check (attendance in ('Present','Absent','Excused')),
  primary key(session_id,patient_id)
);
create index emr_group_participation_patient_idx on public.emr_group_participation(patient_id,owner_id);
alter table public.emr_group_sessions enable row level security;
alter table public.emr_group_participation enable row level security;
revoke all on public.emr_group_sessions,public.emr_group_participation from public,anon,authenticated;
grant select on public.emr_group_sessions,public.emr_group_participation to authenticated;
create policy emr_group_sessions_read on public.emr_group_sessions for select to authenticated
  using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin());
create policy emr_group_participation_read on public.emr_group_participation for select to authenticated
  using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin()
    and exists(select 1 from public.emr_group_sessions s where s.id=session_id and s.owner_id=emr_group_participation.owner_id));

-- The only authorized write is the atomic, clinician-reviewed RPC.
-- SECURITY DEFINER deliberately re-checks admin+MFA rather than trusting RLS bypass.
create function public.save_emr_group_session(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  entry jsonb;
  pid uuid;
  st text;
  seen uuid[] := '{}';
  part jsonb;
begin
  if uid is null or (auth.jwt()->>'aal') is distinct from 'aal2' or not private.current_user_is_admin()
  then raise exception 'Administrator sign-in and MFA required' using errcode='42501';end if;
  if jsonb_typeof(p_payload) is distinct from 'object'
     or jsonb_typeof(p_payload->'participants') is distinct from 'array'
  then raise exception 'Group session and roster required' using errcode='22023';end if;
  if jsonb_array_length(p_payload->'participants') not between 2 and 30
  then raise exception 'Group must have 2–30 selected patients' using errcode='22023';end if;
  if p_payload->'reviewed' is distinct from 'true'::jsonb
  then raise exception 'Shared session must be reviewed before saving' using errcode='22023';end if;
  if nullif(btrim(p_payload->>'group_name'),'') is null
     or nullif(btrim(p_payload->>'facilitators'),'') is null
     or nullif(btrim(p_payload->>'shared_topic'),'') is null
     or nullif(btrim(p_payload->>'shared_content'),'') is null
  then raise exception 'All shared session fields are required' using errcode='22023';end if;
  -- Reject duplicate, unknown, or ineligible participant IDs before creating the session.
  for part in select value from jsonb_array_elements(p_payload->'participants') loop
    if jsonb_typeof(part) is distinct from 'object' then raise exception 'Invalid participant' using errcode='22023';end if;
    pid := (part->>'patient_id')::uuid;
    st := part->>'attendance';
    if st not in ('Present','Absent','Excused') or st is null
    then raise exception 'Invalid attendance' using errcode='22023';end if;
    if pid = any(seen) then raise exception 'Duplicate patient in group roster' using errcode='22023';end if;
    if not exists(select 1 from public.clinical_patients where id=pid)
    then raise exception 'Group patient unavailable' using errcode='22023';end if;
    seen := array_append(seen,pid);
  end loop;
  insert into public.emr_group_sessions(owner_id,group_name,facilitators,scheduled_start,duration_minutes,shared_topic,shared_content,reviewed)
  values(uid,btrim(p_payload->>'group_name'),btrim(p_payload->>'facilitators'),
         (p_payload->>'scheduled_start')::timestamptz,(p_payload->>'duration_minutes')::integer,
         btrim(p_payload->>'shared_topic'),btrim(p_payload->>'shared_content'),true)
  returning id into sid;
  for part in select value from jsonb_array_elements(p_payload->'participants') loop
    insert into public.emr_group_participation(session_id,owner_id,patient_id,attendance)
    values(sid,uid,(part->>'patient_id')::uuid,part->>'attendance');
  end loop;
  return sid;
end $$;
revoke all on function public.save_emr_group_session(jsonb) from public,anon;
grant execute on function public.save_emr_group_session(jsonb) to authenticated;
