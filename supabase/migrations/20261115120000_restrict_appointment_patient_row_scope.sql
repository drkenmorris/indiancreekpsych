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

-- Deliberately do NOT create a permissive direct DELETE policy. Existing
-- scheduler cancellations must go through their audited service/RPC pathway;
-- granting authenticated patients or admins direct row deletion here would
-- expand their authority and could erase booking/recurrence history. The
-- restrictive ALL policy is only an additional gate, not a grant of DELETE.
