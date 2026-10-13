-- ASQ / ASEQ protected, versioned persistent data foundation.
-- This phase permits administrator-only synthetic QA. No patient/guardian grants.
-- No changes to public.patient_intakes.
create table if not exists public.asq_cases (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 label text not null check (char_length(btrim(label)) between 1 and 140),
 student_profile jsonb not null default '{}'::jsonb check (jsonb_typeof(student_profile)='object'),
 synthetic_only boolean not null default true check (synthetic_only is true),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists asq_cases_owner_updated_idx on public.asq_cases(owner_id,updated_at desc);

create table if not exists public.asq_snapshots (
 case_id uuid primary key references public.asq_cases(id) on delete restrict,
 owner_id uuid not null default auth.uid() references auth.users(id),
 payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload)='object' and octet_length(payload::text)<=2000000),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.asq_documents (
 id uuid primary key default gen_random_uuid(),
 case_id uuid not null references public.asq_cases(id) on delete restrict,
 owner_id uuid not null default auth.uid() references auth.users(id),
 document_kind text not null check (document_kind in
  ('student','parent','teacher','legacy_parent','student_demographics','combined_report','support_incidents')),
 form_version text not null default 'asq-qa-v1' check (char_length(form_version) between 1 and 80),
 status text not null default 'draft' check (status in ('draft','completed')),
 responses jsonb not null default '{}'::jsonb check (jsonb_typeof(responses)='object'),
 scores jsonb not null default '{}'::jsonb check (jsonb_typeof(scores)='object'),
 narrative text not null default '',
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 completed_at timestamptz,
 unique(case_id,document_kind)
);
create index if not exists asq_documents_case_idx on public.asq_documents(case_id,document_kind);

create table if not exists public.asq_audit_events (
 id bigint generated always as identity primary key,
 case_id uuid not null references public.asq_cases(id) on delete restrict,
 actor_id uuid not null references auth.users(id),
 entity text not null check (entity in ('case','snapshot','document')),
 action text not null check (action in ('INSERT','UPDATE')),
 revision integer not null,
 occurred_at timestamptz not null default now()
);
create index if not exists asq_audit_case_when_idx on public.asq_audit_events(case_id,occurred_at desc);

create or replace function private.asq_stamp_case() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id
 or new.created_at is distinct from old.created_at or new.synthetic_only is distinct from old.synthetic_only
 then raise exception 'ASQ case identity is immutable'; end if;
 new.revision := old.revision+1;
 new.updated_at := now();
 return new;
end $$;
create or replace function private.asq_stamp_snapshot() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.case_id is distinct from old.case_id or new.owner_id is distinct from old.owner_id
 or new.created_at is distinct from old.created_at
 then raise exception 'ASQ snapshot identity is immutable'; end if;
 new.revision := old.revision+1;
 new.updated_at := now();
 return new;
end $$;
create or replace function private.asq_stamp_document() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.id is distinct from old.id or new.case_id is distinct from old.case_id
 or new.owner_id is distinct from old.owner_id or new.document_kind is distinct from old.document_kind
 or new.created_at is distinct from old.created_at
 then raise exception 'ASQ document identity is immutable'; end if;
 if old.status='completed' then
  raise exception 'Completed ASQ document cannot be overwritten';
 end if;
 new.revision := old.revision+1;
 new.updated_at := now();
 if new.status='completed' then new.completed_at:=now(); end if;
 return new;
end $$;

create trigger asq_cases_stamp before update on public.asq_cases
for each row execute function private.asq_stamp_case();
create trigger asq_snapshots_stamp before update on public.asq_snapshots
for each row execute function private.asq_stamp_snapshot();
create trigger asq_documents_stamp before update on public.asq_documents
for each row execute function private.asq_stamp_document();

create or replace function private.asq_log_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare owner_id_value uuid; case_id_value uuid; rev_value integer; entity_value text;
begin
 case tg_table_name
  when 'asq_cases' then
   case_id_value:=new.id; owner_id_value:=new.owner_id; entity_value:='case';
  when 'asq_snapshots' then
   case_id_value:=new.case_id; owner_id_value:=new.owner_id; entity_value:='snapshot';
  when 'asq_documents' then
   case_id_value:=new.case_id; owner_id_value:=new.owner_id; entity_value:='document';
  else raise exception 'Invalid ASQ event source';
 end case;
 rev_value:=new.revision;
 insert into public.asq_audit_events(case_id,actor_id,entity,action,revision)
 values(case_id_value,coalesce(auth.uid(),owner_id_value),entity_value,tg_op,rev_value);
 return new;
end $$;
revoke all on function private.asq_log_change() from public,anon,authenticated;
create trigger asq_cases_audit after insert or update on public.asq_cases
for each row execute function private.asq_log_change();
create trigger asq_snapshots_audit after insert or update on public.asq_snapshots
for each row execute function private.asq_log_change();
create trigger asq_documents_audit after insert or update on public.asq_documents
for each row execute function private.asq_log_change();

alter table public.asq_cases enable row level security;
alter table public.asq_snapshots enable row level security;
alter table public.asq_documents enable row level security;
alter table public.asq_audit_events enable row level security;

revoke all on public.asq_cases,public.asq_snapshots,public.asq_documents,public.asq_audit_events from anon;
revoke all on public.asq_cases,public.asq_snapshots,public.asq_documents,public.asq_audit_events from public;
grant select,insert,update on public.asq_cases,public.asq_snapshots,public.asq_documents to authenticated;
grant select on public.asq_audit_events to authenticated;

create policy asq_cases_read on public.asq_cases for select to authenticated
using (owner_id=(select auth.uid())
 and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_type='admin'));
create policy asq_cases_add on public.asq_cases for insert to authenticated
with check (owner_id=(select auth.uid()) and synthetic_only is true
 and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_type='admin'));
create policy asq_cases_edit on public.asq_cases for update to authenticated
using (owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_type='admin'))
with check (owner_id=(select auth.uid()) and synthetic_only is true
 and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_type='admin'));

create policy asq_snapshots_read on public.asq_snapshots for select to authenticated
using (owner_id=(select auth.uid()) and exists(select 1 from public.asq_cases c where c.id=case_id and c.owner_id=(select auth.uid())));
create policy asq_snapshots_add on public.asq_snapshots for insert to authenticated
with check (owner_id=(select auth.uid()) and exists(select 1 from public.asq_cases c where c.id=case_id and c.owner_id=(select auth.uid())));
create policy asq_snapshots_edit on public.asq_snapshots for update to authenticated
using (owner_id=(select auth.uid()) and exists(select 1 from public.asq_cases c where c.id=case_id and c.owner_id=(select auth.uid())))
with check (owner_id=(select auth.uid()) and exists(select 1 from public.asq_cases c where c.id=case_id and c.owner_id=(select auth.uid())));

create policy asq_documents_read on public.asq_documents for select to authenticated
using (owner_id=(select auth.uid()) and exists(select 1 from public.asq_cases c where c.id=case_id and c.owner_id=(select auth.uid())));
create policy asq_documents_add on public.asq_documents for insert to authenticated
with check (owner_id=(select auth.uid()) and exists(select 1 from public.asq_cases c where c.id=case_id and c.owner_id=(select auth.uid())));
create policy asq_documents_edit on public.asq_documents for update to authenticated
using (owner_id=(select auth.uid()) and exists(select 1 from public.asq_cases c where c.id=case_id and c.owner_id=(select auth.uid())))
with check (owner_id=(select auth.uid()) and exists(select 1 from public.asq_cases c where c.id=case_id and c.owner_id=(select auth.uid())));

create policy asq_audit_read on public.asq_audit_events for select to authenticated
using (actor_id=(select auth.uid()) and exists(select 1 from public.asq_cases c where c.id=case_id and c.owner_id=(select auth.uid())));
