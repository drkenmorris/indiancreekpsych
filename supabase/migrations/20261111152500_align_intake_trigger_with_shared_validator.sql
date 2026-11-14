-- A clean replay previously retained the 2026-09 intake trigger's short field
-- allowlist even after later migrations introduced the shared 21-section validator.
-- Production already runs this shared validation path. Bring fresh/staging databases
-- into parity without modifying any stored intake, chart, appointment, or account.
create or replace function private.validate_patient_intake() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.patient_id<>old.patient_id or old.status='submitted') then
  raise exception 'Submitted intake cannot be changed';
 end if;
 perform private.validate_intake_answers(new.answers,new.status='submitted');
 new.version:=case when tg_op='INSERT' then 1 else old.version+1 end;
 new.updated_at:=now();
 new.submitted_at:=case when new.status='submitted' then now() else null end;
 return new;
end
$$;
-- Preserve the existing SECURITY INVOKER trigger and role grants; the shared
-- validator functions remain in the private schema and have no RLS bypass.
