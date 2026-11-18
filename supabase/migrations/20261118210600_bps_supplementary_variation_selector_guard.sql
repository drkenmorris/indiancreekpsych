-- Supplementary Unicode variation selectors U+E0100 through U+E01EF are also
-- invisible formatting marks, not clinical documentation on their own.
-- Reaffirm the existing insert trigger without modifying any stored patient records.
-- The PostgreSQL Unicode regex was confirmed by read-only production SELECT.
-- Additional fail-closed clinical attestation guard for format-only Unicode variation selectors.
-- The existing trigger invokes this function; no data, clinical rows or permissions are changed.
-- Additive defense in depth: invisible formatting marks and Unicode variation selectors alone cannot
-- satisfy independent clinical documentation in an append-only BPS review.
-- Preserve the original note text and all historical records unchanged.
-- The existing insert trigger calls this function, so it requires no replacement.
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
       and regexp_replace(translate(note.value, U&'\00AD\034F\061C\180E\200B\200C\200D\200E\200F\202A\202B\202C\202D\202E\2060\2061\2062\2063\2064\2065\2066\2067\2068\2069\206A\206B\206C\206D\206E\206F\FE00\FE01\FE02\FE03\FE04\FE05\FE06\FE07\FE08\FE09\FE0A\FE0B\FE0C\FE0D\FE0E\FE0F\FEFF', ''), U&'[\+0E0100-\+0E01EF]', '', 'g') ~ '[^[:space:]]'
     )
  then
    raise exception 'Document an independent clinician observation or follow-up need before BPS review attestation'
      using errcode = '22023';
  end if;
  return new;
end $$;
