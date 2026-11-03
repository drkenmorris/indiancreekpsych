-- Older clients may still create untyped ASQ drafts during rolling deployment.
-- They remain nonlaunchable; the new application requires a typed assignment.
create or replace function private.validate_psych_assignment_asq() returns trigger language plpgsql set search_path='' as $$
begin
 if new.test_key='asq' then
  if new.patient_id is null and new.asq_role is null and new.asq_definition is null and new.asq_definition_hash is null then return new;end if;
  if new.patient_id is null or new.asq_role is null or new.asq_definition is null or new.asq_definition_hash is null then raise exception 'Select patient and ASQ respondent version';end if;
  if new.asq_definition->>'role' is distinct from new.asq_role or new.asq_definition->>'pageSize' is distinct from '7' or jsonb_typeof(new.asq_definition->'items') is distinct from 'array' or jsonb_array_length(new.asq_definition->'items') not between 1 and 500 then raise exception 'Invalid ASQ source definition';end if;
 end if;return new;
end $$;
revoke all on function private.validate_psych_assignment_asq() from public,anon,authenticated;
-- Typed ASQ invitations use the current verified Auth-email ACL. Preserve the
-- existing policy for other instruments and historical untyped ASQ invitations.
alter policy psych_assign_patient_read on public.psych_test_assignments using (
 (test_key<>'asq' or asq_role is null) and status='sent' and expires_at>now()
 and recipient_email=lower((select auth.jwt()->>'email')) and (select auth.jwt()->>'aal')='aal2'
 and exists(select 1 from public.profiles where id=(select auth.uid()) and account_type='patient'));
