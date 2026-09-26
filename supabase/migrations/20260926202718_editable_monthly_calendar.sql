-- Reschedule by atomically cancelling and replacing bookings. Existing trigger
-- validation and the overlap exclusion remain authoritative for every replacement.
CREATE FUNCTION private.edit_calendar_appointments_impl(
 p_id uuid, p_expected_start timestamptz, p_date date, p_time time,
 p_patient_name text, p_scope text, p_action text
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE selected public.appointments%rowtype; s public.appointment_settings%rowtype;
 originals jsonb; item jsonb; ids uuid[]; target timestamp; instant timestamptz;
 day_shift integer; affected integer;
BEGIN
 IF auth.uid() IS NULL OR NOT private.current_user_is_admin() THEN
   RAISE EXCEPTION 'Administrator access required';
 END IF;
 IF p_scope IS NULL OR p_scope NOT IN ('one','future') OR p_action IS NULL OR p_action NOT IN ('save','cancel') THEN
   RAISE EXCEPTION 'Choose a supported edit action';
 END IF;
 PERFORM pg_advisory_xact_lock(748201);
 SELECT * INTO selected FROM public.appointments WHERE id=p_id FOR UPDATE;
 IF selected.id IS NULL OR selected.status <> 'booked' OR selected.starts_at IS DISTINCT FROM p_expected_start THEN
   RAISE EXCEPTION 'This appointment has changed. Refresh the calendar before editing';
 END IF;
 IF selected.starts_at <= now() THEN RAISE EXCEPTION 'Past appointments cannot be edited here'; END IF;
 SELECT * INTO s FROM public.appointment_settings WHERE id;
 IF p_action='save' THEN
   IF p_date IS NULL OR p_time IS NULL THEN RAISE EXCEPTION 'Choose an appointment date and time'; END IF;
   IF selected.patient_id IS NULL AND (nullif(btrim(p_patient_name),'') IS NULL OR length(p_patient_name)>160) THEN
     RAISE EXCEPTION 'Enter the established patient name';
   END IF;
   day_shift := p_date - (selected.starts_at AT TIME ZONE s.timezone)::date;
 END IF;
 SELECT jsonb_agg(to_jsonb(a) ORDER BY a.starts_at),array_agg(a.id),count(*)::integer
 INTO originals,ids,affected FROM public.appointments a
 WHERE a.status='booked' AND (a.id=selected.id OR
   (p_scope='future' AND selected.series_id IS NOT NULL AND a.series_id=selected.series_id AND a.starts_at>=selected.starts_at));
 UPDATE public.appointments SET status='cancelled' WHERE id=ANY(ids);
 IF p_action='save' THEN
   FOR item IN SELECT value FROM jsonb_array_elements(originals) LOOP
     target := (((item->>'starts_at')::timestamptz AT TIME ZONE s.timezone)::date + day_shift) + p_time;
     instant := target AT TIME ZONE s.timezone;
     IF instant AT TIME ZONE s.timezone <> target THEN RAISE EXCEPTION 'This time does not exist because of daylight saving time'; END IF;
     INSERT INTO public.appointments(patient_id,patient_name,starts_at,ends_at,series_id)
     VALUES((item->>'patient_id')::uuid,CASE WHEN item->>'patient_id' IS NULL THEN btrim(p_patient_name) ELSE NULL END,
       instant,instant+make_interval(mins=>s.appointment_duration_minutes),(item->>'series_id')::uuid);
   END LOOP;
 END IF;
 RETURN affected;
END;
$$;
CREATE FUNCTION public.edit_calendar_appointments(p_id uuid,p_expected_start timestamptz,p_date date,p_time time,p_patient_name text,p_scope text,p_action text)
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private.edit_calendar_appointments_impl(p_id,p_expected_start,p_date,p_time,p_patient_name,p_scope,p_action);
$$;
REVOKE ALL ON FUNCTION private.edit_calendar_appointments_impl(uuid,timestamptz,date,time,text,text,text),public.edit_calendar_appointments(uuid,timestamptz,date,time,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.edit_calendar_appointments_impl(uuid,timestamptz,date,time,text,text,text),public.edit_calendar_appointments(uuid,timestamptz,date,time,text,text,text) TO authenticated;
