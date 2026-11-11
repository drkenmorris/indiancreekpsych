-- Additive original-note author attestations for patient-specific GROUP progress notes.
-- No synthetic records, billing claims, appointment changes or credential/licensure assertions.
create table public.emr_group_note_attestations (
 id uuid primary key default gen_random_uuid(),
 note_id uuid not null unique references public.emr_group_individual_notes(id),
 owner_id uuid not null references auth.users(id),
 signer_name text not null check(length(btrim(signer_name)) between 3 and 160),
 statement text not null check(statement = 'I personally authored or reviewed this group encounter note, verified the patient and attended session, and attest its original content is accurate to the best of my knowledge.'),
 signed_content jsonb not null check(jsonb_typeof(signed_content)='object'),
 signed_at timestamptz not null default now()
);
create index emr_group_note_attestations_owner_idx on public.emr_group_note_attestations(owner_id,note_id);
alter table public.emr_group_note_attestations enable row level security;
revoke all on public.emr_group_note_attestations from public,anon,authenticated;
grant select on public.emr_group_note_attestations to authenticated;
create policy emr_group_note_attestations_owner_read
 on public.emr_group_note_attestations for select to authenticated using(
 owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
 and private.current_user_is_admin()
 and exists(select 1 from public.emr_group_individual_notes n
  where n.id=emr_group_note_attestations.note_id
    and n.owner_id=emr_group_note_attestations.owner_id)
);

create function public.attest_emr_group_individual_note(p_payload jsonb) returns uuid
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
 if nid is null or pid is null or gid is null then
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
   where id=nid and patient_id=pid and session_id=gid and owner_id=uid for share;
 if not found then raise exception 'Selected authored group note unavailable' using errcode='22023';end if;
 if not exists(select 1 from public.emr_group_participation
  where session_id=gid and patient_id=pid and owner_id=uid and attendance='Present')
 then raise exception 'Verified group attendance required' using errcode='22023';end if;
 insert into public.emr_group_note_attestations
  (note_id,owner_id,signer_name,statement,signed_content)
 values(nid,uid,profile_name,
  'I personally authored or reviewed this group encounter note, verified the patient and attended session, and attest its original content is accurate to the best of my knowledge.',
  jsonb_build_object('patient_id',source_note.patient_id,
    'session_id',source_note.session_id,'template',source_note.template,
    'sections',source_note.sections,'created_at',source_note.created_at))
 on conflict(note_id) do nothing returning id into attestation_id;
 if attestation_id is null then
  raise exception 'This original group note was already attested' using errcode='23505';end if;
 return attestation_id;
end $$;
revoke all on function public.attest_emr_group_individual_note(jsonb) from public,anon;
grant execute on function public.attest_emr_group_individual_note(jsonb) to authenticated;
