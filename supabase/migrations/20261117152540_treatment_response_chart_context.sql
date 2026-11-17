-- Narrow chart identity and visible plan-version metadata for Response.
-- No clinical table grants, plan contents or existing histories are changed.
create function private.treatment_response_chart_context(p_patient uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare caller_role text:=private.modality_role(); person jsonb; choices jsonb;
begin
 if caller_role is null or not exists(select 1 from private.modality_directory(false) d where d.id=auth.uid())
  or not private.modality_patient_active(p_patient) then
  raise exception 'Patient unavailable' using errcode='42501';
 end if;
 if caller_role='staff' and not exists(select 1 from public.emr_treatment_modalities m
  where m.patient_id=p_patient and m.assigned_provider_id=auth.uid()) then
  raise exception 'Patient unavailable' using errcode='42501';
 end if;
 select demographics into person from public.clinical_patients where id=p_patient;
 if person is null then raise exception 'Patient unavailable' using errcode='42501';end if;
 -- Match the existing plan and version read policies: own admin-authored plans
 -- only. Assignment permits chart identity, not another author's plan history.
 select coalesce(jsonb_agg(choice order by first_recorded_at desc,recorded_at desc,version_id),'[]'::jsonb) into choices from (
  select p.created_at first_recorded_at,v.created_at recorded_at,v.id version_id,jsonb_build_object(
   'id',v.id,'planId',p.id,'revision',v.revision,'firstRecordedAt',p.created_at,
   'recordedAt',v.created_at,'title',v.snapshot->>'title','status',v.snapshot->>'status') choice
  from public.emr_treatment_plans p join public.emr_treatment_plan_versions v on v.plan_id=p.id
  where caller_role='admin' and p.patient_id=p_patient and p.owner_id=auth.uid() and v.actor_id=auth.uid()
  order by p.created_at desc,v.created_at desc,v.id limit 200
 ) visible_versions;
 return jsonb_build_object('patientId',p_patient,'patientName',btrim(coalesce(person->>'first_name','')||' '||coalesce(person->>'last_name','')),'plans',choices);
end;
$$;
create function public.emr_treatment_response_context(p_patient uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select private.treatment_response_chart_context(p_patient)
$$;
revoke all on function private.treatment_response_chart_context(uuid),public.emr_treatment_response_context(uuid) from public,anon,authenticated;
grant execute on function private.treatment_response_chart_context(uuid),public.emr_treatment_response_context(uuid) to authenticated;
