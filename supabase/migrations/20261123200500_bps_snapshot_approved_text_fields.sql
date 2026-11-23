-- Enforce the complete general BPS storage allowlist at the database boundary.
-- The clinical RPC already projects these fields, but an out-of-band privileged
-- write could otherwise persist medication, allergy, insurance, legal or other
-- structured content. Existing clinical history remains untouched: NOT VALID
-- still enforces the constraint for every future insert/update.
alter table public.emr_bps_intake_reviews
 add constraint emr_bps_snapshots_approved_text_fields
 check (
   jsonb_typeof(clinical_answers)='object'
   and (clinical_answers - array[
     'guardian_relationship','custody_notes','counseling_reason','concern_onset','concern_duration',
     'precipitating_events','symptom_frequency','symptom_severity','functional_impact',
     'sleep','appetite','energy','concentration','work_school_impact','relationship_impact',
     'daily_living_impact','counseling_goals','prior_mental_health_treatment','prior_therapists',
     'prior_diagnoses','self_harm_history','suicide_attempt_history',
     'suicidal_thoughts_current','suicidal_plan_current','homicidal_thoughts_current',
     'violence_risk_details','abuse_neglect_current','weapons_access','protective_factors'
   ]::text[])='{}'::jsonb
   and not jsonb_path_exists(clinical_answers,
     'strict $.* ? (@.type() != "string" || @ like_regex "^ *$")'::jsonpath)
 ) not valid;
