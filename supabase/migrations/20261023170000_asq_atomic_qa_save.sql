-- Atomic ASQ synthetic QA save. No patient permissions or clinical release.
create or replace function public.asq_save_qa_workspace(
 p_case_id uuid, p_expected_revision integer, p_snapshot jsonb, p_documents jsonb, p_student_profile jsonb
) returns integer language plpgsql security invoker set search_path = '' as $$
declare
 v_case public.asq_cases%rowtype;
 v_old public.asq_snapshots%rowtype;
 v_doc jsonb;
 v_kind text;
 v_version text;
 v_result integer;
begin
 if auth.uid() is null or coalesce(auth.jwt()->>'aal','') <> 'aal2'
    or not exists(select 1 from public.profiles where id=auth.uid() and account_type='admin') then
   raise exception 'ASQ administrator MFA required';
 end if;
 select * into v_case from public.asq_cases where id=p_case_id for update;
 if not found or v_case.owner_id <> auth.uid() or v_case.synthetic_only is distinct from true then
   raise exception 'Synthetic ASQ case inaccessible';
 end if;
 if jsonb_typeof(p_snapshot) <> 'object' or octet_length(p_snapshot::text)>1900000
    or jsonb_typeof(p_documents)<>'array' or jsonb_array_length(p_documents)<>7
    or jsonb_typeof(p_student_profile)<>'object' then
   raise exception 'Invalid ASQ workspace payload';
 end if;
 select * into v_old from public.asq_snapshots where case_id=p_case_id for update;
 if coalesce(v_old.revision,0) <> p_expected_revision then
   raise exception 'ASQ workspace revision conflict';
 end if;
 for v_doc in select value from jsonb_array_elements(p_documents) loop
   if jsonb_typeof(v_doc)<>'object' then raise exception 'Invalid ASQ section'; end if;
   v_kind:=v_doc->>'document_kind';
   v_version:=v_doc->>'form_version';
   if v_kind is null or v_kind not in
      ('student','parent','teacher','legacy_parent','student_demographics','combined_report','support_incidents')
      or length(coalesce(v_version,'')) not between 1 and 80
      or jsonb_typeof(v_doc->'responses')<>'object'
      or jsonb_typeof(v_doc->'scores')<>'object'
      or coalesce(v_doc->>'status','')<>'draft' then
     raise exception 'Invalid ASQ document';
   end if;
   insert into public.asq_documents(case_id,document_kind,form_version,status,responses,scores,narrative)
   values(p_case_id,v_kind,v_version,'draft',v_doc->'responses',v_doc->'scores',coalesce(v_doc->>'narrative',''))
   on conflict(case_id,document_kind) do update set
     form_version=excluded.form_version,responses=excluded.responses,
     scores=excluded.scores,narrative=excluded.narrative;
 end loop;
 update public.asq_cases set student_profile=p_student_profile where id=p_case_id;
 if v_old.case_id is null then
   insert into public.asq_snapshots(case_id,payload) values(p_case_id,p_snapshot)
   returning revision into v_result;
 else
   update public.asq_snapshots set payload=p_snapshot where case_id=p_case_id
   returning revision into v_result;
 end if;
 return v_result;
end $$;
revoke all on function public.asq_save_qa_workspace(uuid,integer,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.asq_save_qa_workspace(uuid,integer,jsonb,jsonb,jsonb) to authenticated;
