-- Require completed administrator MFA for scheduler access, while preserving every
-- existing role, appointment, recurring series, office-hour rule and patient policy.
-- RESTRICTIVE composes with the existing permissive per-table authorization:
-- a patient remains governed by the existing patient RLS policies, while an
-- authenticated admin's reads/writes require an aal2 session.
-- This is additive; no existing rows or credentials are modified.
create policy appointment_settings_admin_mfa_gate
 on public.appointment_settings as restrictive for all to authenticated
 using (not (select private.current_user_is_admin()) or (select auth.jwt()->>'aal')='aal2')
 with check (not (select private.current_user_is_admin()) or (select auth.jwt()->>'aal')='aal2');

create policy availability_rules_admin_mfa_gate
 on public.appointment_availability_rules as restrictive for all to authenticated
 using (not (select private.current_user_is_admin()) or (select auth.jwt()->>'aal')='aal2')
 with check (not (select private.current_user_is_admin()) or (select auth.jwt()->>'aal')='aal2');

create policy appointment_blocks_admin_mfa_gate
 on public.appointment_blocks as restrictive for all to authenticated
 using (not (select private.current_user_is_admin()) or (select auth.jwt()->>'aal')='aal2')
 with check (not (select private.current_user_is_admin()) or (select auth.jwt()->>'aal')='aal2');

create policy appointments_admin_mfa_gate
 on public.appointments as restrictive for all to authenticated
 using (not (select private.current_user_is_admin()) or (select auth.jwt()->>'aal')='aal2')
 with check (not (select private.current_user_is_admin()) or (select auth.jwt()->>'aal')='aal2');
