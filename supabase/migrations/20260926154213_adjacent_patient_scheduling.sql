-- Optional daily reserved starting hour. This is an administrator reservation,
-- not a fabricated patient appointment. Only administrators can change office rules.
ALTER TABLE public.appointment_availability_rules ADD COLUMN anchor_time time;
ALTER TABLE public.appointment_availability_rules ADD CONSTRAINT availability_anchor_within_hours CHECK (
  anchor_time IS NULL OR (anchor_time >= start_time AND
  date '2000-01-01' + anchor_time + interval '1 hour' <= date '2000-01-01' + end_time)
);

-- One clinician. Existing booked appointments are retained; conflicting historical
-- rows must be reconciled explicitly before this constraint can be installed.
ALTER TABLE public.appointments ADD COLUMN series_id uuid;
ALTER TABLE public.appointments ADD COLUMN patient_name text;
ALTER TABLE public.appointments ALTER COLUMN patient_id DROP NOT NULL;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_patient_identity CHECK (
  patient_id IS NOT NULL OR (patient_name IS NOT NULL AND length(btrim(patient_name)) BETWEEN 1 AND 160)
);
ALTER TABLE public.appointments ADD CONSTRAINT appointments_no_booked_overlap
  EXCLUDE USING gist (tstzrange(starts_at, ends_at, '[)') WITH &&)
  WHERE (status = 'booked');

-- Patients see only starts one hour either side of a booked appointment on
-- the same practice-local day. A 50-minute session still occupies an hourly start.
CREATE OR REPLACE FUNCTION private.get_available_appointment_slots_impl(p_from date, p_to date)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
WITH settings AS (
  SELECT * FROM public.appointment_settings
  WHERE id AND scheduling_enabled AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND account_type IN ('patient','admin')
  )
), dates AS (
  SELECT d::date AS local_date FROM generate_series(p_from::timestamp,least(p_to,p_from+31)::timestamp,interval '1 day') d
), anchors AS (
  SELECT a.starts_at FROM public.appointments a CROSS JOIN settings s WHERE a.status='booked'
    AND (a.starts_at AT TIME ZONE s.timezone)::date BETWEEN p_from AND least(p_to,p_from+31)
  UNION
  SELECT (d.local_date+r.anchor_time) AT TIME ZONE s.timezone FROM dates d CROSS JOIN settings s
    JOIN public.appointment_availability_rules r ON r.enabled AND r.anchor_time IS NOT NULL
    WHERE r.weekday=extract(dow FROM d.local_date)::int
), candidates AS (
  SELECT DISTINCT a.starts_at + offset_hours * interval '1 hour' AS starts_at,
    a.starts_at + offset_hours * interval '1 hour' + make_interval(mins => s.appointment_duration_minutes) AS ends_at
  FROM anchors a CROSS JOIN settings s CROSS JOIN (VALUES (-1),(1)) AS offsets(offset_hours)
  WHERE ((a.starts_at + offset_hours * interval '1 hour') AT TIME ZONE s.timezone)::date = (a.starts_at AT TIME ZONE s.timezone)::date
)
SELECT c.starts_at,c.ends_at FROM candidates c CROSS JOIN settings s
WHERE (c.starts_at AT TIME ZONE s.timezone)::date BETWEEN p_from AND least(p_to,p_from + 31)
  AND (c.starts_at AT TIME ZONE s.timezone)::date = (c.ends_at AT TIME ZONE s.timezone)::date
  AND c.starts_at >= now() + make_interval(hours => s.minimum_notice_hours)
  AND c.starts_at <= now() + make_interval(days => s.maximum_advance_days)
  AND EXISTS (SELECT 1 FROM public.appointment_availability_rules r WHERE r.enabled
    AND r.weekday = extract(dow FROM c.starts_at AT TIME ZONE s.timezone)::int
    AND (c.starts_at AT TIME ZONE s.timezone)::time >= r.start_time
    AND (c.ends_at AT TIME ZONE s.timezone)::time <= r.end_time)
  AND NOT EXISTS (SELECT 1 FROM public.appointment_availability_rules r WHERE r.enabled AND r.anchor_time IS NOT NULL
    AND r.weekday=extract(dow FROM c.starts_at AT TIME ZONE s.timezone)::int
    AND tstzrange(((c.starts_at AT TIME ZONE s.timezone)::date+r.anchor_time) AT TIME ZONE s.timezone,
      (((c.starts_at AT TIME ZONE s.timezone)::date+r.anchor_time) AT TIME ZONE s.timezone)+interval '1 hour','[)') && tstzrange(c.starts_at,c.ends_at,'[)'))
  AND NOT EXISTS (SELECT 1 FROM public.appointment_blocks b WHERE tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(c.starts_at,c.ends_at,'[)'))
  AND NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.status='booked' AND tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(c.starts_at,c.ends_at,'[)'))
ORDER BY c.starts_at;
$$;

CREATE OR REPLACE FUNCTION private.validate_appointment_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.appointment_settings%rowtype; is_admin boolean; local_start timestamp; local_end timestamp;
BEGIN
  is_admin := coalesce(private.current_user_is_admin(),false);
  -- A single schedule lock serializes bookings/cancellations within a transaction.
  PERFORM pg_advisory_xact_lock(748201);
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
      OR NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
      OR NEW.patient_name IS DISTINCT FROM OLD.patient_name OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.series_id IS DISTINCT FROM OLD.series_id THEN
      RAISE EXCEPTION 'Cancel and create a replacement appointment to change its details';
    END IF;
    IF NOT is_admin AND OLD.patient_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'You may only modify your own appointment'; END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT is_admin AND NOT (OLD.status='booked' AND NEW.status='cancelled') THEN RAISE EXCEPTION 'Patients may only cancel booked appointments'; END IF;
      IF NEW.status='booked' THEN RAISE EXCEPTION 'Create a new booking instead of reactivating a cancelled appointment'; END IF;
      IF NEW.status='cancelled' THEN NEW.cancelled_at := now(); END IF;
    ELSE
      NEW.cancelled_at := OLD.cancelled_at;
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO s FROM public.appointment_settings WHERE id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Scheduling settings are unavailable'; END IF;
  IF NEW.patient_id IS NULL THEN
    IF NOT is_admin OR nullif(btrim(NEW.patient_name),'') IS NULL OR length(NEW.patient_name)>160 THEN RAISE EXCEPTION 'An administrator must enter the existing patient name'; END IF;
    NEW.patient_name := btrim(NEW.patient_name);
  ELSIF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=NEW.patient_id AND account_type='patient') THEN RAISE EXCEPTION 'Select an existing Patient account'; END IF;
  IF NOT is_admin AND NEW.patient_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'You may only book appointments for your own account'; END IF;
  IF NOT is_admin AND NOT s.scheduling_enabled THEN RAISE EXCEPTION 'Online scheduling is not currently enabled'; END IF;
  NEW.ends_at := NEW.starts_at + make_interval(mins=>s.appointment_duration_minutes);
  NEW.status := 'booked'; NEW.cancelled_at := NULL;
  IF NOT is_admin THEN NEW.series_id := NULL; NEW.patient_name := NULL; END IF;
  local_start := NEW.starts_at AT TIME ZONE s.timezone;
  local_end := NEW.ends_at AT TIME ZONE s.timezone;
  IF local_start::date <> local_end::date OR NOT EXISTS (
    SELECT 1 FROM public.appointment_availability_rules r WHERE r.enabled
      AND r.weekday=extract(dow FROM local_start)::int AND local_start::time >= r.start_time AND local_end::time <= r.end_time
  ) THEN RAISE EXCEPTION 'This time is outside configured office hours'; END IF;
  IF NEW.starts_at <= now() THEN RAISE EXCEPTION 'Choose a future appointment'; END IF;
  IF NOT is_admin AND NOT EXISTS (
    SELECT 1 FROM private.get_available_appointment_slots_impl(local_start::date,local_start::date) slot WHERE slot.starts_at=NEW.starts_at
  ) THEN RAISE EXCEPTION 'This appointment is no longer an available adjacent time. Refresh available appointments'; END IF;
  IF EXISTS (SELECT 1 FROM public.appointment_blocks b WHERE tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(NEW.starts_at,NEW.ends_at,'[)')) THEN RAISE EXCEPTION 'This time has been blocked from scheduling'; END IF;
  IF EXISTS (SELECT 1 FROM public.appointments a WHERE a.status='booked' AND tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(NEW.starts_at,NEW.ends_at,'[)')) THEN RAISE EXCEPTION 'This appointment time is no longer available'; END IF;
  RETURN NEW;
END;
$$;

-- Keep patient insert policy intact, and explicitly permit administrators to book
-- for patients. No patient account promotion or expanded patient visibility.
CREATE POLICY appointments_admin_insert ON public.appointments FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_is_admin()));

CREATE OR REPLACE FUNCTION private.scheduling_patients_impl()
RETURNS TABLE(id uuid,full_name text,preferred_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.current_user_is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  RETURN QUERY SELECT p.id,p.full_name,p.preferred_name FROM public.profiles p WHERE p.account_type='patient' ORDER BY coalesce(p.full_name,p.preferred_name,''),p.id;
END;
$$;
CREATE OR REPLACE FUNCTION public.scheduling_patients()
RETURNS TABLE(id uuid,full_name text,preferred_name text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT * FROM private.scheduling_patients_impl(); $$;

-- Each series has an explicit end date; the whole series succeeds or rolls back.
-- Local wall-clock time is preserved across daylight-saving changes.
CREATE OR REPLACE FUNCTION private.book_patient_appointments_impl(p_patient_id uuid,p_first_date date,p_start_time time,p_repeat_weeks integer,p_through date,p_patient_name text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE s public.appointment_settings%rowtype; d date; instant timestamptz; count integer := 0; series uuid := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL OR NOT private.current_user_is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_first_date IS NULL OR p_start_time IS NULL OR p_through IS NULL OR p_repeat_weeks IS NULL
     OR p_repeat_weeks NOT IN (0,1,2) OR p_through < p_first_date OR p_through > p_first_date + 366 THEN
    RAISE EXCEPTION 'Choose valid dates within a year and a supported repeat frequency';
  END IF;
  SELECT * INTO s FROM public.appointment_settings WHERE id;
  PERFORM pg_advisory_xact_lock(748201);
  d := p_first_date;
  LOOP
    instant := (d + p_start_time) AT TIME ZONE s.timezone;
    IF (instant AT TIME ZONE s.timezone) <> (d + p_start_time) THEN RAISE EXCEPTION 'A selected time does not exist because of daylight saving time'; END IF;
    INSERT INTO public.appointments(patient_id,patient_name,starts_at,ends_at,series_id) VALUES(p_patient_id,CASE WHEN p_patient_id IS NULL THEN p_patient_name ELSE NULL END,instant,instant+make_interval(mins=>s.appointment_duration_minutes),CASE WHEN p_repeat_weeks=0 THEN NULL ELSE series END);
    count := count + 1;
    EXIT WHEN p_repeat_weeks=0;
    d := d + (p_repeat_weeks * 7);
    EXIT WHEN d > p_through;
  END LOOP;
  RETURN count;
END;
$$;
CREATE OR REPLACE FUNCTION public.book_patient_appointments(p_patient_id uuid,p_first_date date,p_start_time time,p_repeat_weeks integer,p_through date,p_patient_name text DEFAULT NULL)
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.book_patient_appointments_impl(p_patient_id,p_first_date,p_start_time,p_repeat_weeks,p_through,p_patient_name); $$;

REVOKE ALL ON FUNCTION private.scheduling_patients_impl(),public.scheduling_patients(),private.book_patient_appointments_impl(uuid,date,time,integer,date,text),public.book_patient_appointments(uuid,date,time,integer,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.scheduling_patients_impl(),public.scheduling_patients(),private.book_patient_appointments_impl(uuid,date,time,integer,date,text),public.book_patient_appointments(uuid,date,time,integer,date,text) TO authenticated;
