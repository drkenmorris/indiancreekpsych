alter table public.psych_test_assignments add column invitation_removed_at timestamptz;
alter policy psych_assign_admin_update on public.psych_test_assignments using (
 assigned_by=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.profiles where id=(select auth.uid()) and account_type='admin')
);
alter policy psych_assign_admin_insert on public.psych_test_assignments with check (
 assigned_by=(select auth.uid()) and status='draft' and sent_at is null
 and email_provider_id is null and invitation_removed_at is null
 and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.profiles where id=(select auth.uid()) and account_type='admin')
);
create or replace function private.psych_assignment_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if new.id is distinct from old.id or new.assigned_by is distinct from old.assigned_by or new.recipient_email is distinct from old.recipient_email or new.recipient_first_name is distinct from old.recipient_first_name or new.recipient_last_name is distinct from old.recipient_last_name or new.recipient_dob is distinct from old.recipient_dob or new.test_key is distinct from old.test_key or new.created_at is distinct from old.created_at or new.patient_id is distinct from old.patient_id then raise exception 'Assignment identity is immutable';end if;
 if old.invitation_removed_at is not null then raise exception 'Invitation already removed';end if;
 if new.invitation_removed_at is not null then
  new.invitation_removed_at=now();
  new.status='revoked';
  new.sent_at=old.sent_at;
  new.expires_at=old.expires_at;
  new.email_provider_id=old.email_provider_id;
 elsif new.status='sent' and (old.status='draft' or (old.status='sent' and old.expires_at<=now())) then
  if new.email_provider_id is null or new.email_provider_id is not distinct from old.email_provider_id or new.patient_id is null then
   raise exception 'New provider acceptance and patient link required';
  end if;
  if exists(select 1 from public.asq_assignment_responses where assignment_id=old.id and status='submitted')
   or exists(select 1 from public.dsm_assignment_responses where assignment_id=old.id and status='submitted')
   or exists(select 1 from public.connected_assignment_responses where assignment_id=old.id and status='submitted') then
   raise exception 'Completed invitations cannot be resent';
  end if;
  new.sent_at=now();new.expires_at=now()+interval '14 days';
 else
  raise exception 'Unsupported invitation change';
 end if;
 new.updated_at=now();return new;
end $$;
