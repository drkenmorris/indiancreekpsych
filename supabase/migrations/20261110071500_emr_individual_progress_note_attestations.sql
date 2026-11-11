-- Additive, author-bound attestations for immutable outpatient progress notes.
-- Explicitly NOT a claim of credential/licensure verification, HIPAA certification, or billing readiness.
-- This changes no existing note, appointment, or patient data and never loads synthetic demo records.
create table public.emr_individual_progress_note_attestations (
 id uuid primary key default gen_random_uuid(),
 note_id uuid not null unique references public.emr_individual_progress_notes(id),
 owner_id uuid not null references auth.users(id),
 signer_name text not null check (length(btrim(signer_name)) between 3 and 160),
 statement text not null check (statement = 'I personally authored or reviewed this encounter documentation, verified the patient identity, and attest that the original note is accurate to the best of my knowledge.'),
 signed_content jsonb not null check (jsonb_typeof(signed_content) = 'object'),
 signed_at timestamptz not null default now()
);
create index emr_individual_progress_note_attestations_owner_idx
 on public.emr_individual_progress_note_attestations(owner_id, note_id);
alter table public.emr_individual_progress_note_attestations enable row level security;
revoke all on public.emr_individual_progress_note_attestations from public,anon,authenticated;
grant select on public.emr_individual_progress_note_attestations to authenticated;
create policy emr_individual_note_attestation_owner_read
 on public.emr_individual_progress_note_attestations for select to authenticated
 using(
  owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
  and private.current_user_is_admin()
  and exists(select 1 from public.emr_individual_progress_notes n
    where n.id=note_id and n.owner_id=owner_id)
 );

create function public.attest_emr_individual_progress_note(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
 pid uuid;
 nid uuid;
 profile_name text;
 entered_name text;
 source_note public.emr_individual_progress_notes%rowtype;
 new_id uuid;
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
 exception when others then raise exception 'Valid note and patient IDs required' using errcode='22023';end;
 if nid is null or pid is null then
  raise exception 'Valid note and patient IDs required' using errcode='22023';end if;
 if jsonb_typeof(p_payload->'typed_name') is distinct from 'string' then
  raise exception 'Typed signer name required' using errcode='22023';end if;
 entered_name:=btrim(p_payload->>'typed_name');
 select btrim(full_name) into profile_name from public.profiles
  where id=uid and account_type='admin';
 if profile_name is null or length(profile_name) not between 3 and 160
  or lower(entered_name) is distinct from lower(profile_name)
 then raise exception 'Typed name must match the verified administrator profile' using errcode='22023';end if;
 select * into source_note from public.emr_individual_progress_notes
   where id=nid and patient_id=pid and owner_id=uid for share;
 if not found then raise exception 'Selected authored note unavailable' using errcode='22023';end if;
 insert into public.emr_individual_progress_note_attestations
  (note_id,owner_id,signer_name,statement,signed_content)
 values(nid,uid,profile_name,
  'I personally authored or reviewed this encounter documentation, verified the patient identity, and attest that the original note is accurate to the best of my knowledge.',
  jsonb_build_object('patient_id',source_note.patient_id,
     'encounter_at',source_note.encounter_at,'encounter_type',source_note.encounter_type,
     'template',source_note.template,'sections',source_note.sections,
     'created_at',source_note.created_at))
 on conflict(note_id) do nothing returning id into new_id;
 if new_id is null then raise exception 'This original note was already attested' using errcode='23505';end if;
 return new_id;
end $$;
revoke all on function public.attest_emr_individual_progress_note(jsonb) from public,anon;
grant execute on function public.attest_emr_individual_progress_note(jsonb) to authenticated;
