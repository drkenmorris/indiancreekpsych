-- Additive source revision: six-tier adult assignments; preserve every existing /1 source and result.
create function private.dsm_answer_valid(q jsonb,v text) returns boolean language plpgsql stable set search_path='' as $$
begin
 if q->>'kind'='text' then return char_length(v)<=2000;
 elsif q->>'kind'='date' then
  if v='' then return true;end if;
  if v !~ '^\d{4}-\d{2}-\d{2}$' then return false;end if;
  begin return to_char(v::date,'YYYY-MM-DD')=v and v::date<=(now() at time zone 'America/Chicago')::date;exception when others then return false;end;
 end if;
 return coalesce((q->'choices') ? v,false);
end $$;
revoke all on function private.dsm_answer_valid(jsonb,text) from public,anon;
grant execute on function private.dsm_answer_valid(jsonb,text) to authenticated;
create or replace function private.guard_dsm_assignment_source() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.dsm_source is distinct from old.dsm_source or new.dsm_source_hash is distinct from old.dsm_source_hash then raise exception 'DSM source is immutable';end if;
 elsif new.test_key='dsm' then
  if new.dsm_source is null or coalesce(new.dsm_source->>'format','') not in ('icps-dsm-recipient/1','icps-dsm-recipient/2') or new.dsm_source->>'version' is distinct from new.dsm_version or jsonb_typeof(new.dsm_source->'questions') is distinct from 'array' or jsonb_array_length(new.dsm_source->'questions') not between 60 and 2000 then raise exception 'DSM patient, version and questionnaire source required';end if;
 end if;return new;
end $$;
create or replace function private.guard_dsm_assignment_response() returns trigger language plpgsql set search_path='' as $$
declare a public.psych_test_assignments;qs jsonb;n integer;
begin
 select * into a from public.psych_test_assignments where id=new.assignment_id;
 if not found or a.dsm_source is null then raise exception 'DSM source unavailable';end if;
 if tg_op='INSERT' then
  if new.revision<>0 or new.answers<>'{}'::jsonb or new.page<>0 or new.status<>'draft' or new.identity_confirmed then raise exception 'Start with an empty response record';end if;new.created_at=now();
 else
  if old.status='submitted' or new.revision<>old.revision+1 or new.assignment_id<>old.assignment_id or new.respondent_id<>old.respondent_id or new.created_at<>old.created_at then raise exception 'Submitted response or identity cannot be changed';end if;
  if not new.identity_confirmed then raise exception 'Confirm the named respondent';end if;
 end if;
 select jsonb_agg(q) into qs from private.dsm_required_questions(a.dsm_source,new.answers) q;n=jsonb_array_length(qs);
 if new.page<0 or new.page>=(n+6)/7 then raise exception 'Invalid questionnaire page';end if;
 if exists(select 1 from jsonb_each(new.answers) e where jsonb_typeof(e.value)<>'string' or not exists(select 1 from jsonb_array_elements(qs) q where q->>'id'=e.key and private.dsm_answer_valid(q,e.value#>>'{}'))) then raise exception 'Unknown question, invalid answer or unselected follow-up';end if;
 if exists(select 1 from jsonb_array_elements(qs) with ordinality q(value,pos) where q.pos<=new.page*7 and not coalesce((q.value->>'optional')::boolean,false) and not(new.answers ? (q.value->>'id'))) then raise exception 'Answer earlier pages before advancing';end if;
 if new.status='submitted' then
  if exists(select 1 from jsonb_array_elements(qs) q where not coalesce((q->>'optional')::boolean,false) and not(new.answers ? (q->>'id'))) then raise exception 'Answer every selected question before submitting';end if;new.submitted_at=now();
 else new.submitted_at=null;end if;
 new.answered_count=(select count(*) from jsonb_object_keys(new.answers));new.updated_at=now();return new;
end $$;
