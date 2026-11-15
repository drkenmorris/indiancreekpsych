-- Preserve existing appointments and recurrence records while closing a patient
-- isolation gap in the inherited scheduler RLS. The older permissive FOR ALL
-- policy accepted any secure patient session without checking appointment
-- ownership; permissive PostgreSQL policies are ORed together, so it could
-- override the otherwise correct own-or-admin SELECT/UPDATE policies.
--
-- A RESTRICTIVE policy composes with existing specific authorization policies
-- using AND. Every direct authenticated appointment operation must therefore
-- have a secure session AND belong to that patient (or an MFA-verified admin).
-- SECURITY DEFINER booking functions keep their own authorization gates.
drop policy if exists appointments_patient_security on public.appointments;

create policy appointments_patient_security on public.appointments
 as restrictive for all to authenticated
 using (
  (select private.patient_secure_session()) and
  (patient_id = (select auth.uid()) or (select private.current_user_is_admin()))
 )
 with check (
  (select private.patient_secure_session()) and
  (patient_id = (select auth.uid()) or (select private.current_user_is_admin()))
 );

-- The former FOR ALL policy also supplied a permissive DELETE path. Keep
-- existing owner/admin cancellation permissions subject to the new restrictive
-- secure-session and row-ownership gate, without widening deletion access.
create policy appointments_delete_own_or_admin on public.appointments
 for delete to authenticated
 using (patient_id = (select auth.uid()) or (select private.current_user_is_admin()));
