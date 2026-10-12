-- Phase 2 (activate only after the new client has been deployed).
-- Reject newly submitted records that omit the release's signed-document revision.
-- Existing already-submitted records are not touched.
create or replace function private.require_intake_legal_packet_revision()
returns trigger language plpgsql set search_path=''
as $body$
begin
 if new.status='submitted'
  and coalesce(new.answers->>'legal_packet_version','')<>'2026-10-11'
 then
  raise exception 'The current patient legal packet must be reviewed and signed before submission';
 end if;
 return new;
end
$body$;

revoke all on function private.require_intake_legal_packet_revision() from public,anon,authenticated;

create trigger require_legal_revision_patient
 before insert or update of status on public.patient_intakes
 for each row execute function private.require_intake_legal_packet_revision();

create trigger require_legal_revision_kiosk
 before insert or update of status on private.kiosk_patient_intakes
 for each row execute function private.require_intake_legal_packet_revision();
