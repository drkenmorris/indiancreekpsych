-- Read-only release preflight. Run on a proven nonproduction target before
-- authenticating fictional users. A missing/false row blocks hosted acceptance.
-- No clinical rows, credentials, or writes. Not a substitute for interactive E2E.
-- Policy presence is insufficient if row security is disabled or the policy does
-- not apply to the authenticated role; a named constraint may intentionally be
-- NOT VALID for historical rows, while still enforcing every new write.
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
      and pg_get_constraintdef(oid) like '%source_submitted_at%'
      and pg_get_constraintdef(oid) like '%source_status%'
  )
  union all select 'bps_structured_trauma_boundary', exists (
    select 1 from pg_constraint
    where conrelid=to_regclass('public.emr_bps_intake_reviews')
      and conname='emr_bps_snapshots_exclude_structured_trauma' and contype='c'
      and pg_get_constraintdef(oid) like '%clinical_answers%'
      and pg_get_constraintdef(oid) like '%trauma_history%'
  )
  union all select 'appointment_patient_row_scope', exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='appointments'
      and policyname='appointments_patient_security' and permissive='RESTRICTIVE'
      and cmd='ALL' and 'authenticated'=any(roles)
      and exists (select 1 from pg_class c where c.oid=to_regclass('public.appointments') and c.relrowsecurity)
      and coalesce(qual,'') like '%patient_id%' and coalesce(qual,'') like '%uid()%'
      and coalesce(with_check,'') like '%patient_id%' and coalesce(with_check,'') like '%uid()%'
      and coalesce(qual,'') like '%patient_secure_session%'
      and coalesce(with_check,'') like '%patient_secure_session%'
  )
  union all select 'scheduler_four_admin_mfa_policies', (
    select count(*)=4 from pg_policies p
    where schemaname='public' and permissive='RESTRICTIVE' and cmd='ALL'
      and 'authenticated'=any(roles)
      and exists (select 1 from pg_class c where c.oid=to_regclass(format('%I.%I',p.schemaname,p.tablename)) and c.relrowsecurity)
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
      and p.prosecdef
      and has_function_privilege('authenticated',p.oid,'EXECUTE')
      and not has_function_privilege('anon',p.oid,'EXECUTE')
      and exists (select 1 from pg_class c where c.oid=to_regclass('public.emr_bps_intake_reviews') and c.relrowsecurity)
      and not coalesce(has_table_privilege('authenticated',to_regclass('public.emr_bps_intake_reviews'),'INSERT,UPDATE,DELETE'),true)
      and exists (select 1 from pg_trigger t where t.tgrelid=to_regclass('public.emr_bps_intake_reviews')
        and t.tgname='emr_bps_active_chart_required' and t.tgenabled in ('O','A') and not t.tgisinternal)
  )
)
select gate, passed from checks order by gate;
