-- Require an independent clinician note before a version-locked, append-only
-- BPS review is attested. Defense in depth for direct authorized RPC callers;
-- previously stored patient/clinician evidence is preserved untouched.
-- This does not certify clinical accuracy, patient consent or a signed note.
create or replace function private.reject_undocumented_bps_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reviewed is distinct from true
     or jsonb_typeof(new.clinician_notes) is distinct from 'object'
     or not exists (
       select 1
       from jsonb_each_text(new.clinician_notes) as note(key, value)
       where note.key = any(array[
         'presenting','treatment','medical','safety','family','goals','limitations'
       ])
       -- Text made only of whitespace is not independent documentation.
       and note.value ~ '[^[:space:]]'
     )
  then
    raise exception 'Document an independent clinician observation or follow-up need before BPS review attestation'
      using errcode = '22023';
  end if;
  return new;
end $$;

create trigger emr_bps_review_requires_documented_note
before insert on public.emr_bps_intake_reviews
for each row execute function private.reject_undocumented_bps_review();
