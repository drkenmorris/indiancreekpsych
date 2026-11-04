-- Source snapshots and independent, recipient-bound records for five existing tests.
alter table public.psych_test_assignments add column connected_source jsonb, add column connected_source_hash text;
alter table public.psych_test_assignments drop constraint psych_assignment_asq_fields;
alter table public.psych_test_assignments add constraint psych_assignment_asq_fields check(
 (asq_role is null and asq_definition is null and asq_definition_hash is null and (patient_id is null or test_key in ('dsm','cseq','srrci','rtafi','rdii','rvti'))) or
 (test_key='asq' and patient_id is not null and asq_role in ('student','parent','teacher') and asq_definition is not null and asq_definition_hash ~ '^[a-f0-9]{64}$'));
alter table public.psych_test_assignments drop constraint psych_assignment_dob_required;
alter table public.psych_test_assignments add constraint psych_assignment_dob_required check(test_key in ('asq','cseq','srrci','rtafi','rdii','rvti') or recipient_dob is not null);
alter table public.psych_test_assignments add constraint connected_assignment_source check(
 (connected_source is null and connected_source_hash is null) or
 (test_key in ('cseq','srrci','rtafi','rdii','rvti') and patient_id is not null and jsonb_typeof(connected_source)='object' and connected_source_hash ~ '^[a-f0-9]{64}$'));
create function private.connected_source_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.connected_source is distinct from old.connected_source or new.connected_source_hash is distinct from old.connected_source_hash then raise exception 'Questionnaire source is immutable';end if;
 elsif new.test_key in ('cseq','srrci','rtafi','rdii','rvti') then
  if new.patient_id is null or new.connected_source is null or new.connected_source_hash is null or new.connected_source->>'format' is distinct from 'icps-connected/1' or new.connected_source->>'testKey' is distinct from new.test_key or new.connected_source->>'pageSize' is distinct from '7' or jsonb_typeof(new.connected_source->'items') is distinct from 'array' or jsonb_array_length(new.connected_source->'items') not between 1 and 500 then raise exception 'Select patient and fixed questionnaire source';end if;
 end if;return new;
end $$;
revoke all on function private.connected_source_guard() from public,anon,authenticated;
create trigger connected_source_guard before insert or update on public.psych_test_assignments for each row execute function private.connected_source_guard();
-- Only new five-test invitations change expiry semantics. Already-sent invitations are untouched.
create or replace function private.psych_assignment_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if new.id is distinct from old.id or new.assigned_by is distinct from old.assigned_by or new.recipient_email is distinct from old.recipient_email or new.recipient_first_name is distinct from old.recipient_first_name or new.recipient_last_name is distinct from old.recipient_last_name or new.recipient_dob is distinct from old.recipient_dob or new.test_key is distinct from old.test_key or new.created_at is distinct from old.created_at then raise exception 'Assignment identity is immutable';end if;
 if old.status<>'draft' then raise exception 'A sent/revoked assignment cannot be edited';end if;
 if new.test_key in ('cseq','srrci','rtafi','rdii','rvti') and new.status='sent' then
  if new.email_provider_id is null or new.patient_id is null or new.connected_source is null then raise exception 'Provider acceptance, patient and source required';end if;
  new.sent_at=now();new.expires_at=now()+interval '14 days';
 elsif new.expires_at is distinct from old.expires_at then raise exception 'Expiry is immutable';end if;
 new.updated_at=now();return new;
end $$;
create function private.connected_recipient_allowed(p_assignment uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (select auth.jwt()->>'aal')='aal2' and exists(
 select 1 from public.psych_test_assignments a join auth.users u on u.id=auth.uid()
 where a.id=p_assignment and a.test_key in ('cseq','srrci','rtafi','rdii','rvti') and a.connected_source is not null and a.patient_id is not null and a.status='sent' and a.expires_at>now() and lower(u.email)=a.recipient_email and u.email_confirmed_at is not null)
$$;
revoke all on function private.connected_recipient_allowed(uuid) from public,anon;grant execute on function private.connected_recipient_allowed(uuid) to authenticated;
create policy psych_connected_recipient_read on public.psych_test_assignments for select to authenticated using(private.connected_recipient_allowed(id));
create table public.connected_assignment_responses(
 assignment_id uuid primary key references public.psych_test_assignments(id),respondent_id uuid not null default auth.uid() references auth.users(id),
 answers jsonb not null default '{}' check(jsonb_typeof(answers)='object' and octet_length(answers::text)<100000),page integer not null default 0,
 status text not null default 'draft' check(status in ('draft','submitted')),answered_count integer not null default 0,revision integer not null default 0,identity_confirmed boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),submitted_at timestamptz);
create index connected_assignment_respondent_idx on public.connected_assignment_responses(respondent_id);
create table public.connected_assignment_response_versions(
 assignment_id uuid not null references public.connected_assignment_responses(assignment_id),revision integer not null,answers jsonb not null,page integer not null,status text not null,
 actor_id uuid not null references auth.users(id),created_at timestamptz not null default now(),primary key(assignment_id,revision));
create index connected_assignment_version_actor_idx on public.connected_assignment_response_versions(actor_id);
alter table public.connected_assignment_responses enable row level security;alter table public.connected_assignment_response_versions enable row level security;
revoke all on public.connected_assignment_responses,public.connected_assignment_response_versions from public,anon,authenticated;
grant select,insert on public.connected_assignment_responses to authenticated;grant update(answers,page,status,revision,identity_confirmed) on public.connected_assignment_responses to authenticated;grant select on public.connected_assignment_response_versions to authenticated;
create policy connected_response_read on public.connected_assignment_responses for select to authenticated using(
 (respondent_id=(select auth.uid()) and private.connected_recipient_allowed(assignment_id)) or
 ((select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin() and exists(select 1 from public.psych_test_assignments a where a.id=assignment_id and a.assigned_by=(select auth.uid()))));
create policy connected_response_insert on public.connected_assignment_responses for insert to authenticated with check(respondent_id=(select auth.uid()) and private.connected_recipient_allowed(assignment_id));
create policy connected_response_update on public.connected_assignment_responses for update to authenticated using(respondent_id=(select auth.uid()) and private.connected_recipient_allowed(assignment_id)) with check(respondent_id=(select auth.uid()) and private.connected_recipient_allowed(assignment_id));
create policy connected_response_version_read on public.connected_assignment_response_versions for select to authenticated using(exists(select 1 from public.connected_assignment_responses r where r.assignment_id=connected_assignment_response_versions.assignment_id));
create function private.guard_connected_assignment_response() returns trigger language plpgsql set search_path='' as $$
declare a public.psych_test_assignments;n integer;
begin
 select * into a from public.psych_test_assignments where id=new.assignment_id;
 if not private.connected_recipient_allowed(new.assignment_id) then raise exception 'Recipient access required' using errcode='42501';end if;
 if not found or a.connected_source is null then raise exception 'Questionnaire source unavailable';end if;
 n=jsonb_array_length(a.connected_source->'items');
 if tg_op='INSERT' then
  if new.revision<>0 or new.answers<>'{}'::jsonb or new.page<>0 or new.status<>'draft' or new.identity_confirmed then raise exception 'Start with an empty response record';end if;
  new.created_at=now();
 else
  if old.status='submitted' or new.revision<>old.revision+1 or new.assignment_id<>old.assignment_id or new.respondent_id<>old.respondent_id or new.created_at<>old.created_at then raise exception 'Submitted response or identity cannot be changed';end if;
  if not new.identity_confirmed then raise exception 'Confirm the named respondent';end if;
 end if;
 if new.page<0 or new.page>=(n+6)/7 then raise exception 'Invalid questionnaire page';end if;
 if exists(select 1 from jsonb_each(new.answers) e where not exists(select 1 from jsonb_array_elements(a.connected_source->'items') item cross join lateral jsonb_array_elements(item->'options') opt where item->>'id'=e.key and opt->'value'=e.value)) then raise exception 'Unknown question or invalid response';end if;
 if exists(select 1 from jsonb_array_elements(a.connected_source->'items') with ordinality item(value,pos) where item.pos<=new.page*7 and not(new.answers ? (item.value->>'id'))) then raise exception 'Answer earlier pages before advancing';end if;
 if new.status='submitted' then
  if (select count(*) from jsonb_object_keys(new.answers))<>n then raise exception 'Answer every question before submitting';end if;
  new.submitted_at=now();
 else new.submitted_at=null;end if;
 new.answered_count=(select count(*) from jsonb_object_keys(new.answers));
 new.updated_at=now();return new;
end $$;
revoke all on function private.guard_connected_assignment_response() from public,anon,authenticated;
create trigger guard_connected_assignment_response before insert or update on public.connected_assignment_responses for each row execute function private.guard_connected_assignment_response();
-- Private history trigger is the only writer to the immutable version table.
create function private.audit_connected_assignment_response() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.revision>0 then insert into public.connected_assignment_response_versions(assignment_id,revision,answers,page,status,actor_id) values(new.assignment_id,new.revision,new.answers,new.page,new.status,auth.uid());end if;return new;
end $$;
revoke all on function private.audit_connected_assignment_response() from public,anon,authenticated;
create trigger audit_connected_assignment_response after insert or update on public.connected_assignment_responses for each row execute function private.audit_connected_assignment_response();
create function public.save_connected_assignment(p_id uuid,p_expected integer,p_answers jsonb,p_page integer,p_submit boolean,p_confirmed boolean) returns integer language plpgsql security invoker set search_path='' as $$
declare r public.connected_assignment_responses;n integer;
begin
 if not private.connected_recipient_allowed(p_id) then raise exception 'Recipient access required' using errcode='42501';end if;
 insert into public.connected_assignment_responses(assignment_id) values(p_id) on conflict do nothing;
 select * into r from public.connected_assignment_responses where assignment_id=p_id and respondent_id=auth.uid() for update;
 if not found then raise exception 'Recipient record unavailable' using errcode='42501';end if;
 if r.revision<>p_expected then raise exception 'Another session saved newer answers. Your current answers remain on this page; reopen the assignment to review.' using errcode='40001';end if;
 n=r.revision+1;
 update public.connected_assignment_responses set answers=p_answers,page=p_page,status=case when p_submit then 'submitted' else 'draft' end,identity_confirmed=p_confirmed,revision=n where assignment_id=p_id and respondent_id=auth.uid();
 return n;
end $$;
revoke all on function public.save_connected_assignment(uuid,integer,jsonb,integer,boolean,boolean) from public,anon;grant execute on function public.save_connected_assignment(uuid,integer,jsonb,integer,boolean,boolean) to authenticated;
