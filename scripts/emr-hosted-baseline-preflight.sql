-- Hosted baseline parity guard (read-only). These relations and columns
-- were present on production main f6efd40065c2d961629cf8ac36ef07a050af786d
-- on 2026-11-25, but absent on the old hosted validation branch.
-- Run on any proposed hosted acceptance target BEFORE fictional sign-in.
-- All rows must pass; this is a minimum baseline, not full schema parity,
-- target identity proof, migration history reconciliation or functional E2E.
-- No clinical rows or credentials are read, and no database writes occur.
with required_relations(name) as (
  values
    ('emr_account_settings'),
    ('emr_diagnosis_catalog'),
    ('emr_diagnosis_versions'),
    ('emr_discharge_criteria_libraries'),
    ('emr_group_corpora'),
    ('emr_group_corpus_versions'),
    ('emr_homework_assignments'),
    ('emr_implemented_intervention_entries'),
    ('emr_individual_progress_note_revisions'),
    ('emr_modality_providers'),
    ('emr_treatment_approach_options'),
    ('emr_treatment_modalities'),
    ('emr_treatment_response_versions'),
    ('newsletter_article_schedule')
), required_columns(relation_name,column_name,data_type) as (
  values
    ('emr_group_individual_notes','encounter_at','timestamp with time zone'),
    ('emr_group_individual_notes','group_name','text'),
    ('patient_intakes','completed_pages','ARRAY'),
    ('psych_test_assignments','invitation_removed_at','timestamp with time zone')
), checks(gate,passed) as (
  select 'relation:' || r.name, exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=r.name and c.relkind in ('r','p')
  ) from required_relations r
  union all
  select 'column:' || r.relation_name || '.' || r.column_name, exists (
    select 1 from information_schema.columns c where c.table_schema='public'
      and c.table_name=r.relation_name and c.column_name=r.column_name
      and c.data_type=r.data_type
  ) from required_columns r
)
select gate,passed from checks order by gate;
