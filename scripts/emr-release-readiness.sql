-- Indian Creek EMR: repeatable, read-only release drift and data-state audit.
-- Execute against an APPROVED environment with read-only SQL access. It only
-- reads metadata and aggregates; it returns no patient names, emails, IDs or PHI.
-- WARNING: this is NOT a clinical end-to-end, MFA-login, email, or booking test.
-- Never use a green data counter, a Vercel READY state, or passing CI as a
-- substitute for actual authenticated seven-page BPS and scheduler acceptance.
-- Versions below are integration PR #116 migration files at the Nov 23 checkpoint.
-- Update this explicit manifest when the integration branch gains migrations.
WITH
 expected_migrations(version) AS (VALUES
  ('20261111152500'),
  ('20261111170500'),
  ('20261113110400'),
  ('20261113165500'),
  ('20261114050000'),
  ('20261114121500'),
  ('20261115071500'),
  ('20261115120000'),
  ('20261117041500'),
  ('20261117154018'),
  ('20261117162318'),
  ('20261117181000'),
  ('20261117185800'),
  ('20261117205945'),
  ('20261118120500'),
  ('20261118184500'),
  ('20261118204000'),
  ('20261118210600'),
  ('20261119004500'),
  ('20261119033000'),
  ('20261120101500'),
  ('20261122042000'),
  ('20261122220500')
 ),
 migration_audit AS (
  SELECT COUNT(*) FILTER (WHERE installed.version IS NULL)::integer AS not_applied,
   COALESCE(jsonb_agg(expected.version ORDER BY expected.version)
    FILTER (WHERE installed.version IS NULL),'[]'::jsonb) AS missing_versions
  FROM expected_migrations expected
  LEFT JOIN supabase_migrations.schema_migrations installed ON installed.version=expected.version
 ),
 expected_mfa(tablename,policyname) AS (VALUES
  ('appointment_settings','appointment_settings_admin_mfa_gate'),
  ('appointment_availability_rules','availability_rules_admin_mfa_gate'),
  ('appointment_blocks','appointment_blocks_admin_mfa_gate'),
  ('appointments','appointments_admin_mfa_gate')
 ),
 -- A website account must never be counted as an unambiguous submitted
 -- clinical source when it resolves to zero or multiple active central charts.
 -- Aggregate only; never expose chart UUIDs, account identifiers or PHI.
 active_chart_accounts AS (
  SELECT account_id,COUNT(*)::integer AS active_charts
  FROM public.clinical_patients
  WHERE directory_deleted_at IS NULL AND account_id IS NOT NULL
  GROUP BY account_id
 ),
 chart_link_audit AS (
  SELECT
   (SELECT COUNT(*)::integer FROM active_chart_accounts WHERE active_charts>1)
     AS duplicate_active_account_links,
   COUNT(*) FILTER (WHERE i.status='submitted' AND COALESCE(a.active_charts,0)=0)::integer
     AS submitted_without_active_chart,
   COUNT(*) FILTER (WHERE i.status='submitted' AND a.active_charts=1)::integer
     AS submitted_with_exactly_one_chart,
   COUNT(*) FILTER (WHERE i.status='submitted' AND a.active_charts>1)::integer
     AS submitted_with_multiple_charts
  FROM public.patient_intakes i
  LEFT JOIN active_chart_accounts a ON a.account_id=i.patient_id
 ),
 -- Policy NAMES alone do not prove that the AAL2 gate was installed safely:
 -- an identically named PERMISSIVE/USING(true) policy would silently weaken it.
 -- These metadata checks are necessary but not sufficient. Effective JWT/RLS
 -- behavior still requires authenticated integration acceptance.
 mfa_policy_metadata AS (
  SELECT expected.policyname,
   installed.policyname IS NOT NULL AS present,
   (COALESCE((SELECT c.relrowsecurity FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=expected.tablename
      LIMIT 1),false)
    AND installed.permissive='RESTRICTIVE'
    AND installed.cmd='ALL'
    AND 'authenticated'=ANY(installed.roles)
    AND installed.qual ILIKE '%current_user_is_admin%'
    AND installed.with_check ILIKE '%current_user_is_admin%'
    AND installed.qual LIKE '%aal2%'
    AND installed.with_check LIKE '%aal2%') AS structurally_valid
  FROM expected_mfa expected
  LEFT JOIN pg_policies installed
   ON installed.schemaname='public'
   AND installed.tablename=expected.tablename
   AND installed.policyname=expected.policyname
 ),
 mfa_audit AS (
  SELECT COUNT(*) FILTER (WHERE present)::integer AS installed,
   COUNT(*) FILTER (WHERE structurally_valid IS TRUE)::integer AS structurally_valid,
   COALESCE(jsonb_agg(policyname ORDER BY policyname)
     FILTER (WHERE NOT present),'[]'::jsonb) AS missing_policies,
   COALESCE(jsonb_agg(policyname ORDER BY policyname)
     FILTER (WHERE present AND structurally_valid IS NOT TRUE),'[]'::jsonb)
     AS invalid_policy_structure
  FROM mfa_policy_metadata
 ),
 -- Diagnose pre-migration direct-table admin authorization paths. Permissive
 -- policies that use an admin helper without visible AAL2 may remain reachable
 -- at AAL1 when no restrictive AAL2 gate covers the same table. The result is
 -- a STATIC RISK CANDIDATE only; never treat it as authenticated JWT proof.
 -- Public and patient availability reads are intentionally out of scope.
 admin_mfa_unguarded_policy_candidates AS (
  SELECT p.tablename,p.policyname
  FROM pg_policies p
  WHERE p.schemaname='public'
   AND p.tablename IN ('appointments','appointment_settings',
      'appointment_availability_rules','appointment_blocks')
   AND p.permissive='PERMISSIVE'
   AND 'authenticated'=ANY(p.roles)
   AND (
    (COALESCE(p.qual,'') ILIKE '%current_user_is_admin%'
     AND COALESCE(p.qual,'') NOT ILIKE '%aal2%')
    OR
    (COALESCE(p.with_check,'') ILIKE '%current_user_is_admin%'
     AND COALESCE(p.with_check,'') NOT ILIKE '%aal2%')
   )
   AND NOT EXISTS (
    SELECT 1 FROM pg_policies g
    WHERE g.schemaname=p.schemaname AND g.tablename=p.tablename
     AND g.permissive='RESTRICTIVE' AND g.cmd='ALL'
     AND 'authenticated'=ANY(g.roles)
     AND COALESCE(g.qual,'') ILIKE '%aal2%'
     AND COALESCE(g.with_check,'') ILIKE '%aal2%'
   )
 ),
 admin_mfa_gap_audit AS (
  SELECT COUNT(*)::integer AS candidate_policies,
   COUNT(DISTINCT tablename)::integer AS candidate_tables,
   COALESCE(jsonb_agg(tablename||'.'||policyname ORDER BY tablename,policyname),
    '[]'::jsonb) AS candidate_names
  FROM admin_mfa_unguarded_policy_candidates
 ),
 intake_audit AS (
  SELECT COUNT(*)::integer AS total,
   COUNT(*) FILTER (WHERE i.status='submitted')::integer AS submitted,
   -- Surface invalid submission receipts as explicit release warnings. A
   -- successful chart link alone must not hide missing or stale provenance.
   COUNT(*) FILTER (WHERE i.status='submitted' AND i.submitted_at IS NULL)::integer
     AS missing_submission_receipts,
   COUNT(*) FILTER (WHERE i.status='submitted' AND i.submitted_at IS NOT NULL
    AND (i.updated_at IS NULL OR i.updated_at>i.submitted_at))::integer
     AS invalid_receipt_chronology,
   -- A receipt is NOT a safely linked clinical source when the website
   -- account points at two or more active charts.  This must agree with the
   -- cardinality check above, not merely prove that one chart EXISTS.
   COUNT(*) FILTER (WHERE i.status='submitted' AND i.submitted_at IS NOT NULL
    AND i.updated_at<=i.submitted_at AND a.active_charts=1)::integer
    AS submitted_receipted_active_chart_links
  FROM public.patient_intakes i
  LEFT JOIN active_chart_accounts a ON a.account_id=i.patient_id
 ),
 -- A generic 'reviewed=true' row is NOT enough to prove that the seven-page
 -- BPS review belongs to the correct current submitted website intake.
 -- Check active chart, source account/version/status/timestamp and submission
 -- receipt together; this still does NOT prove a clinician used the UI.
 bps_review_sources AS (
  SELECT r.reviewed,
   (r.owner_id IS NOT NULL
    AND c.id IS NOT NULL AND c.directory_deleted_at IS NULL
    AND c.account_id = r.source_account_id
    AND a.active_charts = 1
    AND i.patient_id IS NOT NULL AND i.status='submitted'
    AND i.submitted_at IS NOT NULL AND i.updated_at IS NOT NULL
    AND i.updated_at<=i.submitted_at
    AND r.source_status='submitted'
    AND i.version IS NOT NULL AND r.source_version=i.version
    AND r.source_updated_at=i.updated_at
    -- No record created before the patient attested submission can prove a
    -- later clinician review, regardless of an otherwise matching source.
    AND r.created_at IS NOT NULL AND r.created_at>=i.submitted_at) AS current_source_provenance,
   -- SQL-level candidate check: stored notes must contain the entire seven-
   -- domain allowlist, only bounded JSON strings, and at least one legible
   -- alphanumeric observation. Conservative aggregate; NOT clinical quality,
   -- true clinician authentication, or seven-page browser acceptance.
   CASE WHEN jsonb_typeof(r.clinician_notes)='object' THEN
     (SELECT COUNT(*)=7
       AND COUNT(*) FILTER (
        WHERE n.key IN ('presenting','treatment','medical','safety','family','goals','limitations')
         AND jsonb_typeof(n.value)='string'
         AND length(n.value #>> '{}')<=4000)=7
       AND COUNT(*) FILTER (
        WHERE jsonb_typeof(n.value)='string'
          AND (n.value #>> '{}') ~ '[[:alnum:]]')>0
      FROM jsonb_each(r.clinician_notes) AS n(key,value))
    ELSE false END AS seven_domain_notes_candidate
  FROM public.emr_bps_intake_reviews r
  LEFT JOIN public.clinical_patients c ON c.id=r.patient_id
  LEFT JOIN public.patient_intakes i ON i.patient_id=r.source_account_id
  LEFT JOIN active_chart_accounts a ON a.account_id=r.source_account_id
 ),
 bps_audit AS (
  SELECT COUNT(*)::integer AS saved_review_rows,
   COUNT(*) FILTER (WHERE reviewed IS TRUE)::integer AS reviewed_flag_rows,
   COUNT(*) FILTER (WHERE reviewed IS TRUE AND current_source_provenance IS TRUE)::integer
     AS reviewed_matching_current_intake,
   COUNT(*) FILTER (WHERE reviewed IS TRUE AND current_source_provenance IS NOT TRUE)::integer
     AS reviewed_unverified_or_mismatched_source,
   COUNT(*) FILTER (WHERE reviewed IS TRUE AND current_source_provenance IS TRUE
     AND seven_domain_notes_candidate IS TRUE)::integer AS candidate_documented_reviews,
   COUNT(*) FILTER (WHERE reviewed IS TRUE AND current_source_provenance IS TRUE
     AND seven_domain_notes_candidate IS NOT TRUE)::integer AS incomplete_review_notes
  FROM bps_review_sources
 ),
 -- Check the *stored* general BPS snapshot, not just the source intake or
 -- clinical UI. A non-validating constraint may protect future inserts while
 -- leaving historical records untouched, so report legacy contamination too.
 -- Keys only: never select or return any values, chart IDs, names or PHI.
 -- This allowlist must match save_emr_bps_intake_review's approved projection.
 bps_stored_field_boundary AS (
  SELECT
   COUNT(*) FILTER (WHERE jsonb_typeof(r.clinical_answers)='object'
      AND r.clinical_answers ? 'trauma_history')::integer AS structured_trauma,
   COUNT(*) FILTER (WHERE r.clinical_answers IS NOT NULL
      AND jsonb_typeof(r.clinical_answers)<>'object')::integer AS malformed_shape,
   -- An approved key with a structured JSON value is not a literal patient
   -- answer. Blank saved strings are likewise not part of the BPS projection.
   -- Audit values by TYPE/emptiness only; never return the text or keys.
   COUNT(*) FILTER (WHERE CASE WHEN jsonb_typeof(r.clinical_answers)='object' THEN
     EXISTS (SELECT 1 FROM jsonb_each(r.clinical_answers) AS field(key,value)
       WHERE jsonb_typeof(field.value)<>'string')
     ELSE false END)::integer AS snapshots_with_non_text_values,
   COUNT(*) FILTER (WHERE CASE WHEN jsonb_typeof(r.clinical_answers)='object' THEN
     EXISTS (SELECT 1 FROM jsonb_each(r.clinical_answers) AS field(key,value)
       WHERE jsonb_typeof(field.value)='string'
        AND btrim(field.value #>> '{}')='')
     ELSE false END)::integer AS snapshots_with_blank_values,
   COUNT(*) FILTER (WHERE CASE
     WHEN jsonb_typeof(r.clinical_answers)='object' THEN EXISTS (
       SELECT 1 FROM jsonb_object_keys(r.clinical_answers) AS field(key)
       WHERE field.key NOT IN (
        'guardian_relationship',
        'custody_notes',
        'counseling_reason',
        'concern_onset',
        'concern_duration',
        'precipitating_events',
        'symptom_frequency',
        'symptom_severity',
        'functional_impact',
        'sleep',
        'appetite',
        'energy',
        'concentration',
        'work_school_impact',
        'relationship_impact',
        'daily_living_impact',
        'counseling_goals',
        'prior_mental_health_treatment',
        'prior_therapists',
        'prior_diagnoses',
        'self_harm_history',
        'suicide_attempt_history',
        'suicidal_thoughts_current',
        'suicidal_plan_current',
        'homicidal_thoughts_current',
        'violence_risk_details',
        'abuse_neglect_current',
        'weapons_access',
        'protective_factors'
       )) ELSE false END)::integer AS snapshots_with_unapproved_keys
  FROM public.emr_bps_intake_reviews r
 ),
 scheduler_audit AS (
  SELECT COUNT(*)::integer AS appointments,
   COUNT(*) FILTER (WHERE series_id IS NOT NULL)::integer AS recurring_occurrences,
   COUNT(*) FILTER (WHERE series_id IS NOT NULL AND patient_id IS NULL)::integer AS recurring_without_chart_id,
   COUNT(DISTINCT series_id) FILTER (WHERE series_id IS NOT NULL)::integer AS recurring_series,
   COUNT(*) FILTER (WHERE ends_at<=starts_at)::integer AS invalid_intervals
  FROM public.appointments
 ),
 assignment_audit AS (
  SELECT (SELECT COUNT(*)::integer FROM public.psych_test_assignments) AS assignments,
   (SELECT COUNT(*)::integer FROM public.connected_assignment_responses) AS connected_responses,
   (SELECT COUNT(*)::integer FROM public.appointment_availability_rules) AS availability_rules
 )
SELECT jsonb_build_object(
 'audit_scope','read_only_schema_and_data_state_NOT_authenticated_acceptance',
 'expected_pr116_migrations',23,
 'missing_expected_migrations',(SELECT not_applied FROM migration_audit),
 'missing_migration_versions',(SELECT missing_versions FROM migration_audit),
 'scheduler_admin_mfa_policies_installed',(SELECT installed FROM mfa_audit),
 'scheduler_admin_mfa_policies_expected',4,
 'scheduler_admin_mfa_policies_missing',(SELECT missing_policies FROM mfa_audit),
 'scheduler_admin_mfa_policies_structurally_valid',(SELECT structurally_valid FROM mfa_audit),
 'scheduler_admin_mfa_policies_invalid_structure',(SELECT invalid_policy_structure FROM mfa_audit),
 'scheduler_admin_mfa_policy_metadata_status',CASE
    WHEN (SELECT installed FROM mfa_audit)<4 THEN 'ADMIN_MFA_POLICY_NOT_INSTALLED'
    WHEN (SELECT structurally_valid FROM mfa_audit)<4 THEN 'ADMIN_MFA_POLICY_STRUCTURE_REVIEW_REQUIRED'
    ELSE 'POLICY_METADATA_MATCHES_NOT_AUTHENTICATED_E2E' END,
 'scheduler_admin_policies_without_visible_aal2_guard_candidate_count',(SELECT candidate_policies FROM admin_mfa_gap_audit),
 'scheduler_tables_with_candidate_admin_mfa_gap',(SELECT candidate_tables FROM admin_mfa_gap_audit),
 'scheduler_candidate_admin_mfa_gap_policy_names',(SELECT candidate_names FROM admin_mfa_gap_audit),
 'scheduler_candidate_admin_mfa_gap_evidence','STATIC_POLICY_METADATA_ONLY_NOT_AUTHENTICATED_RUNTIME_PROOF',
 'intake_total',(SELECT total FROM intake_audit),
 'intake_submitted',(SELECT submitted FROM intake_audit),
 'submitted_intakes_missing_receipt',(SELECT missing_submission_receipts FROM intake_audit),
 'submitted_intakes_invalid_receipt_chronology',(SELECT invalid_receipt_chronology FROM intake_audit),
 'intake_submission_receipt_aggregate_status',CASE WHEN
    (SELECT missing_submission_receipts FROM intake_audit)=0 AND
    (SELECT invalid_receipt_chronology FROM intake_audit)=0
    THEN 'NO_AGGREGATE_RECEIPT_ANOMALY_NOT_E2E'
    ELSE 'SUBMISSION_RECEIPT_REVIEW_REQUIRED' END,
 'intake_linked_submitted_receipted',(SELECT submitted_receipted_active_chart_links FROM intake_audit),
 'duplicate_active_account_chart_links',(SELECT duplicate_active_account_links FROM chart_link_audit),
 'submitted_intakes_without_active_chart',(SELECT submitted_without_active_chart FROM chart_link_audit),
 'submitted_intakes_with_exactly_one_active_chart',(SELECT submitted_with_exactly_one_chart FROM chart_link_audit),
 'submitted_intakes_with_multiple_active_charts',(SELECT submitted_with_multiple_charts FROM chart_link_audit),
 'clinical_chart_link_aggregate_status',CASE WHEN
   (SELECT duplicate_active_account_links FROM chart_link_audit)=0 AND
   (SELECT submitted_without_active_chart FROM chart_link_audit)=0 AND
   (SELECT submitted_with_multiple_charts FROM chart_link_audit)=0
   THEN 'NO_AGGREGATE_LINK_ANOMALY_NOT_E2E'
   ELSE 'CHART_LINK_REVIEW_REQUIRED' END,
 'clinician_bps_review_rows',(SELECT saved_review_rows FROM bps_audit),
 'clinician_bps_reviewed_flags',(SELECT reviewed_flag_rows FROM bps_audit),
 'reviewed_bps_rows_matching_current_intake_provenance',(SELECT reviewed_matching_current_intake FROM bps_audit),
 'reviewed_bps_rows_unverified_or_mismatched_provenance',(SELECT reviewed_unverified_or_mismatched_source FROM bps_audit),
 'reviewed_bps_rows_with_source_and_seven_domain_documentation_candidate',(SELECT candidate_documented_reviews FROM bps_audit),
 'reviewed_bps_rows_with_source_but_incomplete_documentation',(SELECT incomplete_review_notes FROM bps_audit),
 'reviewed_bps_source_aggregate_status',CASE
    WHEN (SELECT reviewed_unverified_or_mismatched_source FROM bps_audit)>0 THEN 'REVIEW_PROVENANCE_INVESTIGATION_REQUIRED'
    WHEN (SELECT incomplete_review_notes FROM bps_audit)>0 THEN 'REVIEW_DOCUMENTATION_INVESTIGATION_REQUIRED'
    WHEN (SELECT candidate_documented_reviews FROM bps_audit)=0 THEN 'NO_MATCHED_REVIEW_SNAPSHOT_NOT_E2E'
    ELSE 'MATCHED_SOURCE_DOCUMENTATION_CANDIDATES_NOT_AUTHENTICATED_E2E' END,
 'bps_stored_snapshots_with_unapproved_fields',(SELECT snapshots_with_unapproved_keys FROM bps_stored_field_boundary),
 'bps_stored_snapshots_with_structured_trauma',(SELECT structured_trauma FROM bps_stored_field_boundary),
 'bps_stored_snapshots_with_malformed_field_shape',(SELECT malformed_shape FROM bps_stored_field_boundary),
 'bps_stored_snapshots_with_non_text_values',(SELECT snapshots_with_non_text_values FROM bps_stored_field_boundary),
 'bps_stored_snapshots_with_blank_values',(SELECT snapshots_with_blank_values FROM bps_stored_field_boundary),
 'bps_stored_field_boundary_status',CASE WHEN
   (SELECT snapshots_with_unapproved_keys FROM bps_stored_field_boundary)>0 OR
   (SELECT malformed_shape FROM bps_stored_field_boundary)>0 OR
   (SELECT snapshots_with_non_text_values FROM bps_stored_field_boundary)>0 OR
   (SELECT snapshots_with_blank_values FROM bps_stored_field_boundary)>0
   THEN 'BPS_STORED_FIELD_BOUNDARY_REVIEW_REQUIRED'
   ELSE 'NO_AGGREGATE_FIELD_CONTAMINATION_NOT_E2E' END,
 'appointments',(SELECT appointments FROM scheduler_audit),
 'recurring_occurrences',(SELECT recurring_occurrences FROM scheduler_audit),
 'recurring_without_chart_id',(SELECT recurring_without_chart_id FROM scheduler_audit),
 'recurring_series',(SELECT recurring_series FROM scheduler_audit),
 'invalid_appointment_intervals',(SELECT invalid_intervals FROM scheduler_audit),
 'assessment_assignments',(SELECT assignments FROM assignment_audit),
 'connected_assignment_responses',(SELECT connected_responses FROM assignment_audit),
 'availability_rules',(SELECT availability_rules FROM assignment_audit),
 'authenticated_clinical_bps_end_to_end','UNVERIFIED',
 'interactive_scheduler_mfa','UNVERIFIED',
 'recipient_assessment_completion','UNVERIFIED'
) AS acceptance_snapshot;
