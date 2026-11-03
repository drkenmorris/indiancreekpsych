-- Each informant has one immutable invitation target and independent response record.
alter table public.psych_test_assignments alter column recipient_dob drop not null;
alter table public.psych_test_assignments add column patient_id uuid references public.clinical_patients(id), add column asq_role text, add column asq_definition jsonb, add column asq_definition_hash text;
create index psych_assign_patient_idx on public.psych_test_assignments(patient_id,assigned_by,created_at desc);
alter table public.psych_test_assignments add constraint psych_assignment_dob_required check(test_key='asq' or recipient_dob is not null);
alter table public.psych_test_assignments add constraint psych_assignment_asq_fields check(
 (patient_id is null and asq_role is null and asq_definition is null and asq_definition_hash is null) or
 (test_key='asq' and patient_id is not null and asq_role in ('student','parent','teacher') and asq_definition is not null and asq_definition_hash ~ '^[a-f0-9]{64}$'));
create function private.validate_psych_assignment_asq() returns trigger language plpgsql set search_path='' as $$
begin
 if new.test_key='asq' then
  if new.patient_id is null or new.asq_role is null or new.asq_definition is null or new.asq_definition_hash is null then raise exception 'Select patient and ASQ respondent version';end if;
  if new.asq_definition->>'role' is distinct from new.asq_role or new.asq_definition->>'pageSize' is distinct from '7' or jsonb_typeof(new.asq_definition->'items') is distinct from 'array' or jsonb_array_length(new.asq_definition->'items') not between 1 and 500 then raise exception 'Invalid ASQ source definition';end if;
 end if;return new;
end $$;
revoke all on function private.validate_psych_assignment_asq() from public,anon,authenticated;
create trigger validate_psych_assignment_asq before insert on public.psych_test_assignments for each row execute function private.validate_psych_assignment_asq();
create function private.psych_asq_identity_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if new.patient_id is distinct from old.patient_id or new.asq_role is distinct from old.asq_role or new.asq_definition is distinct from old.asq_definition or new.asq_definition_hash is distinct from old.asq_definition_hash then raise exception 'ASQ patient, recipient version and source are immutable';end if;return new;
end $$;
revoke all on function private.psych_asq_identity_guard() from public,anon,authenticated;
create trigger psych_asq_identity_guard before update on public.psych_test_assignments for each row execute function private.psych_asq_identity_guard();
-- Private ACL helper intentionally reads only the explicit invitation plus the
-- current Auth email. It grants no access to the patient's chart or other raters.
create function private.asq_recipient_allowed(p_assignment uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (select auth.jwt()->>'aal')='aal2' and exists(
 select 1 from public.psych_test_assignments a join auth.users u on u.id=auth.uid()
 where a.id=p_assignment and a.test_key='asq' and a.asq_role is not null and a.status='sent' and a.expires_at>now() and lower(u.email)=a.recipient_email and u.email_confirmed_at is not null)
$$;
revoke all on function private.asq_recipient_allowed(uuid) from public,anon;grant execute on function private.asq_recipient_allowed(uuid) to authenticated;
create policy psych_asq_recipient_read on public.psych_test_assignments for select to authenticated using(private.asq_recipient_allowed(id));
create table public.asq_assignment_responses(
 assignment_id uuid primary key references public.psych_test_assignments(id),respondent_id uuid not null default auth.uid() references auth.users(id),
 answers jsonb not null default '{}' check(jsonb_typeof(answers)='object' and octet_length(answers::text)<100000),page integer not null default 0,
 status text not null default 'draft' check(status in ('draft','submitted')),answered_count integer not null default 0,revision integer not null default 0,identity_confirmed boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),submitted_at timestamptz);
create index asq_assignment_respondent_idx on public.asq_assignment_responses(respondent_id);
create table public.asq_assignment_response_versions(
 assignment_id uuid not null references public.asq_assignment_responses(assignment_id),revision integer not null,answers jsonb not null,page integer not null,status text not null,
 actor_id uuid not null references auth.users(id),created_at timestamptz not null default now(),primary key(assignment_id,revision));
create index asq_assignment_version_actor_idx on public.asq_assignment_response_versions(actor_id);
alter table public.asq_assignment_responses enable row level security;alter table public.asq_assignment_response_versions enable row level security;
revoke all on public.asq_assignment_responses,public.asq_assignment_response_versions from public,anon,authenticated;
grant select,insert on public.asq_assignment_responses to authenticated;grant update(answers,page,status,revision,identity_confirmed) on public.asq_assignment_responses to authenticated;grant select on public.asq_assignment_response_versions to authenticated;
create policy asq_response_read on public.asq_assignment_responses for select to authenticated using(
 (respondent_id=(select auth.uid()) and private.asq_recipient_allowed(assignment_id)) or
 ((select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin() and exists(select 1 from public.psych_test_assignments a where a.id=assignment_id and a.assigned_by=(select auth.uid()))));
create policy asq_response_insert on public.asq_assignment_responses for insert to authenticated with check(respondent_id=(select auth.uid()) and private.asq_recipient_allowed(assignment_id));
create policy asq_response_update on public.asq_assignment_responses for update to authenticated using(respondent_id=(select auth.uid()) and private.asq_recipient_allowed(assignment_id)) with check(respondent_id=(select auth.uid()) and private.asq_recipient_allowed(assignment_id));
create policy asq_response_version_read on public.asq_assignment_response_versions for select to authenticated using(exists(select 1 from public.asq_assignment_responses r where r.assignment_id=asq_assignment_response_versions.assignment_id));
create function private.guard_asq_assignment_response() returns trigger language plpgsql set search_path='' as $$
declare a public.psych_test_assignments;n integer;
begin
 select * into a from public.psych_test_assignments where id=new.assignment_id;
 if not found or a.asq_definition is null then raise exception 'ASQ source unavailable';end if;
 n=jsonb_array_length(a.asq_definition->'items');
 if tg_op='INSERT' then
  if new.revision<>0 or new.answers<>'{}'::jsonb or new.page<>0 or new.status<>'draft' or new.identity_confirmed then raise exception 'Start with an empty response record';end if;
  new.created_at=now();
 else
  if old.status='submitted' or new.revision<>old.revision+1 or new.assignment_id<>old.assignment_id or new.respondent_id<>old.respondent_id or new.created_at<>old.created_at then raise exception 'Submitted response or identity cannot be changed';end if;
  if not new.identity_confirmed then raise exception 'Confirm the named respondent';end if;
 end if;
 if new.page<0 or new.page>=(n+6)/7 then raise exception 'Invalid questionnaire page';end if;
 if exists(select 1 from jsonb_each(new.answers) e where jsonb_typeof(e.value)<>'number' or e.value::text not in ('0','1','2','3','4') or not exists(select 1 from jsonb_array_elements(a.asq_definition->'items') item where item->>'id'=e.key)) then raise exception 'Unknown question or invalid response';end if;
 if exists(select 1 from jsonb_array_elements(a.asq_definition->'items') with ordinality item(value,pos) where item.pos<=new.page*7 and not(new.answers ? (item.value->>'id'))) then raise exception 'Answer earlier pages before advancing';end if;
 if new.status='submitted' then
  if (select count(*) from jsonb_object_keys(new.answers))<>n then raise exception 'Answer every question before submitting';end if;
  new.submitted_at=now();
 else new.submitted_at=null;end if;
 new.answered_count=(select count(*) from jsonb_object_keys(new.answers));
 new.updated_at=now();return new;
end $$;
revoke all on function private.guard_asq_assignment_response() from public,anon,authenticated;
create trigger guard_asq_assignment_response before insert or update on public.asq_assignment_responses for each row execute function private.guard_asq_assignment_response();
-- Private history trigger is the only writer to the immutable version table.
create function private.audit_asq_assignment_response() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.revision>0 then insert into public.asq_assignment_response_versions(assignment_id,revision,answers,page,status,actor_id) values(new.assignment_id,new.revision,new.answers,new.page,new.status,auth.uid());end if;return new;
end $$;
revoke all on function private.audit_asq_assignment_response() from public,anon,authenticated;
create trigger audit_asq_assignment_response after insert or update on public.asq_assignment_responses for each row execute function private.audit_asq_assignment_response();
create function public.save_asq_assignment(p_id uuid,p_expected integer,p_answers jsonb,p_page integer,p_submit boolean,p_confirmed boolean) returns integer language plpgsql security invoker set search_path='' as $$
declare r public.asq_assignment_responses;n integer;
begin
 if not private.asq_recipient_allowed(p_id) then raise exception 'Recipient access required' using errcode='42501';end if;
 insert into public.asq_assignment_responses(assignment_id) values(p_id) on conflict do nothing;
 select * into r from public.asq_assignment_responses where assignment_id=p_id and respondent_id=auth.uid() for update;
 if not found then raise exception 'Recipient record unavailable' using errcode='42501';end if;
 if r.revision<>p_expected then raise exception 'Another session saved newer answers. Your current answers remain on this page; reopen the assignment to review.' using errcode='40001';end if;
 n=r.revision+1;
 update public.asq_assignment_responses set answers=p_answers,page=p_page,status=case when p_submit then 'submitted' else 'draft' end,identity_confirmed=p_confirmed,revision=n where assignment_id=p_id and respondent_id=auth.uid();
 return n;
end $$;
revoke all on function public.save_asq_assignment(uuid,integer,jsonb,integer,boolean,boolean) from public,anon;grant execute on function public.save_asq_assignment(uuid,integer,jsonb,integer,boolean,boolean) to authenticated;
