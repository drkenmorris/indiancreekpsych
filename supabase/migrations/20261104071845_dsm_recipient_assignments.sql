-- Additive DSM recipient workflow. Existing ASQ and clinician records retain their ACLs.
alter table public.psych_test_assignments add column dsm_source jsonb, add column dsm_source_hash text;
alter table public.psych_test_assignments drop constraint psych_assignment_asq_fields;
alter table public.psych_test_assignments add constraint psych_assignment_asq_fields check(
 (asq_role is null and asq_definition is null and asq_definition_hash is null and (patient_id is null or test_key='dsm')) or
 (test_key='asq' and patient_id is not null and asq_role in ('student','parent','teacher') and asq_definition is not null and asq_definition_hash ~ '^[a-f0-9]{64}$'));
alter table public.psych_test_assignments add constraint psych_assignment_dsm_fields check(
 (dsm_source is null and dsm_source_hash is null) or
 (test_key='dsm' and patient_id is not null and dsm_version is not null and jsonb_typeof(dsm_source)='object' and dsm_source_hash ~ '^[a-f0-9]{64}$'));
create function private.guard_dsm_assignment_source() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.dsm_source is distinct from old.dsm_source or new.dsm_source_hash is distinct from old.dsm_source_hash then raise exception 'DSM source is immutable';end if;
 elsif new.test_key='dsm' then
  if new.dsm_source is null or new.dsm_source->>'format' is distinct from 'icps-dsm-recipient/1' or new.dsm_source->>'version' is distinct from new.dsm_version or jsonb_typeof(new.dsm_source->'questions') is distinct from 'array' or jsonb_array_length(new.dsm_source->'questions') not between 60 and 2000 then raise exception 'DSM patient, version and questionnaire source required';end if;
 end if;return new;
end $$;
revoke all on function private.guard_dsm_assignment_source() from public,anon,authenticated;
create trigger guard_dsm_assignment_source before insert or update on public.psych_test_assignments for each row execute function private.guard_dsm_assignment_source();
-- Narrow definer lookup: current verified Auth email, not user-editable metadata or JWT email.
create function private.dsm_recipient_allowed(p_assignment uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (select auth.jwt()->>'aal')='aal2' and exists(
 select 1 from public.psych_test_assignments a join auth.users u on u.id=auth.uid()
 where a.id=p_assignment and a.test_key='dsm' and a.dsm_source is not null and a.status='sent' and a.expires_at>now() and lower(u.email)=a.recipient_email and u.email_confirmed_at is not null)
$$;
revoke all on function private.dsm_recipient_allowed(uuid) from public,anon;grant execute on function private.dsm_recipient_allowed(uuid) to authenticated;
create policy psych_dsm_recipient_read on public.psych_test_assignments for select to authenticated using(private.dsm_recipient_allowed(id));
-- Pure routing over the immutable assigned definition. Adult Tier 2 only follows positive Tier 1 domains.
create function private.dsm_required_questions(p_source jsonb,p_answers jsonb) returns setof jsonb language sql immutable set search_path='' as $$
 select q from jsonb_array_elements(p_source->'questions') q where q->>'tier'='1' or (
 not exists(select 1 from jsonb_array_elements(p_source->'questions') t where t->>'tier'='1' and not(p_answers ? (t->>'id'))) and
 exists(select 1 from jsonb_array_elements(p_source->'questions') t where t->>'tier'='1' and t->>'domain'=q->>'domain' and p_answers->>(t->>'id') in ('Yes, currently','Yes, in the past')))
$$;
revoke all on function private.dsm_required_questions(jsonb,jsonb) from public,anon;grant execute on function private.dsm_required_questions(jsonb,jsonb) to authenticated;
create table public.dsm_assignment_responses(
 assignment_id uuid primary key references public.psych_test_assignments(id),respondent_id uuid not null default auth.uid() references auth.users(id),
 answers jsonb not null default '{}' check(jsonb_typeof(answers)='object' and octet_length(answers::text)<300000),page integer not null default 0,
 status text not null default 'draft' check(status in ('draft','submitted')),answered_count integer not null default 0,revision integer not null default 0,identity_confirmed boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),submitted_at timestamptz);
create index dsm_assignment_respondent_idx on public.dsm_assignment_responses(respondent_id);
create table public.dsm_assignment_response_versions(
 assignment_id uuid not null references public.dsm_assignment_responses(assignment_id),revision integer not null,answers jsonb not null,page integer not null,status text not null,
 actor_id uuid not null references auth.users(id),created_at timestamptz not null default now(),primary key(assignment_id,revision));
create index dsm_assignment_version_actor_idx on public.dsm_assignment_response_versions(actor_id);
alter table public.dsm_assignment_responses enable row level security;alter table public.dsm_assignment_response_versions enable row level security;
revoke all on public.dsm_assignment_responses,public.dsm_assignment_response_versions from public,anon,authenticated;
grant select,insert on public.dsm_assignment_responses to authenticated;grant update(answers,page,status,revision,identity_confirmed) on public.dsm_assignment_responses to authenticated;grant select on public.dsm_assignment_response_versions to authenticated;
create policy dsm_response_read on public.dsm_assignment_responses for select to authenticated using(
 (respondent_id=(select auth.uid()) and private.dsm_recipient_allowed(assignment_id)) or
 ((select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin() and exists(select 1 from public.psych_test_assignments a where a.id=assignment_id and a.assigned_by=(select auth.uid()))));
create policy dsm_response_insert on public.dsm_assignment_responses for insert to authenticated with check(respondent_id=(select auth.uid()) and private.dsm_recipient_allowed(assignment_id));
create policy dsm_response_update on public.dsm_assignment_responses for update to authenticated using(respondent_id=(select auth.uid()) and private.dsm_recipient_allowed(assignment_id)) with check(respondent_id=(select auth.uid()) and private.dsm_recipient_allowed(assignment_id));
create policy dsm_response_version_read on public.dsm_assignment_response_versions for select to authenticated using(exists(select 1 from public.dsm_assignment_responses r where r.assignment_id=dsm_assignment_response_versions.assignment_id));
create function private.guard_dsm_assignment_response() returns trigger language plpgsql set search_path='' as $$
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
 if exists(select 1 from jsonb_each(new.answers) e where jsonb_typeof(e.value)<>'string' or not exists(select 1 from jsonb_array_elements(qs) q where q->>'id'=e.key and (q->'choices') ? (e.value#>>'{}'))) then raise exception 'Unknown question, invalid answer or unselected follow-up';end if;
 if exists(select 1 from jsonb_array_elements(qs) with ordinality q(value,pos) where q.pos<=new.page*7 and not(new.answers ? (q.value->>'id'))) then raise exception 'Answer earlier pages before advancing';end if;
 if new.status='submitted' then
  if (select count(*) from jsonb_object_keys(new.answers))<>n then raise exception 'Answer every selected question before submitting';end if;new.submitted_at=now();
 else new.submitted_at=null;end if;
 new.answered_count=(select count(*) from jsonb_object_keys(new.answers));new.updated_at=now();return new;
end $$;
revoke all on function private.guard_dsm_assignment_response() from public,anon,authenticated;
create trigger guard_dsm_assignment_response before insert or update on public.dsm_assignment_responses for each row execute function private.guard_dsm_assignment_response();
create function private.audit_dsm_assignment_response() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.revision>0 then insert into public.dsm_assignment_response_versions(assignment_id,revision,answers,page,status,actor_id) values(new.assignment_id,new.revision,new.answers,new.page,new.status,auth.uid());end if;return new;end $$;
revoke all on function private.audit_dsm_assignment_response() from public,anon,authenticated;
create trigger audit_dsm_assignment_response after insert or update on public.dsm_assignment_responses for each row execute function private.audit_dsm_assignment_response();
create function public.save_dsm_assignment(p_id uuid,p_expected integer,p_answers jsonb,p_page integer,p_submit boolean,p_confirmed boolean) returns integer language plpgsql security invoker set search_path='' as $$
declare r public.dsm_assignment_responses;n integer;
begin
 if not private.dsm_recipient_allowed(p_id) then raise exception 'Recipient access required' using errcode='42501';end if;
 insert into public.dsm_assignment_responses(assignment_id) values(p_id) on conflict do nothing;
 select * into r from public.dsm_assignment_responses where assignment_id=p_id and respondent_id=auth.uid() for update;
 if not found then raise exception 'Recipient record unavailable' using errcode='42501';end if;
 if r.revision<>p_expected then raise exception 'Another session saved newer answers' using errcode='40001';end if;
 n=r.revision+1;update public.dsm_assignment_responses set answers=p_answers,page=p_page,status=case when p_submit then 'submitted' else 'draft' end,identity_confirmed=p_confirmed,revision=n where assignment_id=p_id and respondent_id=auth.uid();return n;
end $$;
revoke all on function public.save_dsm_assignment(uuid,integer,jsonb,integer,boolean,boolean) from public,anon;grant execute on function public.save_dsm_assignment(uuid,integer,jsonb,integer,boolean,boolean) to authenticated;
-- One clinician working record per source assignment; original submitted answers remain locked.
alter table public.dsm_records add column source_assignment_id uuid unique references public.psych_test_assignments(id);
create function private.guard_dsm_record_assignment() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and new.source_assignment_id is distinct from old.source_assignment_id then raise exception 'Source assignment is immutable';end if;
 if tg_op='INSERT' and new.source_assignment_id is not null and not exists(select 1 from public.psych_test_assignments a join public.dsm_assignment_responses r on r.assignment_id=a.id where a.id=new.source_assignment_id and a.assigned_by=new.owner_id and a.patient_id=new.patient_id and r.status='submitted') then raise exception 'Submitted assignment and patient association required';end if;return new;
end $$;
revoke all on function private.guard_dsm_record_assignment() from public,anon,authenticated;
create trigger guard_dsm_record_assignment before insert or update on public.dsm_records for each row execute function private.guard_dsm_record_assignment();
