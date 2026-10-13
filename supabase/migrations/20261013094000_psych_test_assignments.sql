-- Secure administrative assessment assignments. Patient questionnaires remain QA-only until approved.
-- Emailed URLs are not bearer credentials: account + verified email + MFA required.
create table if not exists public.psych_test_assignments (
  id uuid primary key default gen_random_uuid(),
  assigned_by uuid not null default auth.uid() references auth.users(id),
  recipient_first_name text not null check (char_length(btrim(recipient_first_name)) between 1 and 100),
  recipient_last_name text not null check (char_length(btrim(recipient_last_name)) between 1 and 100),
  recipient_email text not null check (recipient_email=lower(btrim(recipient_email))
    and char_length(recipient_email) between 3 and 254 and position('@' in recipient_email)>1),
  recipient_dob date not null check (recipient_dob >= date '1900-01-01'),
  test_key text not null check (test_key in ('dsm','cseq','asq','srrci','rtafi','rdii','rvti','cogswitch')),
  status text not null default 'draft' check (status in ('draft','sent','revoked')),
  sent_at timestamptz,
  email_provider_id text,
  expires_at timestamptz not null default (now()+interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint psych_test_assignments_sent_fields
     check ((status='sent' and sent_at is not null) or status<>'sent'),
  constraint psych_test_assignments_expiry check(expires_at>created_at)
);
create index if not exists psych_test_assignments_admin_idx
 on public.psych_test_assignments(assigned_by,created_at desc);
create index if not exists psych_test_assignments_recipient_idx
 on public.psych_test_assignments(recipient_email,status,expires_at);
alter table public.psych_test_assignments enable row level security;
revoke all on table public.psych_test_assignments from public,anon;
grant select,insert,update on table public.psych_test_assignments to authenticated;

-- The administrator's current session must be MFA-verified; never trust user_metadata.
create policy psych_assign_admin_read on public.psych_test_assignments
 for select to authenticated using (
 assigned_by=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.profiles where id=(select auth.uid()) and account_type='admin')
);
create policy psych_assign_admin_insert on public.psych_test_assignments
 for insert to authenticated with check (
 assigned_by=(select auth.uid()) and status='draft' and sent_at is null
 and email_provider_id is null and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.profiles where id=(select auth.uid()) and account_type='admin')
);
create policy psych_assign_admin_update on public.psych_test_assignments
 for update to authenticated using (
 assigned_by=(select auth.uid()) and status='draft' and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.profiles where id=(select auth.uid()) and account_type='admin')
) with check (
 assigned_by=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.profiles where id=(select auth.uid()) and account_type='admin')
);
-- The authenticated recipient can view only invitations sent to their verified account.
-- No patient permissions to create, modify, or directly enter admin-only test modules.
create policy psych_assign_patient_read on public.psych_test_assignments
 for select to authenticated using (
 status='sent' and expires_at>now()
 and recipient_email=lower((select auth.jwt()->>'email'))
 and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.profiles where id=(select auth.uid()) and account_type='patient')
);

create or replace function private.psych_assignment_guard() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.id is distinct from old.id
    or new.assigned_by is distinct from old.assigned_by
    or new.recipient_email is distinct from old.recipient_email
    or new.recipient_first_name is distinct from old.recipient_first_name
    or new.recipient_last_name is distinct from old.recipient_last_name
    or new.recipient_dob is distinct from old.recipient_dob
    or new.test_key is distinct from old.test_key
    or new.created_at is distinct from old.created_at
    or new.expires_at is distinct from old.expires_at
 then raise exception 'Assignment identity is immutable'; end if;
 if old.status <> 'draft' then raise exception 'A sent/revoked assignment cannot be edited'; end if;
 new.updated_at:=now();
 return new;
end $$;
revoke all on function private.psych_assignment_guard() from public,anon,authenticated;
create trigger psych_assignment_guard before update on public.psych_test_assignments
 for each row execute function private.psych_assignment_guard();
