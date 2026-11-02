-- Align optional intake page 7 with the original EMR medical/substance definition.
create or replace function private.validate_intake_medical_substance(p_value text)
returns void language plpgsql set search_path='' as $history$
declare data jsonb; definition constant jsonb := $definition${
  "version": "2.1.0",
  "consolidation_version": "1",
  "groups": [
    {
      "key": "medical_conditions",
      "label": "Medical Conditions — Current or Past",
      "choices": [
        "Heart / cardiovascular disease",
        "High blood pressure",
        "High cholesterol",
        "Diabetes",
        "Thyroid / endocrine condition",
        "Asthma",
        "Other respiratory disease",
        "Seizure disorder",
        "Stroke / TIA",
        "Head injury / concussion",
        "Other neurological condition",
        "Chronic pain",
        "Migraine / recurrent headache",
        "Arthritis / musculoskeletal condition",
        "Gastrointestinal condition",
        "Liver disease",
        "Kidney disease",
        "Cancer",
        "Blood disorder / anemia",
        "Sleep apnea / sleep disorder",
        "Infectious disease",
        "Autoimmune condition",
        "Vision impairment",
        "Hearing impairment",
        "Reproductive / pregnancy-related condition or concern",
        "Physical disability",
        "Other medical condition",
        "None reported",
        "History unknown"
      ]
    },
    {
      "key": "medical_care",
      "label": "Significant Medical Care / Events",
      "choices": [
        "Surgery",
        "Medical hospitalization",
        "Emergency department visit(s)",
        "Major accident / injury",
        "Loss of consciousness",
        "Long-term medical treatment",
        "Specialist care",
        "Rehabilitation / physical therapy",
        "Assistive device(s)",
        "Other medical care / event",
        "None reported",
        "History unknown"
      ]
    },
    {
      "key": "health_impact",
      "label": "Health Impact on Daily Life",
      "choices": [
        "Pain affects daily functioning",
        "Fatigue / low energy",
        "Sleep disruption",
        "Mobility limitations",
        "Difficulty with personal care",
        "Work / school affected",
        "Social activities limited",
        "Medication side effects reported",
        "Ongoing medical follow-up needed",
        "Other health impact",
        "None reported",
        "History unknown"
      ]
    },
    {
      "key": "substances",
      "label": "Substances Used — Current or Past",
      "choices": [
        "Alcohol",
        "Nicotine / tobacco (including vaping)",
        "Cannabis / marijuana",
        "Stimulants (cocaine, methamphetamine or nonmedical prescription use)",
        "Opioids / nonmedical prescription pain medication",
        "Nonmedical sedative / tranquilizer use",
        "Hallucinogens",
        "Inhalants",
        "Other substance",
        "None reported",
        "History unknown"
      ]
    },
    {
      "key": "patterns",
      "label": "Substance-Use Patterns Over Time",
      "choices": [
        "Current use reported",
        "Past use reported",
        "Experimental use",
        "Occasional use",
        "Frequent / daily use",
        "Episodes of heavy use",
        "Use of multiple substances",
        "Difficulty reducing / stopping use",
        "Other pattern",
        "None reported",
        "History unknown"
      ]
    },
    {
      "key": "routes",
      "label": "Routes of Substance Use",
      "choices": [
        "Oral / swallowed",
        "Smoked",
        "Vaped",
        "Intranasal / snorted",
        "Injected",
        "Other route",
        "None reported",
        "History unknown"
      ]
    },
    {
      "key": "effects",
      "label": "Substance-Related Effects / Consequences",
      "choices": [
        "Cravings",
        "Needing increased amounts",
        "Withdrawal symptoms",
        "Blackouts / memory gaps",
        "Overdose history",
        "Withdrawal seizure history",
        "Health complications",
        "Work / school problems",
        "Relationship / family problems",
        "Financial problems",
        "Legal problems",
        "Use in hazardous situations",
        "Other consequence",
        "None reported",
        "History unknown"
      ]
    },
    {
      "key": "recovery",
      "label": "Substance-Use Treatment / Recovery History",
      "choices": [
        "Medical withdrawal management / detoxification",
        "Inpatient / residential treatment",
        "Outpatient treatment",
        "Intensive outpatient treatment",
        "Medication-based treatment",
        "Individual counseling",
        "Group counseling",
        "Peer / mutual-support group",
        "Recovery support from family / community",
        "Prior return to use / relapse",
        "Periods of abstinence / recovery",
        "Other treatment / recovery history",
        "None reported",
        "History unknown"
      ]
    }
  ],
  "notes": {
    "medical_notes": "Medical Details / Conditions, Care and Dates",
    "use_notes": "Substance-Use Details / Substance, Amount, Frequency, First and Last Use",
    "effects_notes": "Effects / Consequences Details",
    "recovery_notes": "Treatment / Recovery Details and Dates",
    "source_notes": "Other Information / Source of History",
    "primary_care_provider": "Primary Care Provider",
    "pcp_phone": "Primary Care Provider Phone",
    "other_allergies": "Other Allergies / Reactions (food, environmental or other non-medication allergies)",
    "behavioral_addictions": "Gambling / Other Compulsive Behaviors and Their Impact"
  },
  "exclusive": [
    "None reported",
    "History unknown"
  ]
}
$definition$::jsonb; k text; v jsonb; g jsonb; choice jsonb;
begin
 if coalesce(p_value,'')='' then return; end if;
 if length(p_value)>50000 then raise exception 'Medical/substance history is too long'; end if;
 begin data:=p_value::jsonb; exception when others then raise exception 'Invalid medical/substance history'; end;
 if jsonb_typeof(data)<>'object' then raise exception 'Invalid medical/substance history'; end if;
 if (select count(*) from jsonb_object_keys(data))<>3 or not data ?& array['definition_version','selections','notes'] or coalesce(data->>'definition_version','')<>definition->>'version' or jsonb_typeof(data->'selections')<>'object' or jsonb_typeof(data->'notes')<>'object' then raise exception 'Invalid medical/substance fields or version'; end if;
 for k,v in select * from jsonb_each(data->'selections') loop
  select value into g from jsonb_array_elements(definition->'groups') where value->>'key'=k;
  if g is null or jsonb_typeof(v)<>'array' then raise exception 'Unknown medical/substance group'; end if;
  for choice in select value from jsonb_array_elements(v) loop
   if jsonb_typeof(choice)<>'string' or not (g->'choices') ? (choice#>>'{}') then raise exception 'Invalid medical/substance choice'; end if;
  end loop;
  if (select count(*) from jsonb_array_elements(v))<>(select count(distinct value) from jsonb_array_elements(v)) then raise exception 'Duplicate medical/substance choice'; end if;
  if jsonb_array_length(v)>1 and exists(select 1 from jsonb_array_elements_text(v) where (definition->'exclusive') ? value) then raise exception 'None reported / History unknown cannot be combined with other choices in the same section'; end if;
 end loop;
 for k,v in select * from jsonb_each(data->'notes') loop
  if not (definition->'notes') ? k or jsonb_typeof(v)<>'string' or length(v#>>'{}')>4000 then raise exception 'Invalid medical/substance detail'; end if;
 end loop;
end
$history$;
revoke all on function private.validate_intake_medical_substance(text) from public,anon,authenticated;

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
'medical_substance_history','medication_entries','medication_allergy_status','medication_allergy_notes','treatment_history_entries','prior_mental_health_treatment','prior_therapists','prior_diagnoses','psychiatric_hospitalizations','self_harm_history','suicide_attempt_history','prior_psychiatric_medications','family_mental_health_history',
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
  if not (k=any(allowed)) or jsonb_typeof(v)<>'string' or length(v#>>'{}')>(case when k='treatment_history_entries' then 70000 when k='medication_entries' then 40000 when k='medical_substance_history' then 50000 else 8000 end) then raise exception 'Invalid intake field'; end if;
 end loop;
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
  foreach required_key in array array['full_name','date_of_birth','address','city','state','postal_code','phone','email','emergency_contact_name','emergency_contact_relationship','emergency_contact_phone','emergency_contact_permission','insurance_coverage','counseling_reason','functional_impact','counseling_goals','prior_mental_health_treatment','suicidal_thoughts_current','suicidal_plan_current','homicidal_thoughts_current','abuse_neglect_current','comm_phone_calls','comm_voicemail','comm_text','comm_email','comm_portal','comm_mail','npp_received','roi_authorize','psych_notes_authorize','information_accuracy','electronic_signature_consent','patient_signature','patient_signature_date'] loop
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
