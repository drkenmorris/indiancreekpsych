-- Reversible patient directory removal preserves historical BPS reviews but must
-- prevent new clinician-reviewed snapshots for archived or relinked charts.
-- Enforce at the database insert boundary even for a direct, MFA-protected RPC.
-- No existing patient or review records are modified.
create function public.require_active_bps_review_chart()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if not exists (
  select 1 from public.clinical_patients
   where id=new.patient_id and account_id=new.source_account_id
    and directory_deleted_at is null
 ) then
  raise exception 'BPS review requires an active, explicitly linked central patient chart'
   using errcode='22023';
 end if;
 return new;
end $$;
revoke all on function public.require_active_bps_review_chart() from public,anon,authenticated;
create trigger emr_bps_active_chart_required
 before insert on public.emr_bps_intake_reviews
 for each row execute function public.require_active_bps_review_chart();
