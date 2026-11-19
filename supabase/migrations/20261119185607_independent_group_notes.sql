-- Independent patient-specific group notes do not create shared sessions or attendance.
-- Existing linked notes and their composite participation FK remain intact.
alter table public.emr_group_individual_notes alter column session_id drop not null;
alter table public.emr_group_individual_notes add column group_name text;
alter table public.emr_group_individual_notes add column encounter_at timestamptz;
alter table public.emr_group_individual_notes add constraint emr_group_note_patient_fk foreign key(patient_id) references public.clinical_patients(id);
alter table public.emr_group_individual_notes add constraint emr_independent_group_metadata check(session_id is not null or (group_name is not null and length(btrim(group_name)) between 2 and 160 and encounter_at is not null));
create index emr_independent_group_note_date_idx on public.emr_group_individual_notes(owner_id,patient_id,encounter_at desc,created_at desc) where session_id is null;
alter policy emr_group_individual_notes_read on public.emr_group_individual_notes using(
 owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin()
 and ((session_id is null and exists(select 1 from public.clinical_patients c where c.id=emr_group_individual_notes.patient_id))
 or exists(select 1 from public.emr_group_participation p where p.session_id=emr_group_individual_notes.session_id and p.patient_id=emr_group_individual_notes.patient_id and p.owner_id=emr_group_individual_notes.owner_id))
);
create function private.save_independent_group_note(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();pid uuid;nid uuid;kind text;name text;encounter timestamptz;fields jsonb;required_fields text[];key text;value text;
begin
 if uid is null or (auth.jwt()->>'aal') is distinct from 'aal2' or not private.current_user_is_admin()
 or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null)
 then raise exception 'Verified administrator MFA required' using errcode='42501';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->'reviewed' is distinct from 'true'::jsonb
 or (select count(*) from jsonb_object_keys(p_payload))<>6
 or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('patient_id','group_name','encounter_at','template','sections','reviewed'))
 then raise exception 'Exact reviewed independent group-note fields required' using errcode='22023';end if;
 begin pid:=(p_payload->>'patient_id')::uuid;encounter:=(p_payload->>'encounter_at')::timestamptz;
 exception when others then raise exception 'Valid patient and encounter time required' using errcode='22023';end;
 if pid is null or encounter is null or not exists(select 1 from public.clinical_patients where id=pid)
 or not ((p_payload->>'encounter_at') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,3})?(Z|[+-][0-9]{2}:[0-9]{2})$')
 then raise exception 'Existing patient and explicit encounter timezone required' using errcode='22023';end if;
 if jsonb_typeof(p_payload->'group_name') is distinct from 'string' then raise exception 'Group name required' using errcode='22023';end if;
 name:=btrim(p_payload->>'group_name');if length(name) not between 2 and 160 then raise exception 'Group name must be 2-160 characters' using errcode='22023';end if;
 kind:=p_payload->>'template';
 if kind='DAP' then required_fields:=array['data','assessment','plan'];
 elsif kind='SOAP' then required_fields:=array['subjective','objective','assessment','plan'];
 elsif kind='Narrative' then required_fields:=array['narrative'];
 else raise exception 'Unsupported progress-note template' using errcode='22023';end if;
 fields:=p_payload->'sections';
 if jsonb_typeof(fields) is distinct from 'object' or (select count(*) from jsonb_object_keys(fields))<>array_length(required_fields,1)
 then raise exception 'Exact progress-note sections required' using errcode='22023';end if;
 foreach key in array required_fields loop
  if jsonb_typeof(fields->key) is distinct from 'string' then raise exception 'Text note section required' using errcode='22023';end if;
  value:=btrim(fields->>key);if length(value) not between 2 and 4000 then raise exception 'Sections must be 2-4000 characters' using errcode='22023';end if;
  fields:=jsonb_set(fields,array[key],to_jsonb(value),false);
 end loop;
 insert into public.emr_group_individual_notes(owner_id,patient_id,session_id,group_name,encounter_at,template,sections,reviewed)
 values(uid,pid,null,name,encounter,kind,fields,true) returning id into nid;return nid;
end $$;
revoke all on function private.save_independent_group_note(jsonb) from public,anon;
grant execute on function private.save_independent_group_note(jsonb) to authenticated;
create function public.save_independent_group_note(p_payload jsonb) returns uuid language sql security invoker set search_path='' as $$select private.save_independent_group_note(p_payload)$$;
revoke all on function public.save_independent_group_note(jsonb) from public,anon;
grant execute on function public.save_independent_group_note(jsonb) to authenticated;

create or replace function public.save_emr_group_note_amendment(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
 nid uuid;
 pid uuid;
 sid uuid;
 amendment_id uuid;
 reason_text text;
 amendment_text text;
begin
 if uid is null or (auth.jwt()->>'aal') is distinct from 'aal2'
  or not private.current_user_is_admin()
 then raise exception 'Administrator sign-in and MFA required' using errcode='42501';end if;
 if jsonb_typeof(p_payload) is distinct from 'object'
  or p_payload->'reviewed' is distinct from 'true'::jsonb
 then raise exception 'Clinician-reviewed amendment is required' using errcode='22023';end if;
 begin
  nid:=(p_payload->>'note_id')::uuid;
  pid:=(p_payload->>'patient_id')::uuid;
  sid:=(p_payload->>'session_id')::uuid;
 exception when others then
  raise exception 'Valid note and patient/session IDs required' using errcode='22023';
 end;
 if nid is null or pid is null or not(p_payload ? 'session_id') or not exists(
  select 1 from public.emr_group_individual_notes n where n.id=nid and n.owner_id=uid and n.patient_id=pid and n.session_id is not distinct from sid
  and ((sid is null and exists(select 1 from auth.users u where u.id=uid and u.email_confirmed_at is not null))
  or exists(select 1 from public.emr_group_participation p where p.patient_id=n.patient_id and p.session_id=n.session_id and p.owner_id=uid and p.attendance='Present'))
 ) then raise exception 'Authorized patient note unavailable' using errcode='22023';end if;
 if jsonb_typeof(p_payload->'reason') is distinct from 'string'
  or jsonb_typeof(p_payload->'amendment') is distinct from 'string'
 then raise exception 'Amendment reason and text required' using errcode='22023';end if;
 reason_text:=btrim(p_payload->>'reason');
 amendment_text:=btrim(p_payload->>'amendment');
 if length(reason_text) not between 5 and 200
  or length(amendment_text) not between 5 and 4000
 then raise exception 'Amendment reason or text outside allowed length' using errcode='22023';end if;
 insert into public.emr_group_note_amendments(note_id,owner_id,reason,amendment,reviewed)
 values(nid,uid,reason_text,amendment_text,true) returning id into amendment_id;
 return amendment_id;
end $$;
revoke all on function public.save_emr_group_note_amendment(jsonb) from public,anon;
grant execute on function public.save_emr_group_note_amendment(jsonb) to authenticated;

alter table public.emr_group_note_attestations drop constraint emr_group_note_attestations_statement_check;
alter table public.emr_group_note_attestations add constraint emr_group_note_attestations_statement_check check(statement in ('I personally authored or reviewed this group encounter note, verified the patient and attended session, and attest its original content is accurate to the best of my knowledge.','I personally authored or reviewed this group encounter note, verified the patient and documented session details, and attest its original content is accurate to the best of my knowledge.'));

create or replace function public.attest_emr_group_individual_note(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
 pid uuid;
 gid uuid;
 nid uuid;
 entered_name text;
 profile_name text;
 source_note public.emr_group_individual_notes%rowtype;
 attestation_id uuid;
begin
 if uid is null or (auth.jwt()->>'aal') is distinct from 'aal2'
  or not private.current_user_is_admin()
  or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null)
 then raise exception 'Verified administrator MFA required' using errcode='42501';end if;
 if jsonb_typeof(p_payload) is distinct from 'object'
  or p_payload->'attested' is distinct from 'true'::jsonb
 then raise exception 'Explicit author attestation required' using errcode='22023';end if;
 begin
  nid:=(p_payload->>'note_id')::uuid;
  pid:=(p_payload->>'patient_id')::uuid;
  gid:=(p_payload->>'session_id')::uuid;
 exception when others then
  raise exception 'Valid note, patient and session IDs required' using errcode='22023';
 end;
 if nid is null or pid is null or not(p_payload ? 'session_id') then
  raise exception 'Valid note, patient and session IDs required' using errcode='22023';end if;
 if jsonb_typeof(p_payload->'typed_name') is distinct from 'string'
 then raise exception 'Typed full profile name required' using errcode='22023';end if;
 entered_name:=btrim(p_payload->>'typed_name');
 select btrim(full_name) into profile_name from public.profiles
  where id=uid and account_type='admin';
 if profile_name is null or length(profile_name) not between 3 and 160
  or lower(entered_name) is distinct from lower(profile_name)
 then raise exception 'Typed name must match your verified administrator profile' using errcode='22023';end if;
 select * into source_note from public.emr_group_individual_notes
   where id=nid and patient_id=pid and session_id is not distinct from gid and owner_id=uid for share;
 if not found then raise exception 'Selected authored group note unavailable' using errcode='22023';end if;
 if gid is not null and not exists(select 1 from public.emr_group_participation
  where session_id=gid and patient_id=pid and owner_id=uid and attendance='Present')
 then raise exception 'Verified group attendance required' using errcode='22023';end if;
 insert into public.emr_group_note_attestations
  (note_id,owner_id,signer_name,statement,signed_content)
 values(nid,uid,profile_name,
  case when gid is null then 'I personally authored or reviewed this group encounter note, verified the patient and documented session details, and attest its original content is accurate to the best of my knowledge.' else 'I personally authored or reviewed this group encounter note, verified the patient and attended session, and attest its original content is accurate to the best of my knowledge.' end,
  jsonb_build_object('patient_id',source_note.patient_id,
    'session_id',source_note.session_id,'template',source_note.template,
    'sections',source_note.sections,'created_at',source_note.created_at)
    ||case when gid is null then jsonb_build_object('group_name',source_note.group_name,'encounter_at',source_note.encounter_at) else '{}'::jsonb end)
 on conflict(note_id) do nothing returning id into attestation_id;
 if attestation_id is null then
  raise exception 'This original group note was already attested' using errcode='23505';end if;
 return attestation_id;
end $$;
revoke all on function public.attest_emr_group_individual_note(jsonb) from public,anon;
grant execute on function public.attest_emr_group_individual_note(jsonb) to authenticated;
