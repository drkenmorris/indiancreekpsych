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
    patient_id uuid,status text,updated_at timestamptz,submitted_at timestamptz);
   create table public.emr_bps_intake_reviews(reviewed boolean);
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
  assert.equal(clear.clinical_chart_link_aggregate_status,'NO_AGGREGATE_LINK_ANOMALY_NOT_E2E');
  assert.equal(clear.authenticated_clinical_bps_end_to_end,'UNVERIFIED');
  // Querying the report itself must not create clinician records or write appointments.
  assert.equal((await db.query('select count(*)::integer as n from public.emr_bps_intake_reviews')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::integer as n from public.appointments')).rows[0].n,0);
 }finally{await db.close();}
});
