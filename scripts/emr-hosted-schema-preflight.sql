-- Read-only release preflight. Run on a proven nonproduction target before
-- authenticating fictional users. A missing/false row blocks hosted acceptance.
-- No clinical rows, credentials, or writes. Not a substitute for interactive E2E.
with checks(gate, passed) as (
  select 'bps_submission_receipt_column', exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='emr_bps_intake_reviews'
      and column_name='source_submitted_at' and data_type='timestamp with time zone'
  )
  union all select 'bps_submission_receipt_constraint', exists (
    select 1 from pg_constraint
    where conrelid=to_regclass('public.emr_bps_intake_reviews')
      and conname='emr_bps_snapshot_submission_receipt' and contype='c'
  )
  union all select 'bps_structured_trauma_boundary', exists (
    select 1 from pg_constraint
    where conrelid=to_regclass('public.emr_bps_intake_reviews')
      and conname='emr_bps_snapshots_exclude_structured_trauma' and contype='c'
  )
  union all select 'appointment_patient_row_scope', exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='appointments'
      and policyname='appointments_patient_security' and permissive='RESTRICTIVE'
      and cmd='ALL'
      and coalesce(qual,'') like '%patient_id%' and coalesce(qual,'') like '%uid()%'
      and coalesce(with_check,'') like '%patient_id%' and coalesce(with_check,'') like '%uid()%'
      and coalesce(qual,'') like '%patient_secure_session%'
      and coalesce(with_check,'') like '%patient_secure_session%'
  )
  union all select 'scheduler_four_admin_mfa_policies', (
    select count(*)=4 from pg_policies
    where schemaname='public' and permissive='RESTRICTIVE' and cmd='ALL'
      and (tablename,policyname) in (
        ('appointment_settings','appointment_settings_admin_mfa_gate'),
        ('appointment_availability_rules','availability_rules_admin_mfa_gate'),
        ('appointment_blocks','appointment_blocks_admin_mfa_gate'),
        ('appointments','appointments_admin_mfa_gate')
      )
      and coalesce(qual,'') like '%aal2%' and coalesce(with_check,'') like '%aal2%'
  )
  union all select 'bps_atomic_answer_and_receipt_rpc', exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='save_emr_bps_intake_review'
      and pg_get_function_identity_arguments(p.oid)='p_payload jsonb'
      and position('source_answers' in pg_get_functiondef(p.oid))>0
      and position('source_submitted_at' in pg_get_functiondef(p.oid))>0
  )
)
select gate, passed from checks order by gate;
