-- A central chart can be explicitly re-linked to a different website patient account.
-- Preserve earlier immutable reviews under their original source_account_id, while
-- permitting a new clinician review of the newly linked account's own version 1.
-- Existing review rows and source provenance are never rewritten or deleted.
alter table public.emr_bps_intake_reviews
 drop constraint emr_bps_intake_reviews_owner_id_patient_id_source_version_key;

alter table public.emr_bps_intake_reviews
 add constraint emr_bps_reviews_owner_patient_account_version_key
 unique(owner_id, patient_id, source_account_id, source_version);
