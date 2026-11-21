-- Enforce at the database insert boundary the same patient-attestation rule
-- already required by the protected BPS HTTP API. A draft intake must NOT
-- retain a final submission receipt; otherwise an MFA-authorized direct RPC
-- could persist a misleading clinician-reviewed snapshot from contradictory
-- patient provenance. This is additive; no historical rows, source intakes,
-- appointments, grants, MFA settings or RLS policies are modified.
create or replace function public.require_active_bps_review_chart()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
 source public.patient_intakes%rowtype;
begin
 if not exists (
  select 1 from public.clinical_patients
   where id=new.patient_id and account_id=new.source_account_id
    and directory_deleted_at is null
 ) then
  raise exception 'BPS review requires an active, explicitly linked central patient chart'
   using errcode='22023';
 end if;
 select * into source from public.patient_intakes where patient_id=new.source_account_id;
 if not found or source.version is distinct from new.source_version
  or source.status is distinct from new.source_status
  or source.updated_at is distinct from new.source_updated_at then
  raise exception 'BPS review requires the current, explicitly linked intake source'
   using errcode='22023';
 end if;
 if source.status='draft' and source.submitted_at is not null then
  raise exception 'Draft BPS source cannot retain a final patient submission attestation'
   using errcode='22023';
 end if;
 if source.status='submitted' and source.submitted_at is null then
  raise exception 'Submitted BPS source lacks a verified intake submission receipt'
   using errcode='22023';
 end if;
 if source.status='submitted' and source.updated_at > source.submitted_at then
  raise exception 'Submitted BPS source was modified after its attested submission receipt'
   using errcode='22023';
 end if;
 if source.status='submitted' and
  (new.created_at is null or new.created_at < source.submitted_at) then
  raise exception 'Clinician BPS review cannot predate patient submission attestation'
   using errcode='22023';
 end if;
 return new;
end $$;
-- Existing BEFORE INSERT trigger emr_bps_active_chart_required calls this function.
