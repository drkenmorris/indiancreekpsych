-- Refuse to replace a validator that changed since this scoped release was prepared.
do $preflight$
begin
 if (select md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='validate_intake_answers') is distinct from '19cd0c93e7a4e83cd5700c044ef635d2' then raise exception 'Intake validator baseline changed; reconcile before applying'; end if;
end
$preflight$;

-- Add selection metadata only. Patient test release, auth/MFA, RLS and email gates remain unchanged.
alter table public.psych_test_assignments add column dsm_version text;
alter table public.psych_test_assignments add constraint psych_assignment_dsm_version check (
 (test_key='dsm' and (dsm_version is null or dsm_version in ('adult','adolescent','parent'))) or (test_key<>'dsm' and dsm_version is null)
);
create or replace function private.validate_psych_assignment_dsm() returns trigger
language plpgsql set search_path='' as $dsm$
declare dsm_age integer;
begin
 if new.test_key='dsm' then
  if coalesce(new.dsm_version,'') not in ('adult','adolescent','parent') then raise exception 'Choose a valid DSM questionnaire version'; end if;
  dsm_age:=extract(year from age((current_timestamp at time zone 'America/Chicago')::date,new.recipient_dob));
  if (new.dsm_version='adult' and dsm_age<18) or (new.dsm_version='adolescent' and dsm_age not between 11 and 17) or (new.dsm_version='parent' and dsm_age not between 6 and 17) then raise exception 'DSM questionnaire version does not match patient age'; end if;
 end if;
 return new;
end
$dsm$;
revoke all on function private.validate_psych_assignment_dsm() from public,anon,authenticated;
create trigger validate_psych_assignment_dsm before insert on public.psych_test_assignments
 for each row execute function private.validate_psych_assignment_dsm();

create or replace function private.psych_assignment_guard() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.id is distinct from old.id
    or new.assigned_by is distinct from old.assigned_by
    or new.recipient_email is distinct from old.recipient_email
    or new.recipient_first_name is distinct from old.recipient_first_name
    or new.recipient_last_name is distinct from old.recipient_last_name
    or new.recipient_dob is distinct from old.recipient_dob
    or new.test_key is distinct from old.test_key
    or new.dsm_version is distinct from old.dsm_version
    or new.created_at is distinct from old.created_at
    or new.expires_at is distinct from old.expires_at
 then raise exception 'Assignment identity is immutable'; end if;
 if old.status <> 'draft' then raise exception 'A sent/revoked assignment cannot be edited'; end if;
 new.updated_at:=now();
 return new;
end $$;
revoke all on function private.psych_assignment_guard() from public,anon,authenticated;

create or replace function private.validate_intake_answers(p_answers jsonb, p_submitting boolean)
returns void
language plpgsql
set search_path = ''
as $function$
declare
 k text; v jsonb; required_key text; dob date; dsm_age integer;
 allowed constant text[] := array[
'dsm_questionnaire_version','trauma_history_checklist','legal_routing_answers','full_name','preferred_name','date_of_birth','sex_at_birth','gender_identity','pronouns','marital_status','primary_language','interpreter_needed','address','address2','city','state','postal_code','phone','email','contact_preference','safe_voicemail','preferred_pharmacy',
'emergency_contact_name','emergency_contact_relationship','emergency_contact_phone','emergency_contact_permission','guardian_name','guardian_relationship','guardian_phone','custody_notes',
'insurance_coverage','insurance_carrier','insurance_type','insurance_member','insurance_group','insurance_phone','policyholder_name','policyholder_relationship','policyholder_dob','policyholder_employer','medicare_beneficiary_id','medicaid_id','medicaid_state','insurance_effective_date','referral_required','referral_provider','authorization_required','authorization_number','authorized_visits','secondary_insurance','secondary_carrier','secondary_member','secondary_group','deductible','deductible_met','copay','coinsurance','insurance_notes',
'counseling_reason','concern_onset','concern_duration','precipitating_events','symptom_frequency','symptom_severity','functional_impact','sleep','appetite','energy','concentration','work_school_impact','relationship_impact','daily_living_impact','counseling_goals',
'medical_substance_history','medication_entries','medication_allergy_status','medication_allergy_notes','treatment_history_entries','prior_mental_health_treatment','prior_therapists','prior_diagnoses','psychiatric_hospitalizations','self_harm_history','suicide_attempt_history','prior_psychiatric_medications','family_mental_health_history',
'primary_care_provider','pcp_phone','medical_conditions','surgeries_hospitalizations','allergies','medications_current','pregnancy_status','head_injury_seizure_history',
'alcohol_use','drug_use','tobacco_nicotine','substance_treatment_history','substance_consequences','gambling_other_behaviors',
'suicidal_thoughts_current','suicidal_plan_current','homicidal_thoughts_current','violence_risk_details','abuse_neglect_current','weapons_access','protective_factors',
'trauma_history','family_household','social_supports','education_history','employment_history','military_history','legal_history','cultural_spiritual_factors','strengths_interests',
'comm_phone_calls','comm_voicemail','comm_voicemail_detail','comm_text','comm_email','comm_portal','comm_mail','comm_other_number','comm_other_address','comm_restrictions',
'npp_received','npp_questions','npp_signature','npp_signature_date',
'roi_authorize','roi_recipient_name','roi_recipient_relationship','roi_recipient_phone','roi_recipient_email','roi_information_scope','roi_information_exclusions','roi_purpose','roi_expiration','roi_direction','roi_revocation_ack','roi_voluntary_ack','roi_signature','roi_signature_date',
'psych_notes_authorize','psych_notes_discloser','psych_notes_recipient','psych_notes_scope','psych_notes_purpose','psych_notes_expiration','psych_notes_revocation_ack','psych_notes_signature','psych_notes_signature_date',
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
  if not (k=any(allowed)) or jsonb_typeof(v)<>'string' or length(v#>>'{}')>(case when k='trauma_history_checklist' then 12000 when k='legal_routing_answers' then 4000 when k='treatment_history_entries' then 70000 when k='medication_entries' then 40000 when k='medical_substance_history' then 50000 else 8000 end) then raise exception 'Invalid intake field'; end if;
 end loop;
 if coalesce(p_answers->>'dsm_questionnaire_version','')<>'' then
  if p_answers->>'dsm_questionnaire_version' not in ('adult','adolescent','parent') then raise exception 'Invalid DSM questionnaire version'; end if;
  if coalesce(p_answers->>'date_of_birth','')<>'' then
   begin dob:=(p_answers->>'date_of_birth')::date; exception when others then raise exception 'Invalid DSM patient birth date'; end;
   if p_answers->>'date_of_birth' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or to_char(dob,'YYYY-MM-DD')<>p_answers->>'date_of_birth' or dob>(current_timestamp at time zone 'America/Chicago')::date then raise exception 'Invalid DSM patient birth date'; end if;
   dsm_age:=extract(year from age((current_timestamp at time zone 'America/Chicago')::date,dob));
   if (p_answers->>'dsm_questionnaire_version'='adult' and dsm_age<18) or (p_answers->>'dsm_questionnaire_version'='adolescent' and dsm_age not between 11 and 17) or (p_answers->>'dsm_questionnaire_version'='parent' and dsm_age not between 6 and 17) then raise exception 'DSM questionnaire version does not match patient age'; end if;
  end if;
 end if;
 perform private.validate_intake_trauma_history(p_answers->>'trauma_history_checklist');
 perform private.validate_intake_legal_form_fields(p_answers);
 perform private.validate_intake_legal_routing(p_answers->>'legal_routing_answers',p_submitting and p_answers->>'legal_packet_version'='2026-11-02-directory-1');
 perform private.validate_intake_medical_substance(p_answers->>'medical_substance_history');
 perform private.validate_intake_medications(p_answers->>'medication_entries',p_submitting);
 if coalesce(p_answers->>'medication_allergy_status','') not in ('','Not yet reviewed','No known medication allergies','Medication allergies reported') then raise exception 'Invalid medication allergy status'; end if;
 if length(coalesce(p_answers->>'medication_allergy_notes',''))>4000 then raise exception 'Medication allergy notes too long'; end if;
 if p_answers->>'medication_allergy_status'='Medication allergies reported' and btrim(coalesce(p_answers->>'medication_allergy_notes',''))='' then raise exception 'Describe medication allergies / reactions'; end if;
 if p_answers->>'medication_allergy_status'='No known medication allergies' and btrim(coalesce(p_answers->>'medication_allergy_notes',''))<>'' then raise exception 'Medication allergy status conflicts with notes'; end if;
 perform private.validate_intake_treatment_history(p_answers->>'treatment_history_entries',p_submitting);
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
 if p_submitting and p_answers->>'legal_packet_version' in ('2026-11-02','2026-11-02-directory-1') and p_answers->>'psych_notes_authorize'='Yes' and btrim(coalesce(p_answers->>'psych_notes_scope',''))='' then raise exception 'Describe the specific psychotherapy notes to disclose'; end if;
 if p_submitting then
  -- During the non-disruptive release window, existing clients may still submit
  -- pre-revision payloads. The follow-up required-version migration closes that window.
  if p_answers->>'legal_packet_version'='2026-11-02-directory-1' then
   foreach k in array array['telehealth','electronic','representative'] loop
    required_key:=case k when 'telehealth' then 'telehealth_choice' when 'electronic' then 'electronic_choice' else 'representative_signer' end;
    if ((p_answers->>'legal_routing_answers')::jsonb->'answers'->>k)='Yes' and nullif(btrim(p_answers->>required_key),'') is null then raise exception 'Review the form for the selected service or representative'; end if;
   end loop;
  end if;
  if p_answers ? 'legal_packet_version' then
   if p_answers->>'legal_packet_version' not in ('2026-10-11','2026-11-02','2026-11-02-directory-1') then raise exception 'Unrecognized patient legal packet revision'; end if;
   foreach required_key in array (case when p_answers->>'legal_packet_version'='2026-11-02-directory-1' then array['treatment_consent','financial_review'] else array['treatment_consent','financial_review','telehealth_choice','electronic_choice','representative_signer'] end) loop
    if coalesce(btrim(p_answers->>required_key),'')='' then raise exception 'Complete the required patient document choice'; end if;
   end loop;
   if coalesce(p_answers->>'part2_authorize','') not in ('','No','Yes') or coalesce(p_answers->>'sud_notes_authorize','') not in ('','No','Yes') then raise exception 'Invalid Part 2 authorization selection'; end if;
   if p_answers->>'treatment_consent' not in ('Yes, I consent to outpatient counseling','I need to discuss this before consenting') then raise exception 'Invalid treatment consent choice'; end if;
   if p_answers->>'financial_review' not in ('I reviewed this information','I request fee clarification before treatment') then raise exception 'Invalid financial information choice'; end if;
   if coalesce(p_answers->>'telehealth_choice','')<>'' and p_answers->>'telehealth_choice' not in ('Yes, I consent to telehealth','No, in-person care only','Discuss before deciding') then raise exception 'Invalid telehealth choice'; end if;
   if coalesce(p_answers->>'electronic_choice','')<>'' and p_answers->>'electronic_choice' not in ('I agree to electronic intake and portal use','I request paper intake') then raise exception 'Invalid electronic documents choice'; end if;
   if coalesce(p_answers->>'representative_signer','')<>'' and p_answers->>'representative_signer' not in ('Patient signing for myself','Parent/guardian/authorized representative') then raise exception 'Invalid representative choice'; end if;
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
  foreach required_key in array array['full_name','date_of_birth','address','city','state','postal_code','phone','email','emergency_contact_name','emergency_contact_relationship','emergency_contact_phone','emergency_contact_permission','insurance_coverage','counseling_reason','functional_impact','counseling_goals','prior_mental_health_treatment','suicidal_thoughts_current','suicidal_plan_current','homicidal_thoughts_current','abuse_neglect_current','comm_phone_calls','comm_voicemail','comm_text','comm_email','comm_portal','comm_mail','npp_received','information_accuracy','electronic_signature_consent','patient_signature','patient_signature_date'] loop
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

