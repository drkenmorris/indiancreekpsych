-- Patient MFA enrollment is optional. Voluntarily enrolled factors still require
-- verification; clinician/admin access, verified email, role and QA expiry remain enforced.
create or replace function private.patient_secure_session()
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null
 and exists (select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
 and exists (
  select 1 from public.profiles p where p.id=auth.uid() and (
   (p.account_type='admin' and coalesce(auth.jwt()->>'aal','')='aal2')
   or (p.account_type='patient' and (
    coalesce(auth.jwt()->>'aal','')='aal2'
    or (coalesce(auth.jwt()->>'aal','')='aal1' and not exists (
     select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified'
    ))
   ))
  )
 )
 and (
  not exists (select 1 from auth.users u where u.id=auth.uid() and u.raw_app_meta_data->>'qa_test_account'='true')
  or exists (select 1 from private.patient_test_accounts t where t.user_id=auth.uid() and t.expires_at>now())
 );
$$;
revoke all on function private.patient_secure_session() from public,anon;
grant execute on function private.patient_secure_session() to authenticated;

-- Assigned questionnaires retain recipient identity, verified current Auth email,
-- source, sent-state and expiry checks. Only verified Patient accounts gain the
-- optional enrollment path; other recipient roles keep their existing MFA gate.

create or replace function private.asq_recipient_allowed(p_assignment uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and ((select auth.jwt()->>'aal')='aal2' or private.patient_secure_session()) and exists(
 select 1 from public.psych_test_assignments a join auth.users u on u.id=auth.uid()
 where a.id=p_assignment and a.test_key='asq' and a.asq_role is not null and a.status='sent' and a.expires_at>now() and lower(u.email)=a.recipient_email and u.email_confirmed_at is not null)
$$;

create or replace function private.dsm_recipient_allowed(p_assignment uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and ((select auth.jwt()->>'aal')='aal2' or private.patient_secure_session()) and exists(
 select 1 from public.psych_test_assignments a join auth.users u on u.id=auth.uid()
 where a.id=p_assignment and a.test_key='dsm' and a.dsm_source is not null and a.status='sent' and a.expires_at>now() and lower(u.email)=a.recipient_email and u.email_confirmed_at is not null)
$$;

create or replace function private.connected_recipient_allowed(p_assignment uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and ((select auth.jwt()->>'aal')='aal2' or private.patient_secure_session()) and exists(
 select 1 from public.psych_test_assignments a join auth.users u on u.id=auth.uid()
 where a.id=p_assignment and a.test_key in ('cseq','srrci','rtafi','rdii','rvti') and a.connected_source is not null and a.patient_id is not null and a.status='sent' and a.expires_at>now() and lower(u.email)=a.recipient_email and u.email_confirmed_at is not null)
$$;
