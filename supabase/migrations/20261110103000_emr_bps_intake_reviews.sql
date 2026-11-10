-- Additive clinician-reviewed intake-to-biopsychosocial history snapshots.
-- The live intake is sourced by explicit account_id only. No demo/synthetic data are migrated.
create table public.emr_bps_intake_reviews (
 id uuid primary key default gen_random_uuid(),
 patient_id uuid not null references public.clinical_patients(id),
 owner_id uuid not null default auth.uid() references auth.users(id),
 source_account_id uuid not null references public.profiles(id),
 source_version integer not null check(source_version>0),
 source_status text not null check(source_status in ('draft','submitted')),
 source_updated_at timestamptz not null,
 clinical_answers jsonb not null check(jsonb_typeof(clinical_answers)='object'),
 clinician_notes jsonb not null check(jsonb_typeof(clinician_notes)='object'),
 reviewed boolean not null check(reviewed=true),
 created_at timestamptz not null default now(),
 unique(owner_id,patient_id,source_version)
);
create index emr_bps_intake_reviews_patient_idx on public.emr_bps_intake_reviews(owner_id,patient_id,created_at desc);
alter table public.emr_bps_intake_reviews enable row level security;
revoke all on public.emr_bps_intake_reviews from public,anon,authenticated;
grant select on public.emr_bps_intake_reviews to authenticated;
create policy emr_bps_intake_reviews_owner_read on public.emr_bps_intake_reviews
 for select to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin());

create function public.save_emr_bps_intake_review(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
 pid uuid;
 account uuid;
 source public.patient_intakes%rowtype;
 source_version integer;
 source_updated_at timestamptz;
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
  source_version:=(p_payload->>'source_version')::integer;
  source_updated_at:=(p_payload->>'source_updated_at')::timestamptz;
 exception when others then raise exception 'Invalid BPS patient or intake provenance' using errcode='22023';end;
 if pid is null or source_version is null or source_version<1 or source_updated_at is null then
  raise exception 'Valid linked patient and intake version required' using errcode='22023';end if;
 select account_id into account from public.clinical_patients where id=pid;
 if account is null then raise exception 'Patient account is not linked' using errcode='22023';end if;
 select * into source from public.patient_intakes where patient_id=account for share;
 if not found or source.version is distinct from source_version or source.updated_at is distinct from source_updated_at
  or source.status is distinct from p_payload->>'source_status' then
  raise exception 'Linked intake is missing or changed: review current source' using errcode='22023';end if;
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
revoke all on function public.save_emr_bps_intake_review(jsonb) from public,anon;
grant execute on function public.save_emr_bps_intake_review(jsonb) to authenticated;
