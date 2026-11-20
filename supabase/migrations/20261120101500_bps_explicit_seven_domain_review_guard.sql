-- Preserve the existing immutable clinical rows and all earlier Unicode,
-- invisible-only and control-character attestation rules. Update the existing
-- insert-trigger function only; never backfill or rewrite clinical history.
-- This enforces the same seven-domain contract for direct authenticated RPC
-- callers as for the protected clinician POST API.
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
       -- PostgreSQL [:space:] does not classify all Unicode format marks.
       -- Strip only for this nonblank test; do not mutate clinical note content.
       and regexp_replace(regexp_replace(translate(note.value, U&'\00AD\034F\061C\180E\200B\200C\200D\200E\200F\202A\202B\202C\202D\202E\2060\2061\2062\2063\2064\2065\2066\2067\2068\2069\206A\206B\206C\206D\206E\206F\FE00\FE01\FE02\FE03\FE04\FE05\FE06\FE07\FE08\FE09\FE0A\FE0B\FE0C\FE0D\FE0E\FE0F\FEFF', ''), U&'[\+0E0100-\+0E01EF]', '', 'g'), '[[:cntrl:]]', '', 'g') ~ '[^[:space:]]'
     )
  then
    raise exception 'Document an independent clinician observation or follow-up need before BPS review attestation'
      using errcode = '22023';
  end if;
  -- Explicit presence of all seven approved clinician-note domains is a
  -- clinical attestation boundary. A privileged direct RPC caller must not
  -- bypass the HTTP validation and turn a one-domain note into a seemingly
  -- completed seven-page BPS review by silently omitting blank domains.
  -- A deliberately blank domain is valid, but it must be present as a string.
  if (select count(*) from jsonb_object_keys(new.clinician_notes)) <> 7
     or exists (
       select 1 from jsonb_object_keys(new.clinician_notes) as domain(key)
       where domain.key not in (
         'presenting','treatment','medical','safety','family','goals','limitations'
       )
     )
  then
    raise exception 'All seven BPS clinician-note domains must be explicitly represented'
      using errcode = '22023';
  end if;
  return new;
end $;
