-- Additive fail-closed clinician-review provenance gate.
-- The protected HTTP API already rejects a submitted intake edited after the
-- patient submission receipt. Enforce the same rule for a direct, MFA-verified
-- call to the SECURITY DEFINER review RPC. No existing record is rewritten.
-- Preserve the active-chart/account boundary and current source version checks.
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
 if source.status='submitted' and source.submitted_at is null then
  raise exception 'Submitted BPS source lacks a verified intake submission receipt'
   using errcode='22023';
 end if;
 if source.status='submitted' and source.updated_at > source.submitted_at then
  raise exception 'Submitted BPS source was modified after its attested submission receipt'
   using errcode='22023';
 end if;
 return new;
end $$;
-- The existing BEFORE INSERT trigger calls this function; do not recreate
-- it or alter its owner, grants, RLS, or previously saved clinical snapshots.
