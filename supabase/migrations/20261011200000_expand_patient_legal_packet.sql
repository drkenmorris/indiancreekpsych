-- Expand the existing protected intake JSON validator; no PHI, table, roles, or RLS change.
-- Keep the kiosk and patient-account workflows aligned while deploying the new clients.
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
'psych_notes_authorize','psych_notes_discloser','psych_notes_recipient','psych_notes_purpose','psych_notes_expiration','psych_notes_revocation_ack','psych_notes_signature','psych_notes_signature_date',
'information_accuracy','electronic_signature_consent','patient_signature','patient_signature_date',
'legal_packet_version','treatment_consent','treatment_questions','treatment_signature','treatment_signature_date',
'financial_review','financial_questions','financial_signature','financial_signature_date',
'telehealth_choice','telehealth_questions','telehealth_signature','telehealth_signature_date',
'electronic_choice','electronic_questions','electronic_signature','electronic_signature_date',
'representative_signer','representative_name','representative_authority','representative_signature','representative_signature_date',
'roi_discloser','roi_representative_capacity','psych_notes_discloser','psych_notes_representative_capacity',
'part2_authorize','part2_discloser','part2_recipient','part2_scope','part2_purpose','part2_purpose_details','part2_expiration','part2_revocation_ack','part2_signature','part2_signature_date','part2_representative_capacity',
'sud_notes_authorize','sud_notes_discloser','sud_notes_recipient','sud_notes_scope','sud_notes_purpose','sud_notes_expiration','sud_notes_revocation_ack','sud_notes_signature','sud_notes_signature_date','sud_notes_representative_capacity'
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
  -- During the non-disruptive release window, existing clients may still submit
  -- pre-revision payloads. The follow-up required-version migration closes that window.
  if p_answers ? 'legal_packet_version' then
   if p_answers->>'legal_packet_version'<>'2026-10-11' then raise exception 'Unrecognized patient legal packet revision'; end if;
   foreach required_key in array array['treatment_consent','financial_review','telehealth_choice','electronic_choice','representative_signer','part2_authorize','sud_notes_authorize'] loop
    if coalesce(btrim(p_answers->>required_key),'')='' then raise exception 'Complete the required patient document choice'; end if;
   end loop;
   if p_answers->>'part2_authorize' not in ('No','Yes') or p_answers->>'sud_notes_authorize' not in ('No','Yes') then raise exception 'Invalid Part 2 authorization selection'; end if;
   if p_answers->>'treatment_consent' not in ('Yes, I consent to outpatient counseling','I need to discuss this before consenting') then raise exception 'Invalid treatment consent choice'; end if;
   if p_answers->>'financial_review' not in ('I reviewed this information','I request fee clarification before treatment') then raise exception 'Invalid financial information choice'; end if;
   if p_answers->>'telehealth_choice' not in ('Yes, I consent to telehealth','No, in-person care only','Discuss before deciding') then raise exception 'Invalid telehealth choice'; end if;
   if p_answers->>'electronic_choice' not in ('I agree to electronic intake and portal use','I request paper intake') then raise exception 'Invalid electronic documents choice'; end if;
   if p_answers->>'representative_signer' not in ('Patient signing for myself','Parent/guardian/authorized representative') then raise exception 'Invalid representative choice'; end if;
   if p_answers->>'treatment_consent'='Yes, I consent to outpatient counseling' and (nullif(btrim(p_answers->>'treatment_signature'),'') is null or nullif(btrim(p_answers->>'treatment_signature_date'),'') is null) then raise exception 'Sign treatment consent'; end if;
   if p_answers->>'financial_review'='I reviewed this information' and (nullif(btrim(p_answers->>'financial_signature'),'') is null or nullif(btrim(p_answers->>'financial_signature_date'),'') is null) then raise exception 'Sign financial information acknowledgment'; end if;
   if p_answers->>'telehealth_choice'='Yes, I consent to telehealth' and (nullif(btrim(p_answers->>'telehealth_signature'),'') is null or nullif(btrim(p_answers->>'telehealth_signature_date'),'') is null) then raise exception 'Sign telehealth consent'; end if;
   if p_answers->>'electronic_choice'='I agree to electronic intake and portal use' and (nullif(btrim(p_answers->>'electronic_signature'),'') is null or nullif(btrim(p_answers->>'electronic_signature_date'),'') is null) then raise exception 'Sign electronic services consent'; end if;
   if p_answers->>'representative_signer'='Parent/guardian/authorized representative' then
    foreach required_key in array array['representative_name','representative_authority','representative_signature','representative_signature_date'] loop
     if nullif(btrim(p_answers->>required_key),'') is null then raise exception 'Provide representative capacity and signature'; end if;
    end loop;
   end if;
  end if;
  foreach required_key in array array['full_name','date_of_birth','address','city','state','postal_code','phone','email','emergency_contact_name','emergency_contact_relationship','emergency_contact_phone','emergency_contact_permission','insurance_coverage','counseling_reason','functional_impact','counseling_goals','prior_mental_health_treatment','medical_conditions','medications_current','suicidal_thoughts_current','suicidal_plan_current','homicidal_thoughts_current','abuse_neglect_current','comm_phone_calls','comm_voicemail','comm_text','comm_email','comm_portal','comm_mail','npp_received','roi_authorize','psych_notes_authorize','information_accuracy','electronic_signature_consent','patient_signature','patient_signature_date'] loop
   if coalesce(btrim(p_answers->>required_key),'')='' then raise exception 'Complete required intake fields before submitting'; end if;
  end loop;
  if p_answers->>'npp_received' not in ('Yes','Decline acknowledgment') then raise exception 'Choose a privacy notice acknowledgment response'; end if;
  if p_answers->>'npp_received'='Yes' and (nullif(btrim(p_answers->>'npp_signature'),'') is null or nullif(btrim(p_answers->>'npp_signature_date'),'') is null) then raise exception 'Sign and date the privacy notice acknowledgment'; end if;
  if p_answers->>'information_accuracy'<>'Yes' or p_answers->>'electronic_signature_consent'<>'Yes' then raise exception 'Complete the final attestation'; end if;
  if p_answers->>'roi_authorize'='Yes' then
   foreach required_key in array array['roi_discloser','roi_recipient_name','roi_information_scope','roi_purpose','roi_expiration','roi_revocation_ack','roi_voluntary_ack','roi_signature','roi_signature_date'] loop
    if coalesce(btrim(p_answers->>required_key),'')='' then raise exception 'Complete the release authorization'; end if;
   end loop;
  end if;
  if p_answers->>'psych_notes_authorize'='Yes' then
   foreach required_key in array array['psych_notes_discloser','psych_notes_recipient','psych_notes_purpose','psych_notes_expiration','psych_notes_revocation_ack','psych_notes_signature','psych_notes_signature_date'] loop
    if coalesce(btrim(p_answers->>required_key),'')='' then raise exception 'Complete the psychotherapy-notes authorization'; end if;
   end loop;
  end if;
  if p_answers->>'part2_authorize'='Yes' then
   foreach required_key in array array['part2_discloser','part2_recipient','part2_scope','part2_purpose','part2_expiration','part2_revocation_ack','part2_signature','part2_signature_date'] loop
    if nullif(btrim(p_answers->>required_key),'') is null then raise exception 'Complete the separate Part 2 consent'; end if;
   end loop;
   if p_answers->>'part2_purpose' not in ('Treatment, payment and health care operations','Specific purpose') then raise exception 'Invalid Part 2 consent purpose'; end if;
   if p_answers->>'part2_purpose'='Specific purpose' and nullif(btrim(p_answers->>'part2_purpose_details'),'') is null then raise exception 'Describe the Part 2 consent purpose'; end if;
  end if;
  if p_answers->>'sud_notes_authorize'='Yes' then
   foreach required_key in array array['sud_notes_discloser','sud_notes_recipient','sud_notes_scope','sud_notes_purpose','sud_notes_expiration','sud_notes_revocation_ack','sud_notes_signature','sud_notes_signature_date'] loop
    if nullif(btrim(p_answers->>required_key),'') is null then raise exception 'Complete the separate SUD counseling-notes consent'; end if;
   end loop;
  end if;
  if (p_answers->>'suicidal_plan_current'='Yes' or p_answers->>'homicidal_thoughts_current'='Yes') and coalesce(btrim(p_answers->>'violence_risk_details'),'')='' then raise exception 'Describe the current safety concern before submitting'; end if;
 end if;
end
$function$;

revoke all on function private.validate_intake_answers(jsonb,boolean) from public, anon, authenticated;
