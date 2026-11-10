-- Immutable, clinician-reviewed addenda for patient-specific group progress notes.
-- The original unsigned note remains intact; no simulated signatures or billing actions.
create table public.emr_group_note_amendments (
 id uuid primary key default gen_random_uuid(),
 note_id uuid not null references public.emr_group_individual_notes(id),
 owner_id uuid not null default auth.uid() references auth.users(id),
 reason text not null check(length(btrim(reason)) between 5 and 200),
 amendment text not null check(length(btrim(amendment)) between 5 and 4000),
 reviewed boolean not null check(reviewed=true),
 created_at timestamptz not null default now()
);
create index emr_group_note_amendments_note_idx
 on public.emr_group_note_amendments(note_id,created_at desc);
alter table public.emr_group_note_amendments enable row level security;
revoke all on public.emr_group_note_amendments from public,anon,authenticated;
grant select on public.emr_group_note_amendments to authenticated;
create policy emr_group_note_amendments_read on public.emr_group_note_amendments
 for select to authenticated using (
 owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
 and private.current_user_is_admin()
 and exists(select 1 from public.emr_group_individual_notes n
  where n.id=emr_group_note_amendments.note_id
   and n.owner_id=emr_group_note_amendments.owner_id)
);

create function public.save_emr_group_note_amendment(p_payload jsonb) returns uuid
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
 if nid is null or pid is null or sid is null or not exists(
  select 1 from public.emr_group_individual_notes n
  join public.emr_group_participation p
   on p.patient_id=n.patient_id and p.session_id=n.session_id and p.owner_id=n.owner_id
  where n.id=nid and n.owner_id=uid and n.patient_id=pid and n.session_id=sid
   and p.attendance='Present'
 ) then raise exception 'Authorized attended patient note unavailable' using errcode='22023';end if;
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
