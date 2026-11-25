-- Aggregate-only, read-only forward migration data preflight.
-- Never output identifiers, answers, notes or patient names.
-- Historical anomalies are investigation signals, not permission to repair rows.
-- Compare counts across a quiescent isolated upgrade; live counts can change legitimately.
select 'intakes_total' as metric,count(*) as value from public.patient_intakes
union all select 'submitted_intakes',count(*) from public.patient_intakes where status='submitted'
union all select 'submitted_invalid_receipt',count(*) from public.patient_intakes where status='submitted' and (submitted_at is null or updated_at>submitted_at)
union all select 'draft_invalid_receipt',count(*) from public.patient_intakes where status='draft' and submitted_at is not null
union all select 'intakes_nonobject_answers',count(*) from public.patient_intakes where jsonb_typeof(answers) is distinct from 'object'
union all select 'submitted_active_chart_linked',count(*) from public.patient_intakes i where i.status='submitted' and exists (select 1 from public.clinical_patients p where p.account_id=i.patient_id and p.directory_deleted_at is null)
union all select 'bps_reviews_total',count(*) from public.emr_bps_intake_reviews
union all select 'bps_reviews_raw_trauma',count(*) from public.emr_bps_intake_reviews where clinical_answers ? 'trauma_history'
union all select 'bps_reviews_chart_link_mismatch',count(*) from public.emr_bps_intake_reviews r where not exists (select 1 from public.clinical_patients p where p.id=r.patient_id and p.account_id=r.source_account_id)
union all select 'appointments_total',count(*) from public.appointments
union all select 'appointments_recurring',count(*) from public.appointments where series_id is not null
union all select 'appointments_series',count(distinct series_id) from public.appointments
union all select 'appointments_without_account_id',count(*) from public.appointments where patient_id is null
union all select 'appointments_invalid_intervals',count(*) from public.appointments where starts_at is null or ends_at is null or ends_at<=starts_at
union all select 'availability_rules_total',count(*) from public.appointment_availability_rules
order by metric;
