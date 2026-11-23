import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';

const auditSql=readFileSync(new URL('../scripts/emr-release-readiness.sql',import.meta.url),'utf8');

// Isolated in-memory PostgreSQL fixture. Never connects to a hosted Supabase
// database, sends an assessment invitation, or creates a clinical review.
test('read-only release audit identifies ambiguous central-chart links and clears only real fixes',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`
   create schema supabase_migrations;
   create table supabase_migrations.schema_migrations(version text primary key);
   create table public.clinical_patients(
    id uuid primary key,account_id uuid,directory_deleted_at timestamptz);
   create table public.patient_intakes(
    patient_id uuid,status text,version integer,updated_at timestamptz,submitted_at timestamptz);
   create table public.emr_bps_intake_reviews(
    patient_id uuid,owner_id uuid,source_account_id uuid,source_version integer,
    source_status text,source_updated_at timestamptz,reviewed boolean,
    created_at timestamptz,clinician_notes jsonb,clinical_answers jsonb);
   create table public.appointments(
    series_id uuid,patient_id uuid,starts_at timestamptz,ends_at timestamptz);
   create table public.psych_test_assignments(id uuid);
   create table public.connected_assignment_responses(id uuid);
   create table public.appointment_availability_rules(id uuid);
   insert into public.clinical_patients(id,account_id) values
    ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201'),
    ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000202'),
    ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000202');
   insert into public.patient_intakes(patient_id,status,updated_at,submitted_at) values
    ('00000000-0000-4000-8000-000000000201','submitted','2026-11-01','2026-11-02'),
    ('00000000-0000-4000-8000-000000000202','submitted','2026-11-01','2026-11-02'),
    ('00000000-0000-4000-8000-000000000203','submitted','2026-11-01','2026-11-02');
  `);
  const run=async()=> (await db.query(auditSql)).rows[0].acceptance_snapshot;
  const flagged=await run();
  assert.equal(flagged.submitted_intakes_with_exactly_one_active_chart,1);
  assert.equal(flagged.submitted_intakes_with_multiple_active_charts,1);
  assert.equal(flagged.submitted_intakes_without_active_chart,1);
  assert.equal(flagged.duplicate_active_account_chart_links,1);
  // Cardinality must be enforced in the receipted source count as well:
  // an intake with two live clinical charts must not count as link-verified.
  assert.equal(flagged.intake_linked_submitted_receipted,1);
  assert.equal(flagged.clinical_chart_link_aggregate_status,'CHART_LINK_REVIEW_REQUIRED');
  assert.equal(flagged.authenticated_clinical_bps_end_to_end,'UNVERIFIED');

  // Correct only fictional fixture rows, then prove the warning clears.
  await db.exec(`
   update public.clinical_patients
      set directory_deleted_at='2026-11-03'
      where id='00000000-0000-4000-8000-000000000103';
   insert into public.clinical_patients(id,account_id) values
    ('00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000203');
  `);
  const clear=await run();
  assert.equal(clear.submitted_intakes_with_exactly_one_active_chart,3);
  assert.equal(clear.submitted_intakes_with_multiple_active_charts,0);
  assert.equal(clear.submitted_intakes_without_active_chart,0);
  assert.equal(clear.duplicate_active_account_chart_links,0);
  assert.equal(clear.intake_linked_submitted_receipted,3);
  assert.equal(clear.submitted_intakes_missing_receipt,0);
  assert.equal(clear.submitted_intakes_invalid_receipt_chronology,0);
  assert.equal(clear.intake_submission_receipt_aggregate_status,'NO_AGGREGATE_RECEIPT_ANOMALY_NOT_E2E');
  assert.equal(clear.clinical_chart_link_aggregate_status,'NO_AGGREGATE_LINK_ANOMALY_NOT_E2E');
  assert.equal(clear.authenticated_clinical_bps_end_to_end,'UNVERIFIED');

  // A unique chart alone never validates an absent or chronologically stale
  // submission receipt. Isolated fictional data; no clinician review created.
  await db.exec(`
   insert into public.clinical_patients(id,account_id) values
    ('00000000-0000-4000-8000-000000000105','00000000-0000-4000-8000-000000000205'),
    ('00000000-0000-4000-8000-000000000106','00000000-0000-4000-8000-000000000206');
   insert into public.patient_intakes(patient_id,status,updated_at,submitted_at) values
    ('00000000-0000-4000-8000-000000000205','submitted','2026-11-03',null),
    ('00000000-0000-4000-8000-000000000206','submitted','2026-11-04','2026-11-02');
  `);
  const unreceipted=await run();
  assert.equal(unreceipted.submitted_intakes_with_exactly_one_active_chart,5);
  assert.equal(unreceipted.intake_linked_submitted_receipted,3);
  assert.equal(unreceipted.submitted_intakes_missing_receipt,1);
  assert.equal(unreceipted.submitted_intakes_invalid_receipt_chronology,1);
  assert.equal(unreceipted.intake_submission_receipt_aggregate_status,'SUBMISSION_RECEIPT_REVIEW_REQUIRED');
  // A receipt anomaly is independent of the cardinality check and cannot be
  // dismissed because each fictional account has exactly one chart.
  assert.equal(unreceipted.clinical_chart_link_aggregate_status,'NO_AGGREGATE_LINK_ANOMALY_NOT_E2E');
  assert.equal(unreceipted.authenticated_clinical_bps_end_to_end,'UNVERIFIED');
  assert.equal(unreceipted.reviewed_bps_rows_matching_current_intake_provenance,0);
  assert.equal(unreceipted.reviewed_bps_source_aggregate_status,'NO_MATCHED_REVIEW_SNAPSHOT_NOT_E2E');

  // Synthetic rows prove that merely setting reviewed=true does not count a
  // stale or draft intake source as a provenance-matched review.
  await db.exec(`
   update public.patient_intakes set version=1
    where patient_id in ('00000000-0000-4000-8000-000000000201',
                         '00000000-0000-4000-8000-000000000202');
   insert into public.emr_bps_intake_reviews
    (patient_id,owner_id,source_account_id,source_version,source_status,source_updated_at,reviewed,created_at,clinician_notes)
   values
    ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000901',
     '00000000-0000-4000-8000-000000000201',1,'submitted','2026-11-01',true,'2026-11-03',
     '{"presenting":"Fictional clinician observation","treatment":"","medical":"","safety":"","family":"","goals":"","limitations":""}'::jsonb),
    ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000901',
     '00000000-0000-4000-8000-000000000202',99,'draft','2026-11-01',true,'2026-11-03',
     '{"presenting":"Old unchecked narrative"}'::jsonb);
  `);
  const provenance=await run();
  assert.equal(provenance.clinician_bps_reviewed_flags,2);
  assert.equal(provenance.reviewed_bps_rows_matching_current_intake_provenance,1);
  assert.equal(provenance.reviewed_bps_rows_unverified_or_mismatched_provenance,1);
  assert.equal(provenance.reviewed_bps_rows_with_source_and_seven_domain_documentation_candidate,1);
  assert.equal(provenance.reviewed_bps_rows_with_source_but_incomplete_documentation,0);
  assert.equal(provenance.reviewed_bps_source_aggregate_status,'REVIEW_PROVENANCE_INVESTIGATION_REQUIRED');
  assert.equal(provenance.authenticated_clinical_bps_end_to_end,'UNVERIFIED');

  // Strict storage segregation: independently audit historical general BPS
  // JSON fields, not just the source API projection. All records are fictional.
  const cleanStorage=await run();
  assert.equal(cleanStorage.bps_stored_snapshots_with_unapproved_fields,0);
  assert.equal(cleanStorage.bps_stored_snapshots_with_structured_trauma,0);
  assert.equal(cleanStorage.bps_stored_snapshots_with_malformed_field_shape,0);
  assert.equal(cleanStorage.bps_stored_snapshots_with_non_text_values,0);
  assert.equal(cleanStorage.bps_stored_snapshots_with_blank_values,0);
  assert.equal(cleanStorage.bps_stored_field_boundary_status,'NO_AGGREGATE_FIELD_CONTAMINATION_NOT_E2E');
  await db.exec(`
   update public.emr_bps_intake_reviews set clinical_answers=
     '{"counseling_reason":"Fictional symptom","trauma_history":{"note":"Fictional private trauma"}, "insurance_policy":"Fictional insurance"}'::jsonb
   where patient_id='00000000-0000-4000-8000-000000000101';`);
  const contaminatedStorage=await run();
  assert.equal(contaminatedStorage.bps_stored_snapshots_with_unapproved_fields,1);
  assert.equal(contaminatedStorage.bps_stored_snapshots_with_structured_trauma,1);
  assert.equal(contaminatedStorage.bps_stored_snapshots_with_malformed_field_shape,0);
  assert.equal(contaminatedStorage.bps_stored_field_boundary_status,'BPS_STORED_FIELD_BOUNDARY_REVIEW_REQUIRED');
  assert.equal(JSON.stringify(contaminatedStorage).includes('Fictional private trauma'),false);
  assert.equal(JSON.stringify(contaminatedStorage).includes('Fictional insurance'),false);
  await db.exec(`
   update public.emr_bps_intake_reviews set clinical_answers='["nonobject"]'::jsonb
   where patient_id='00000000-0000-4000-8000-000000000101';`);
  const malformedStorage=await run();
  assert.equal(malformedStorage.bps_stored_snapshots_with_unapproved_fields,0);
  assert.equal(malformedStorage.bps_stored_snapshots_with_structured_trauma,0);
  assert.equal(malformedStorage.bps_stored_snapshots_with_malformed_field_shape,1);
  assert.equal(malformedStorage.bps_stored_snapshots_with_non_text_values,0);
  assert.equal(malformedStorage.bps_stored_field_boundary_status,'BPS_STORED_FIELD_BOUNDARY_REVIEW_REQUIRED');
  // Recognized clinical keys must contain patient-authored text, not nested
  // JSON. A key-only allowlist would incorrectly approve this stored payload.
  await db.exec(`
   update public.emr_bps_intake_reviews set clinical_answers=
     '{"counseling_reason":{"injected":"Fictional structured payload"}}'::jsonb
   where patient_id='00000000-0000-4000-8000-000000000101';`);
  const structuredValue=await run();
  assert.equal(structuredValue.bps_stored_snapshots_with_unapproved_fields,0);
  assert.equal(structuredValue.bps_stored_snapshots_with_malformed_field_shape,0);
  assert.equal(structuredValue.bps_stored_snapshots_with_non_text_values,1);
  assert.equal(structuredValue.bps_stored_field_boundary_status,'BPS_STORED_FIELD_BOUNDARY_REVIEW_REQUIRED');
  assert.equal(JSON.stringify(structuredValue).includes('Fictional structured payload'),false);
  // A whitespace-only string also cannot qualify as a saved clinical answer.
  await db.exec(`
   update public.emr_bps_intake_reviews set clinical_answers=
     '{"counseling_reason":"   "}'::jsonb
   where patient_id='00000000-0000-4000-8000-000000000101';`);
  const blankValue=await run();
  assert.equal(blankValue.bps_stored_snapshots_with_unapproved_fields,0);
  assert.equal(blankValue.bps_stored_snapshots_with_non_text_values,0);
  assert.equal(blankValue.bps_stored_snapshots_with_blank_values,1);
  assert.equal(blankValue.bps_stored_field_boundary_status,'BPS_STORED_FIELD_BOUNDARY_REVIEW_REQUIRED');
  await db.exec(`
   update public.emr_bps_intake_reviews set clinical_answers=
     '{"counseling_reason":"Fictional safe clinical answer"}'::jsonb
   where patient_id='00000000-0000-4000-8000-000000000101';`);
  const repairedStorage=await run();
  assert.equal(repairedStorage.bps_stored_snapshots_with_unapproved_fields,0);
  assert.equal(repairedStorage.bps_stored_snapshots_with_structured_trauma,0);
  assert.equal(repairedStorage.bps_stored_snapshots_with_malformed_field_shape,0);
  assert.equal(repairedStorage.bps_stored_snapshots_with_non_text_values,0);
  assert.equal(repairedStorage.bps_stored_snapshots_with_blank_values,0);
  assert.equal(repairedStorage.bps_stored_field_boundary_status,'NO_AGGREGATE_FIELD_CONTAMINATION_NOT_E2E');

  // A legitimate source pointer is not evidence of a complete seven-domain
  // clinician history. A single old clinical note remains unqualified.
  await db.exec(`
   update public.emr_bps_intake_reviews set
     source_version=1,source_status='submitted'
   where patient_id='00000000-0000-4000-8000-000000000102';`);
  const partial=await run();
  assert.equal(partial.reviewed_bps_rows_matching_current_intake_provenance,2);
  assert.equal(partial.reviewed_bps_rows_with_source_and_seven_domain_documentation_candidate,1);
  assert.equal(partial.reviewed_bps_rows_with_source_but_incomplete_documentation,1);
  assert.equal(partial.reviewed_bps_source_aggregate_status,'REVIEW_DOCUMENTATION_INVESTIGATION_REQUIRED');

  // The complete seven-domain note structure and one independent observation
  // qualify as an AUDIT CANDIDATE, never as authenticated production E2E.
  await db.exec(`
   update public.emr_bps_intake_reviews set clinician_notes=
    '{"presenting":"","treatment":"","medical":"","safety":"","family":"","goals":"Fictional clinical follow-up","limitations":""}'::jsonb
   where patient_id='00000000-0000-4000-8000-000000000102';`);
  const documented=await run();
  assert.equal(documented.reviewed_bps_rows_with_source_and_seven_domain_documentation_candidate,2);
  assert.equal(documented.reviewed_bps_rows_with_source_but_incomplete_documentation,0);
  assert.equal(documented.reviewed_bps_source_aggregate_status,'MATCHED_SOURCE_DOCUMENTATION_CANDIDATES_NOT_AUTHENTICATED_E2E');
  assert.equal(documented.authenticated_clinical_bps_end_to_end,'UNVERIFIED');

  // Backdated reviews preceding the actual patient submission must fail
  // the provenance gate even if their version, owner, and notes match.
  await db.exec(`
   update public.emr_bps_intake_reviews set created_at='2026-11-01'
   where patient_id='00000000-0000-4000-8000-000000000102';`);
  const backdated=await run();
  assert.equal(backdated.reviewed_bps_rows_unverified_or_mismatched_provenance,1);
  assert.equal(backdated.reviewed_bps_rows_with_source_and_seven_domain_documentation_candidate,1);
  assert.equal(backdated.reviewed_bps_source_aggregate_status,'REVIEW_PROVENANCE_INVESTIGATION_REQUIRED');

  // Unknown note keys and blank seven-domain payloads must not elevate a
  // reviewed checkbox to audit-eligible clinical documentation.
  await db.exec(`
   update public.emr_bps_intake_reviews set created_at='2026-11-03',
     clinician_notes='{"presenting":"Fictional note","treatment":"","medical":"","safety":"","family":"","goals":"","limitations":"","unapproved":"Do not leak"}'::jsonb
   where patient_id='00000000-0000-4000-8000-000000000102';`);
  const unknownKey=await run();
  assert.equal(unknownKey.reviewed_bps_rows_with_source_but_incomplete_documentation,1);
  assert.equal(unknownKey.reviewed_bps_source_aggregate_status,'REVIEW_DOCUMENTATION_INVESTIGATION_REQUIRED');
  assert.equal(JSON.stringify(unknownKey).includes('Do not leak'),false);
  await db.exec(`
   update public.emr_bps_intake_reviews set
     clinician_notes='{"presenting":"","treatment":"","medical":"","safety":"","family":"","goals":"","limitations":""}'::jsonb
   where patient_id='00000000-0000-4000-8000-000000000102';`);
  const blank=await run();
  assert.equal(blank.reviewed_bps_rows_with_source_but_incomplete_documentation,1);
  assert.equal(blank.authenticated_clinical_bps_end_to_end,'UNVERIFIED');
  // An MFA policy with the expected NAME but a permissive/always-true
  // predicate must never be reported as a structurally valid AAL2 gate.
  await db.exec(`
   create role authenticated;
   create schema private;
   create schema auth;
   create table public.appointment_settings(id integer);
   create table public.appointment_blocks(id integer);
   create function private.current_user_is_admin() returns boolean
     language sql stable as 'select false';
   create function auth.jwt() returns jsonb
     language sql stable as 'select ''{}''::jsonb';
  `);
  const mfaPolicies=[
   ['appointment_settings','appointment_settings_admin_mfa_gate'],
   ['appointment_availability_rules','availability_rules_admin_mfa_gate'],
   ['appointment_blocks','appointment_blocks_admin_mfa_gate'],
   ['appointments','appointments_admin_mfa_gate']
  ];
  for(const [table,name] of mfaPolicies){
   await db.exec(`alter table public.${table} enable row level security;
     create policy ${name} on public.${table} as permissive
      for all to authenticated using(true) with check(true);`);
  }
  const weak=await run();
  assert.equal(weak.scheduler_admin_mfa_policies_installed,4);
  assert.equal(weak.scheduler_admin_mfa_policies_structurally_valid,0);
  assert.equal(weak.scheduler_admin_mfa_policies_invalid_structure.length,4);
  assert.equal(weak.scheduler_admin_mfa_policy_metadata_status,'ADMIN_MFA_POLICY_STRUCTURE_REVIEW_REQUIRED');
  // Pre-migration permissive admin policies may reach direct-table requests
  // without an explicit AAL2 guard. Identify the risk BEFORE the new restrictive
  // gate is installed; metadata alone never proves an authenticated bypass.
  await db.exec(`
   create policy appointment_blocks_legacy_admin on public.appointment_blocks
     as permissive for all to authenticated
     using(private.current_user_is_admin())
     with check(private.current_user_is_admin());
   create policy appointment_settings_legacy_admin on public.appointment_settings
     as permissive for update to authenticated
     using(private.current_user_is_admin())
     with check(private.current_user_is_admin());
  `);
  const preMigration=await run();
  assert.equal(preMigration.scheduler_admin_policies_without_visible_aal2_guard_candidate_count,2);
  assert.equal(preMigration.scheduler_tables_with_candidate_admin_mfa_gap,2);
  assert.deepEqual(preMigration.scheduler_candidate_admin_mfa_gap_policy_names,[
    'appointment_blocks.appointment_blocks_legacy_admin',
    'appointment_settings.appointment_settings_legacy_admin'
  ]);
  assert.equal(preMigration.scheduler_candidate_admin_mfa_gap_evidence,
    'STATIC_POLICY_METADATA_ONLY_NOT_AUTHENTICATED_RUNTIME_PROOF');
  for(const [table,name] of mfaPolicies){
   await db.exec(`drop policy ${name} on public.${table};
    create policy ${name} on public.${table} as restrictive
     for all to authenticated
     using(not (select private.current_user_is_admin()) or (select auth.jwt()->>'aal')='aal2')
     with check(not (select private.current_user_is_admin()) or (select auth.jwt()->>'aal')='aal2');`);
  }
  const correctlyScoped=await run();
  assert.equal(correctlyScoped.scheduler_admin_mfa_policies_installed,4);
  assert.equal(correctlyScoped.scheduler_admin_mfa_policies_structurally_valid,4);
  assert.deepEqual(correctlyScoped.scheduler_admin_mfa_policies_invalid_structure,[]);
  assert.equal(correctlyScoped.scheduler_admin_mfa_policy_metadata_status,'POLICY_METADATA_MATCHES_NOT_AUTHENTICATED_E2E');
  assert.equal(correctlyScoped.scheduler_admin_policies_without_visible_aal2_guard_candidate_count,0,
    'Restrictive AAL2 guards must remove the candidate legacy-admin direct access risk');
  assert.equal(correctlyScoped.scheduler_tables_with_candidate_admin_mfa_gap,0);
  assert.deepEqual(correctlyScoped.scheduler_candidate_admin_mfa_gap_policy_names,[]);
  await db.exec('alter table public.appointments disable row level security;');
  const disabled=await run();
  assert.equal(disabled.scheduler_admin_mfa_policies_structurally_valid,3);
  assert.deepEqual(disabled.scheduler_admin_mfa_policies_invalid_structure,['appointments_admin_mfa_gate']);
  assert.equal(disabled.scheduler_admin_mfa_policy_metadata_status,'ADMIN_MFA_POLICY_STRUCTURE_REVIEW_REQUIRED');
  // Even perfect policy metadata is not proof of an authenticated browser
  // session, clinical save/readback, or effective JWT enforcement.
  assert.equal(correctlyScoped.interactive_scheduler_mfa,'UNVERIFIED');
  // Querying the report itself must not create clinician records or write appointments.
  assert.equal((await db.query('select count(*)::integer as n from public.emr_bps_intake_reviews')).rows[0].n,2);
  assert.equal((await db.query('select count(*)::integer as n from public.appointments')).rows[0].n,0);
 }finally{await db.close();}
});
