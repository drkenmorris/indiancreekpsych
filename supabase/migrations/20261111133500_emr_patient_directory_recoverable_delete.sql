-- Directory deletion is reversible and preserves all patient-linked records.
alter table public.clinical_patients
 add column directory_deleted_at timestamptz;
