-- Additive standalone outpatient progress notes and immutable clinician-reviewed addenda.
-- Does not migrate synthetic prototype records, sign notes, or create billing claims.
create table public.emr_individual_progress_notes (
 id uuid primary key default gen_random_uuid(),
 patient_id uuid not null references public.clinical_patients(id),
 owner_id uuid not null default auth.uid() references auth.users(id),
 encounter_at timestamptz not null,
 encounter_type text not null check (encounter_type in ('Individual therapy','Initial evaluation','Follow-up','Other clinical encounter')),
 template text not null check (template in ('DAP','SOAP','Narrative')),
 sections jsonb not null check (jsonb_typeof(sections)='object'),
 reviewed boolean not null check(reviewed=true),
 created_at timestamptz not null default now()
);
create index emr_individual_progress_notes_patient_idx
 on public.emr_individual_progress_notes(owner_id,patient_id,encounter_at desc,created_at desc);
alter table public.emr_individual_progress_notes enable row level security;
revoke all on public.emr_individual_progress_notes from public,anon,authenticated;
grant select on public.emr_individual_progress_notes to authenticated;
create policy emr_individual_progress_notes_owner_read on public.emr_individual_progress_notes
 for select to authenticated using(
 owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
 and private.current_user_is_admin()
);

create table public.emr_individual_progress_note_addenda (
 id uuid primary key default gen_random_uuid(),
 note_id uuid not null references public.emr_individual_progress_notes(id),
 owner_id uuid not null default auth.uid() references auth.users(id),
 reason text not null check(length(btrim(reason)) between 5 and 200),
 amendment text not null check(length(btrim(amendment)) between 5 and 4000),
 reviewed boolean not null check(reviewed=true),
 created_at timestamptz not null default now()
);
create index emr_individual_progress_note_addenda_note_idx
 on public.emr_individual_progress_note_addenda(note_id,owner_id,created_at);
alter table public.emr_individual_progress_note_addenda enable row level security;
revoke all on public.emr_individual_progress_note_addenda from public,anon,authenticated;
grant select on public.emr_individual_progress_note_addenda to authenticated;
create policy emr_individual_progress_note_addenda_owner_read on public.emr_individual_progress_note_addenda
 for select to authenticated using(
 owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
 and private.current_user_is_admin()
 and exists(select 1 from public.emr_individual_progress_notes n
  where n.id=emr_individual_progress_note_addenda.note_id
   and n.owner_id=emr_individual_progress_note_addenda.owner_id)
);

create function public.save_emr_individual_progress_note(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
 pid uuid;
 nid uuid;
 kind text;
 typ text;
 encounter timestamptz;
 fields jsonb;
 required_fields text[];
 key text;
 value text;
begin
 if uid is null or (auth.jwt()->>'aal') is distinct from 'aal2' or not private.current_user_is_admin()
 then raise exception 'Administrator sign-in and MFA required' using errcode='42501';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->'reviewed' is distinct from 'true'::jsonb
 then raise exception 'Clinician-reviewed progress note required' using errcode='22023';end if;
 begin
  pid:=(p_payload->>'patient_id')::uuid;
  encounter:=(p_payload->>'encounter_at')::timestamptz;
 exception when others then raise exception 'Valid patient and encounter date required' using errcode='22023';end;
 if pid is null or encounter is null or not exists(select 1 from public.clinical_patients where id=pid)
 then raise exception 'Central patient unavailable' using errcode='22023';end if;
 typ:=p_payload->>'encounter_type';
 if typ is null or typ not in ('Individual therapy','Initial evaluation','Follow-up','Other clinical encounter')
 then raise exception 'Unsupported clinical encounter type' using errcode='22023';end if;
 kind:=p_payload->>'template';
 if kind='DAP' then required_fields:=array['data','assessment','plan'];
 elsif kind='SOAP' then required_fields:=array['subjective','objective','assessment','plan'];
 elsif kind='Narrative' then required_fields:=array['narrative'];
 else raise exception 'Unsupported progress-note template' using errcode='22023';end if;
 fields:=p_payload->'sections';
 if jsonb_typeof(fields) is distinct from 'object'
  or (select count(*) from jsonb_object_keys(fields))<>array_length(required_fields,1)
 then raise exception 'Expected exact clinical note sections' using errcode='22023';end if;
 foreach key in array required_fields loop
  if jsonb_typeof(fields->key) is distinct from 'string'
  then raise exception 'Each note section must be text' using errcode='22023';end if;
  value:=btrim(fields->>key);
  if length(value) not between 2 and 4000
  then raise exception 'Progress-note sections must contain 2–4000 characters' using errcode='22023';end if;
  fields:=jsonb_set(fields,array[key],to_jsonb(value),false);
 end loop;
 insert into public.emr_individual_progress_notes
  (patient_id,owner_id,encounter_at,encounter_type,template,sections,reviewed)
 values(pid,uid,encounter,typ,kind,fields,true) returning id into nid;
 return nid;
end $$;
revoke all on function public.save_emr_individual_progress_note(jsonb) from public,anon;
grant execute on function public.save_emr_individual_progress_note(jsonb) to authenticated;

create function public.save_emr_individual_progress_note_addendum(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
 pid uuid;
 nid uuid;
 new_id uuid;
 reason_text text;
 amendment_text text;
begin
 if uid is null or (auth.jwt()->>'aal') is distinct from 'aal2' or not private.current_user_is_admin()
 then raise exception 'Administrator sign-in and MFA required' using errcode='42501';end if;
 if jsonb_typeof(p_payload) is distinct from 'object'
  or p_payload->'reviewed' is distinct from 'true'::jsonb
 then raise exception 'Clinician-reviewed addendum required' using errcode='22023';end if;
 begin
  nid:=(p_payload->>'note_id')::uuid;
  pid:=(p_payload->>'patient_id')::uuid;
 exception when others then raise exception 'Valid original note and patient IDs required' using errcode='22023';end;
 if nid is null or pid is null or not exists(
  select 1 from public.emr_individual_progress_notes
  where id=nid and patient_id=pid and owner_id=uid)
 then raise exception 'Original patient note unavailable' using errcode='22023';end if;
 if jsonb_typeof(p_payload->'reason') is distinct from 'string'
  or jsonb_typeof(p_payload->'amendment') is distinct from 'string'
 then raise exception 'Reason and addendum must be text' using errcode='22023';end if;
 reason_text:=btrim(p_payload->>'reason');
 amendment_text:=btrim(p_payload->>'amendment');
 if length(reason_text) not between 5 and 200 or length(amendment_text) not between 5 and 4000
 then raise exception 'Addendum reason or text outside allowed length' using errcode='22023';end if;
 insert into public.emr_individual_progress_note_addenda(note_id,owner_id,reason,amendment,reviewed)
 values(nid,uid,reason_text,amendment_text,true) returning id into new_id;
 return new_id;
end $$;
revoke all on function public.save_emr_individual_progress_note_addendum(jsonb) from public,anon;
grant execute on function public.save_emr_individual_progress_note_addendum(jsonb) to authenticated;
