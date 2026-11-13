-- Additive BPS review provenance guard. Existing patient intakes and immutable
-- clinician reviews are untouched. The original API validates submission
-- receipts when reading, but a direct privileged RPC must fail closed as well.
-- Extend the already-deployed active-chart trigger at the insert boundary.
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

 -- Never accept an unverified or stale source just because the caller presented
 -- a plausible version/status. The RPC still holds a source FOR SHARE lock.
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
 return new;
end $$;
-- Preserve the existing BEFORE INSERT trigger, grants, owner-only RLS, and all
-- previous reviews. This migration changes no stored records or accounts.
