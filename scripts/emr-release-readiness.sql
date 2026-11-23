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
 mfa_audit AS (
  SELECT COUNT(installed.policyname)::integer AS installed,
   COALESCE(jsonb_agg(expected.policyname ORDER BY expected.policyname)
    FILTER (WHERE installed.policyname IS NULL),'[]'::jsonb) AS missing_policies
  FROM expected_mfa expected
  LEFT JOIN pg_policies installed
   ON installed.schemaname='public'
   AND installed.tablename=expected.tablename
   AND installed.policyname=expected.policyname
 ),
 intake_audit AS (
  SELECT COUNT(*)::integer AS total,
   COUNT(*) FILTER (WHERE i.status='submitted')::integer AS submitted,
   COUNT(*) FILTER (WHERE i.status='submitted' AND i.submitted_at IS NOT NULL
    AND i.updated_at<=i.submitted_at AND EXISTS (
     SELECT 1 FROM public.clinical_patients cp
     WHERE cp.account_id=i.patient_id AND cp.directory_deleted_at IS NULL
    ))::integer AS submitted_receipted_active_chart_links
  FROM public.patient_intakes i
 ),
 bps_audit AS (
  SELECT COUNT(*)::integer AS saved_review_rows,
   COUNT(*) FILTER (WHERE reviewed IS TRUE)::integer AS reviewed_flag_rows
  FROM public.emr_bps_intake_reviews
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
 'intake_total',(SELECT total FROM intake_audit),
 'intake_submitted',(SELECT submitted FROM intake_audit),
 'intake_linked_submitted_receipted',(SELECT submitted_receipted_active_chart_links FROM intake_audit),
 'clinician_bps_review_rows',(SELECT saved_review_rows FROM bps_audit),
 'clinician_bps_reviewed_flags',(SELECT reviewed_flag_rows FROM bps_audit),
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
