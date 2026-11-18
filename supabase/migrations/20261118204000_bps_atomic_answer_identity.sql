-- Rebind the privileged BPS save to the complete patient answer object under
-- the existing row lock. This prevents last-moment edits without a revision or
-- timestamp advance from becoming silently attested clinician history.
-- Additive function replacement only: preserve all prior patient records,
-- appointment data, MFA policies, triggers, grants and immutable history.
-- Bind clinician BPS attestation to the exact patient submission receipt inside
-- the existing MFA-protected transaction. Existing rows, roles, permissions,
-- appointments, accounts, scheduler data and clinical history remain untouched.
create or replace function public.save_emr_bps_intake_review(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
 pid uuid;
 account uuid;
 expected_account uuid;
 source public.patient_intakes%rowtype;
 source_version integer;
 source_updated_at timestamptz;
 source_submitted_at timestamptz;
 notes jsonb;
 clinical jsonb;
 item record;
 new_id uuid;
begin
 if uid is null or (auth.jwt()->>'aal') is distinct from 'aal2' or not private.current_user_is_admin() then
  raise exception 'Administrator sign-in and MFA required' using errcode='42501';
 end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->'reviewed' is distinct from 'true'::jsonb then
  raise exception 'Explicit clinician review required' using errcode='22023';
 end if;
 begin
  pid:=(p_payload->>'patient_id')::uuid;
  expected_account:=(p_payload->>'source_account_id')::uuid;
  source_version:=(p_payload->>'source_version')::integer;
  source_updated_at:=(p_payload->>'source_updated_at')::timestamptz;
  source_submitted_at:=(p_payload->>'source_submitted_at')::timestamptz;
 exception when others then raise exception 'Invalid BPS patient or intake provenance' using errcode='22023';end;
 if pid is null or expected_account is null or source_version is null or source_version<1 or source_updated_at is null then
  raise exception 'Valid linked patient and intake version required' using errcode='22023';end if;
 select account_id into account from public.clinical_patients where id=pid for share;
 if account is distinct from expected_account then raise exception 'Patient account link changed: review current source' using errcode='22023';end if;
 select * into source from public.patient_intakes where patient_id=account for share;
 if not found or source.version is distinct from source_version or source.updated_at is distinct from source_updated_at
  or source.status is distinct from p_payload->>'source_status' then
  raise exception 'Linked intake is missing or changed: review current source' using errcode='22023';end if;
 -- The HTTP preflight is not atomic. Bind the patient submission receipt while
 -- source is row-locked and before creating an immutable clinician review.
 if source.status='submitted' and source.submitted_at is null then
  raise exception 'Submitted BPS source lacks a verified intake submission receipt' using errcode='22023';
 end if;
 if source.status='submitted' and
    (source_submitted_at is null or source.submitted_at is distinct from source_submitted_at) then
  raise exception 'Patient submission receipt changed: reopen current linked intake' using errcode='22023';
 end if;
 if source.status='draft' and source_submitted_at is not null then
  raise exception 'Draft BPS source cannot retain a final patient submission attestation' using errcode='22023';
 end if;
 -- Preserve the exact answers observed by the protected API's last source read.
 -- Version/timestamps can remain unchanged across a buggy or out-of-band edit.
 -- A direct privileged RPC caller must likewise provide the current full JSONB
 -- answer object, not silently attest to a different patient statement set.
 if jsonb_typeof(p_payload->'source_answers') is distinct from 'object'
    or source.answers is distinct from p_payload->'source_answers' then
  raise exception 'Patient answers changed during clinical review: reopen current source'
    using errcode='22023';
 end if;
 notes:=p_payload->'clinician_notes';
 if jsonb_typeof(notes) is distinct from 'object' then raise exception 'Clinician notes must be a keyed object' using errcode='22023';end if;
 for item in select key,value from jsonb_each(notes) loop
  if item.key not in ('presenting','treatment','medical','safety','family','goals','limitations')
   or jsonb_typeof(item.value) is distinct from 'string' or length(item.value#>>'{}')>4000 then
   raise exception 'Unsupported BPS clinician notes' using errcode='22023';end if;
 end loop;
 -- The database, not the browser, copies only approved clinical patient-reported fields.
 -- Medical/allergy records, structured trauma, insurance and every legal signature/
 -- authorization stay in their existing separately-reviewed repositories.
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into clinical
 from jsonb_each(source.answers)
 where key=any(array[
  'guardian_relationship','custody_notes','counseling_reason','concern_onset','concern_duration',
  'precipitating_events','symptom_frequency','symptom_severity','functional_impact',
  'sleep','appetite','energy','concentration','work_school_impact','relationship_impact',
  'daily_living_impact','counseling_goals','prior_mental_health_treatment','prior_therapists',
  'prior_diagnoses','self_harm_history','suicide_attempt_history',
  'suicidal_thoughts_current','suicidal_plan_current','homicidal_thoughts_current',
  'violence_risk_details','abuse_neglect_current','weapons_access','protective_factors',
  'trauma_history'
 ])
 and jsonb_typeof(value)='string' and btrim(value#>>'{}')<>'';
 insert into public.emr_bps_intake_reviews
  (patient_id,owner_id,source_account_id,source_version,source_status,
   source_updated_at,clinical_answers,clinician_notes,reviewed)
 values(pid,uid,account,source.version,source.status,source.updated_at,clinical,notes,true)
 returning id into new_id;
 return new_id;
end $$;
