-- Dedicated patient-specific group notes. Additive to immutable shared group attendance;
-- no demo SQLite roster, no signatures, and no claim/billing creation.
create table public.emr_group_individual_notes (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 session_id uuid not null,
 patient_id uuid not null,
 template text not null check (template in ('DAP','SOAP','Narrative')),
 sections jsonb not null check (jsonb_typeof(sections)='object'),
 reviewed boolean not null check (reviewed=true),
 created_at timestamptz not null default now(),
 constraint emr_group_individual_notes_participant_fk
   foreign key (session_id,patient_id) references public.emr_group_participation(session_id,patient_id)
);
create index emr_group_individual_notes_patient_date_idx
 on public.emr_group_individual_notes(owner_id,patient_id,created_at desc);
create index emr_group_individual_notes_session_idx
 on public.emr_group_individual_notes(session_id,owner_id);
alter table public.emr_group_individual_notes enable row level security;
revoke all on public.emr_group_individual_notes from public,anon,authenticated;
grant select on public.emr_group_individual_notes to authenticated;
create policy emr_group_individual_notes_read on public.emr_group_individual_notes
 for select to authenticated using(
 owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
 and private.current_user_is_admin()
 and exists (select 1 from public.emr_group_participation p
   where p.session_id=emr_group_individual_notes.session_id
    and p.patient_id=emr_group_individual_notes.patient_id
    and p.owner_id=emr_group_individual_notes.owner_id)
);

create function public.save_emr_group_individual_note(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid();
 gid uuid;
 pid uuid;
 nid uuid;
 kind text;
 fields jsonb;
 required_fields text[];
 key text;
 value text;
begin
 if uid is null or (auth.jwt()->>'aal') is distinct from 'aal2' or not private.current_user_is_admin()
 then raise exception 'Administrator sign-in and MFA required' using errcode='42501';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->'reviewed' is distinct from 'true'::jsonb
 then raise exception 'A reviewed individual note is required' using errcode='22023';end if;
 begin
  gid := (p_payload->>'session_id')::uuid;pid := (p_payload->>'patient_id')::uuid;
 exception when others then raise exception 'Valid group session and patient IDs are required' using errcode='22023';end;
 if gid is null or pid is null or not exists(
  select 1 from public.emr_group_sessions where id=gid and owner_id=uid)
 then raise exception 'Group session unavailable' using errcode='22023';end if;
 if not exists(
  select 1 from public.emr_group_participation
  where session_id=gid and patient_id=pid and owner_id=uid and attendance='Present')
 then raise exception 'Patient must have attended this authorized session' using errcode='22023';end if;
 kind := p_payload->>'template';
 if kind='DAP' then required_fields:=array['data','assessment','plan'];
 elsif kind='SOAP' then required_fields:=array['subjective','objective','assessment','plan'];
 elsif kind='Narrative' then required_fields:=array['narrative'];
 else raise exception 'Unsupported progress-note template' using errcode='22023';end if;
 fields:=p_payload->'sections';
 if jsonb_typeof(fields) is distinct from 'object'
  or (select count(*) from jsonb_object_keys(fields))<>array_length(required_fields,1)
 then raise exception 'Expected exact progress-note sections' using errcode='22023';end if;
 foreach key in array required_fields loop
  if jsonb_typeof(fields->key) is distinct from 'string'
  then raise exception 'Progress-note section is required' using errcode='22023';end if;
  value:=btrim(fields->>key);
  if length(value) not between 2 and 4000
  then raise exception 'Progress-note sections must contain 2–4000 characters' using errcode='22023';end if;
  fields:=jsonb_set(fields,array[key],to_jsonb(value),false);
 end loop;
 insert into public.emr_group_individual_notes
  (owner_id,session_id,patient_id,template,sections,reviewed)
 values(uid,gid,pid,kind,fields,true) returning id into nid;
 return nid;
end $$;
revoke all on function public.save_emr_group_individual_note(jsonb) from public,anon;
grant execute on function public.save_emr_group_individual_note(jsonb) to authenticated;
