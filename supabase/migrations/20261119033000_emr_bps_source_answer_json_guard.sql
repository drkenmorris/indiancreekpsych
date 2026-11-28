-- Additive fail-closed boundary for the atomic clinician BPS review.
-- The protected GET/POST API already rejects non-string patient answers, but
-- an authorized direct RPC/database insert must not bypass that schema check.
-- Never coerce malformed patient-reported JSON into a misleading blank summary.
-- No existing reviews, intakes, accounts, grants, schedules or MFA are changed.
create or replace function private.reject_malformed_bps_source_answers()
returns trigger
language plpgsql security definer set search_path=''
as $$
declare
 source_answers jsonb;
begin
 select answers into source_answers
 from public.patient_intakes
 where patient_id=new.source_account_id
 for share;
 if not found or jsonb_typeof(source_answers) is distinct from 'object' then
  raise exception 'BPS clinician review requires a valid flat patient answer object'
   using errcode='22023';
 end if;
 if exists (
  select 1 from jsonb_each(source_answers) as answer(key,value)
  where jsonb_typeof(answer.value) is distinct from 'string'
 ) then
  raise exception 'BPS clinician review requires string-valued patient answers'
   using errcode='22023';
 end if;
 return new;
end $$;

drop trigger if exists emr_bps_source_answer_json_required on public.emr_bps_intake_reviews;
create trigger emr_bps_source_answer_json_required
before insert on public.emr_bps_intake_reviews
for each row execute function private.reject_malformed_bps_source_answers();
