-- Explicitly scope immutable recipient answer histories to the same respondent
-- or assigning AAL2 clinician as their parent response. Do not depend solely on
-- nested row-level security of the parent response to protect versions.
-- This changes access policies only; it never rewrites assessment answers,
-- versions, existing invitations or clinical records.
--
-- Keep the recipient authorization helpers: these enforce verified identity,
-- test-specific assignment linkage, invitation state, and expiration.
drop policy if exists connected_response_version_read on public.connected_assignment_response_versions;
create policy connected_response_version_read
 on public.connected_assignment_response_versions for select to authenticated
 using (exists (
   select 1 from public.connected_assignment_responses r
   where r.assignment_id=connected_assignment_response_versions.assignment_id
     and (
       (r.respondent_id=(select auth.uid())
        and private.connected_recipient_allowed(r.assignment_id))
       or
       (coalesce((select auth.jwt()->>'aal'),'')='aal2'
        and private.current_user_is_admin()
        and exists (
          select 1 from public.psych_test_assignments a
          where a.id=r.assignment_id and a.assigned_by=(select auth.uid())
        ))
     )
 ));

drop policy if exists asq_response_version_read on public.asq_assignment_response_versions;
create policy asq_response_version_read
 on public.asq_assignment_response_versions for select to authenticated
 using (exists (
   select 1 from public.asq_assignment_responses r
   where r.assignment_id=asq_assignment_response_versions.assignment_id
     and (
       (r.respondent_id=(select auth.uid())
        and private.asq_recipient_allowed(r.assignment_id))
       or
       (coalesce((select auth.jwt()->>'aal'),'')='aal2'
        and private.current_user_is_admin()
        and exists (
          select 1 from public.psych_test_assignments a
          where a.id=r.assignment_id and a.assigned_by=(select auth.uid())
        ))
     )
 ));

drop policy if exists dsm_response_version_read on public.dsm_assignment_response_versions;
create policy dsm_response_version_read
 on public.dsm_assignment_response_versions for select to authenticated
 using (exists (
   select 1 from public.dsm_assignment_responses r
   where r.assignment_id=dsm_assignment_response_versions.assignment_id
     and (
       (r.respondent_id=(select auth.uid())
        and private.dsm_recipient_allowed(r.assignment_id))
       or
       (coalesce((select auth.jwt()->>'aal'),'')='aal2'
        and private.current_user_is_admin()
        and exists (
          select 1 from public.psych_test_assignments a
          where a.id=r.assignment_id and a.assigned_by=(select auth.uid())
        ))
     )
 ));
