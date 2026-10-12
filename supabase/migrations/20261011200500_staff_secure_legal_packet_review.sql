-- Staff/administrator review of submitted kiosk intake packets.
-- No direct SELECT grant on private.kiosk_patient_intakes. The privileged function verifies role + MFA.
create or replace function private.list_submitted_kiosk_intakes_impl()
returns table(id uuid, patient_name text, date_of_birth date, answers jsonb, submitted_at timestamptz)
language plpgsql security definer set search_path=''
as $body$
begin
 if auth.uid() is null
    or coalesce(auth.jwt()->>'aal','')<>'aal2'
    or not coalesce(private.current_user_can_manage_intakes(),false)
 then
  raise exception 'Authorized office staff with second-factor verification required' using errcode='42501';
 end if;
 return query
 select k.id,k.patient_name,k.date_of_birth,k.answers,k.submitted_at
 from private.kiosk_patient_intakes k
 where k.status='submitted' and k.submitted_at is not null
 order by k.submitted_at desc limit 100;
end
$body$;

create or replace function public.list_submitted_kiosk_intakes()
returns table(id uuid, patient_name text, date_of_birth date, answers jsonb, submitted_at timestamptz)
language sql security invoker set search_path=''
as $body$ select * from private.list_submitted_kiosk_intakes_impl() $body$;

revoke all on function private.list_submitted_kiosk_intakes_impl() from public,anon,authenticated;
revoke all on function public.list_submitted_kiosk_intakes() from public,anon,authenticated;
grant execute on function private.list_submitted_kiosk_intakes_impl() to authenticated;
grant execute on function public.list_submitted_kiosk_intakes() to authenticated;

-- Staff may inspect only already-submitted registered patient intakes after MFA.
create policy patient_intakes_staff_submitted_review
on public.patient_intakes for select to authenticated
using (
 status='submitted'
 and coalesce(auth.jwt()->>'aal','')='aal2'
 and coalesce(private.current_user_can_manage_intakes(),false)
);
