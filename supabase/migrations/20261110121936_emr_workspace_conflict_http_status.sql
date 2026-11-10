-- Optimistic conflicts are application HTTP 409 responses, not transaction retries.
create or replace function public.save_emr_workspace(p_patient uuid,p_expected integer,p_state jsonb,p_demographics jsonb default null,p_patient_revision integer default null) returns integer language plpgsql security invoker set search_path='' as $$
declare w public.emr_workspaces;n integer;
begin
 insert into public.emr_workspaces(patient_id) values(p_patient) on conflict do nothing;
 select * into w from public.emr_workspaces where patient_id=p_patient and owner_id=auth.uid() for update;
 if not found then raise exception 'Workspace unavailable' using errcode='42501';end if;
 if w.revision<>p_expected then raise exception 'Another session saved this patient. Reopen the chart to review the latest revision.' using errcode='PT409';end if;
 n=w.revision+1;
 if p_demographics is not null then
  update public.clinical_patients set demographics=demographics||p_demographics where id=p_patient and revision=p_patient_revision;
  if not found then raise exception 'Patient demographics changed. Reopen the chart.' using errcode='PT409';end if;
 end if;
 update public.emr_workspaces set state=p_state,revision=n where patient_id=p_patient and owner_id=auth.uid();
 insert into public.emr_workspace_versions(patient_id,revision,state) values(p_patient,n,p_state);
 return n;
end $$;
