-- Harden the kiosk intake RPCs without widening access.
-- Submitted kiosk sessions remain discoverable only as a completion state and do not return answers.

create or replace function private.validate_intake_answers(p_answers jsonb, p_submitting boolean)
returns void
language plpgsql
set search_path = ''
as $function$
declare
 k text; v jsonb; required_key text; dob date;
 allowed constant text[] := array[
'full_name','preferred_name','date_of_birth','sex_at_birth','gender_identity','pronouns','marital_status','primary_language','interpreter_needed','address','address2','city','state','postal_code','phone','email','contact_preference','safe_voicemail','preferred_pharmacy',
'emergency_contact_name','emergency_contact_relationship','emergency_contact_phone','emergency_contact_permission','guardian_name','guardian_relationship','guardian_phone','custody_notes',
'insurance_coverage','insurance_carrier','insurance_type','insurance_member','insurance_group','insurance_phone','policyholder_name','policyholder_relationship','policyholder_dob','policyholder_employer','medicare_beneficiary_id','medicaid_id','medicaid_state','insurance_effective_date','referral_required','referral_provider','authorization_required','authorization_number','authorized_visits','secondary_insurance','secondary_carrier','secondary_member','secondary_group','deductible','deductible_met','copay','coinsurance','insurance_notes',
'counseling_reason','concern_onset','concern_duration','precipitating_events','symptom_frequency','symptom_severity','functional_impact','sleep','appetite','energy','concentration','work_school_impact','relationship_impact','daily_living_impact','counseling_goals',
'prior_mental_health_treatment','prior_therapists','prior_diagnoses','psychiatric_hospitalizations','self_harm_history','suicide_attempt_history','prior_psychiatric_medications','family_mental_health_history',
'primary_care_provider','pcp_phone','medical_conditions','surgeries_hospitalizations','allergies','medications_current','pregnancy_status','head_injury_seizure_history',
'alcohol_use','drug_use','tobacco_nicotine','substance_treatment_history','substance_consequences','gambling_other_behaviors',
'suicidal_thoughts_current','suicidal_plan_current','homicidal_thoughts_current','violence_risk_details','abuse_neglect_current','weapons_access','protective_factors',
'trauma_history','family_household','social_supports','education_history','employment_history','military_history','legal_history','cultural_spiritual_factors','strengths_interests',
'comm_phone_calls','comm_voicemail','comm_voicemail_detail','comm_text','comm_email','comm_portal','comm_mail','comm_other_number','comm_other_address','comm_restrictions',
'npp_received','npp_questions','npp_signature','npp_signature_date',
'roi_authorize','roi_recipient_name','roi_recipient_relationship','roi_recipient_phone','roi_recipient_email','roi_information_scope','roi_information_exclusions','roi_purpose','roi_expiration','roi_direction','roi_revocation_ack','roi_voluntary_ack','roi_signature','roi_signature_date',
'psych_notes_authorize','psych_notes_recipient','psych_notes_purpose','psych_notes_expiration','psych_notes_revocation_ack','psych_notes_signature','psych_notes_signature_date',
'information_accuracy','electronic_signature_consent','patient_signature','patient_signature_date'
 ];
begin
 if jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>160000 then raise exception 'Invalid intake answers'; end if;
 for k,v in select * from jsonb_each(p_answers) loop
  if not (k=any(allowed)) or jsonb_typeof(v)<>'string' or length(v#>>'{}')>8000 then raise exception 'Invalid intake field'; end if;
 end loop;
 if coalesce(p_answers->>'date_of_birth','')<>'' then
  begin dob := (p_answers->>'date_of_birth')::date; exception when others then raise exception 'Invalid date of birth'; end;
  if dob>current_date then raise exception 'Date of birth cannot be in the future'; end if;
 end if;
 if coalesce(p_answers->>'email','')<>'' and p_answers->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Invalid contact email'; end if;
 if coalesce(p_answers->>'roi_recipient_email','')<>'' and p_answers->>'roi_recipient_email' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Invalid release recipient email'; end if;
 foreach k in array array['deductible','deductible_met','copay','coinsurance'] loop
  if coalesce(p_answers->>k,'') not in ('','I don’t know') then
   if p_answers->>k !~ '^[0-9]+([.][0-9]{1,2})?$' then raise exception 'Invalid cost amount'; end if;
   if k='coinsurance' and (p_answers->>k)::numeric>100 then raise exception 'Invalid coinsurance percentage'; end if;
  end if;
 end loop;
 if p_submitting then
  foreach required_key in array array['full_name','date_of_birth','address','city','state','postal_code','phone','email','emergency_contact_name','emergency_contact_relationship','emergency_contact_phone','emergency_contact_permission','insurance_coverage','counseling_reason','functional_impact','counseling_goals','prior_mental_health_treatment','medical_conditions','medications_current','suicidal_thoughts_current','suicidal_plan_current','homicidal_thoughts_current','abuse_neglect_current','comm_phone_calls','comm_voicemail','comm_text','comm_email','comm_portal','comm_mail','npp_received','npp_signature','npp_signature_date','roi_authorize','psych_notes_authorize','information_accuracy','electronic_signature_consent','patient_signature','patient_signature_date'] loop
   if coalesce(btrim(p_answers->>required_key),'')='' then raise exception 'Complete required intake fields before submitting'; end if;
  end loop;
  if p_answers->>'npp_received'<>'Yes' then raise exception 'Complete the privacy notice acknowledgment'; end if;
  if p_answers->>'information_accuracy'<>'Yes' or p_answers->>'electronic_signature_consent'<>'Yes' then raise exception 'Complete the final attestation'; end if;
  if p_answers->>'roi_authorize'='Yes' then
   foreach required_key in array array['roi_recipient_name','roi_information_scope','roi_purpose','roi_expiration','roi_revocation_ack','roi_voluntary_ack','roi_signature','roi_signature_date'] loop
    if coalesce(btrim(p_answers->>required_key),'')='' then raise exception 'Complete the release authorization'; end if;
   end loop;
  end if;
  if p_answers->>'psych_notes_authorize'='Yes' then
   foreach required_key in array array['psych_notes_recipient','psych_notes_purpose','psych_notes_expiration','psych_notes_revocation_ack','psych_notes_signature','psych_notes_signature_date'] loop
    if coalesce(btrim(p_answers->>required_key),'')='' then raise exception 'Complete the psychotherapy-notes authorization'; end if;
   end loop;
  end if;
  if (p_answers->>'suicidal_plan_current'='Yes' or p_answers->>'homicidal_thoughts_current'='Yes') and coalesce(btrim(p_answers->>'violence_risk_details'),'')='' then raise exception 'Describe the current safety concern before submitting'; end if;
 end if;
end
$function$;

create or replace function private.get_intake_kiosk_session_impl(p_token text)
returns table(patient_name text, date_of_birth date, answers jsonb, status text, expires_at timestamptz)
language sql
security definer
set search_path = ''
as $function$
  select
    k.patient_name,
    k.date_of_birth,
    case when k.status='submitted' then '{}'::jsonb else k.answers end,
    k.status,
    k.expires_at
  from private.kiosk_patient_intakes k
  where k.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
    and k.expires_at>now()
    and k.status in ('draft','submitted')
  limit 1
$function$;

revoke all on function private.validate_intake_answers(jsonb,boolean) from public, anon, authenticated;
revoke all on function private.get_intake_kiosk_session_impl(text) from public, anon, authenticated;
grant execute on function private.get_intake_kiosk_session_impl(text) to anon, authenticated;
