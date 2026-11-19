-- Append-only section revisions; original notes and attestations are never rewritten.
create table public.emr_individual_progress_note_revisions (
 id uuid primary key default gen_random_uuid(),
 note_id uuid not null references public.emr_individual_progress_notes(id),
 owner_id uuid not null references auth.users(id),
 prior_id uuid references public.emr_individual_progress_note_revisions(id),
 revision integer not null check(revision>0),
 reason text not null check(length(btrim(reason)) between 5 and 200),
 before_sections jsonb not null check(jsonb_typeof(before_sections)='object'),
 sections jsonb not null check(jsonb_typeof(sections)='object'),
 after_window boolean not null,
 reviewed boolean not null check(reviewed=true),
 created_at timestamptz not null default clock_timestamp(),
 unique(note_id,revision)
);
create index emr_note_revision_owner_idx on public.emr_individual_progress_note_revisions(owner_id,note_id,revision);
alter table public.emr_individual_progress_note_revisions enable row level security;
revoke all on public.emr_individual_progress_note_revisions from public,anon,authenticated;
grant select on public.emr_individual_progress_note_revisions to authenticated;
create policy emr_note_revision_owner_read on public.emr_individual_progress_note_revisions
for select to authenticated using (
 owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
 and private.current_user_is_admin()
 and exists(select 1 from public.emr_individual_progress_notes n
  where n.id=emr_individual_progress_note_revisions.note_id and n.owner_id=emr_individual_progress_note_revisions.owner_id)
);
create function private.session_note_revision_is_late(original_recorded timestamptz, revised_at timestamptz) returns boolean
language sql immutable strict security invoker set search_path='' as $$select revised_at>original_recorded+interval '72 hours'$$;
revoke all on function private.session_note_revision_is_late(timestamptz,timestamptz) from public,anon,authenticated;
create function private.revise_emr_session_note(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); pid uuid; nid uuid; expected uuid; result uuid;
 original public.emr_individual_progress_notes%rowtype;
 prior public.emr_individual_progress_note_revisions%rowtype;
 fields jsonb; required_fields text[]; key text; reason_text text; recorded timestamptz;
begin
 if uid is null or (auth.jwt()->>'aal') is distinct from 'aal2' or not private.current_user_is_admin()
 or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null)
 then raise exception 'Verified administrator MFA required' using errcode='42501';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->'reviewed' is distinct from 'true'::jsonb
 or not (p_payload ? 'expected_prior_id')
 or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('patient_id','note_id','expected_prior_id','sections','reason','reviewed'))
 then raise exception 'Exact reviewed revision fields required' using errcode='22023';end if;
 begin
  pid:=(p_payload->>'patient_id')::uuid; nid:=(p_payload->>'note_id')::uuid;
  expected:=(p_payload->>'expected_prior_id')::uuid;
 exception when others then raise exception 'Valid patient, note and prior revision IDs required' using errcode='22023';end;
 select * into original from public.emr_individual_progress_notes where id=nid and patient_id=pid and owner_id=uid for update;
 if not found or original.template not in ('SOAP','DAP') then raise exception 'Original session note unavailable' using errcode='22023';end if;
 select * into prior from public.emr_individual_progress_note_revisions where note_id=nid order by revision desc limit 1;
 if prior.id is distinct from expected then raise exception 'This note changed. Reload the record before revising.' using errcode='40001';end if;
 required_fields:=case original.template when 'SOAP' then array['subjective','objective','assessment','plan'] else array['data','assessment','plan'] end;
 fields:=p_payload->'sections';
 if jsonb_typeof(fields) is distinct from 'object' or (select count(*) from jsonb_object_keys(fields))<>array_length(required_fields,1)
 then raise exception 'Exact note sections required' using errcode='22023';end if;
 foreach key in array required_fields loop
  if jsonb_typeof(fields->key) is distinct from 'string' or length(fields->>key)>4000 then raise exception 'Each note section must contain text within 4000 characters' using errcode='22023';end if;
 end loop;
 if not exists(select 1 from jsonb_each_text(fields) f where length(btrim(f.value))>0)
 then raise exception 'A clinical note cannot be entirely empty' using errcode='22023';end if;
 if fields=coalesce(prior.sections,original.sections) then raise exception 'No note changes entered' using errcode='22023';end if;
 if jsonb_typeof(p_payload->'reason') is distinct from 'string' then raise exception 'Correction reason required' using errcode='22023';end if;
 reason_text:=btrim(p_payload->>'reason');
 if length(reason_text) not between 5 and 200 then raise exception 'Correction reason must be 5-200 characters' using errcode='22023';end if;
 recorded:=clock_timestamp();
 insert into public.emr_individual_progress_note_revisions(note_id,owner_id,prior_id,revision,reason,before_sections,sections,after_window,reviewed,created_at)
 values(nid,uid,prior.id,coalesce(prior.revision,0)+1,reason_text,coalesce(prior.sections,original.sections),fields,
 private.session_note_revision_is_late(original.created_at,recorded),true,recorded) returning id into result;
 return result;
end $$;
revoke all on function private.revise_emr_session_note(jsonb) from public,anon;
grant execute on function private.revise_emr_session_note(jsonb) to authenticated;
create function public.revise_emr_session_note(p_payload jsonb) returns uuid
language sql security invoker set search_path='' as $$select private.revise_emr_session_note(p_payload)$$;
revoke all on function public.revise_emr_session_note(jsonb) from public,anon;
grant execute on function public.revise_emr_session_note(jsonb) to authenticated;
