create index clinical_patients_entered_by_idx on public.clinical_patients(entered_by);
create index dsm_records_owner_updated_idx on public.dsm_records(owner_id,updated_at desc);
create index dsm_versions_owner_idx on public.dsm_record_versions(owner_id);
create index clinical_revisions_actor_idx on public.clinical_patient_revisions(actor_id);
