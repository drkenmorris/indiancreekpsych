-- Registered practice groups, selectable corpus, immutable shared clinical notes.
-- Prior standalone corpora and legacy shared sessions remain untouched.
create table public.emr_therapy_groups(id uuid primary key,revision integer not null check(revision>0),document jsonb not null,timezone text not null,updated_at timestamptz not null default clock_timestamp(),updated_by uuid not null references auth.users(id));
create table public.emr_therapy_group_versions(group_id uuid references public.emr_therapy_groups(id),revision integer not null,document jsonb not null,timezone text not null,recorded_by uuid references auth.users(id),recorded_at timestamptz not null default clock_timestamp(),primary key(group_id,revision));
create table public.emr_group_planning_libraries(group_id uuid primary key references public.emr_therapy_groups(id),revision integer not null check(revision>0),items jsonb not null,updated_by uuid references auth.users(id),updated_at timestamptz not null default clock_timestamp());
create table public.emr_group_planning_versions(group_id uuid references public.emr_therapy_groups(id),revision integer not null,items jsonb not null,recorded_by uuid references auth.users(id),recorded_at timestamptz not null default clock_timestamp(),primary key(group_id,revision));
create table public.emr_group_clinical_notes(id uuid primary key,group_id uuid not null references public.emr_therapy_groups(id),group_revision integer not null,library_revision integer not null,start_at timestamptz not null,end_at timestamptz not null check(end_at>start_at),group_snapshot jsonb not null,facilitator_snapshot jsonb not null,selections jsonb not null,narrative text not null,submission jsonb not null,recorded_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),foreign key(group_id,group_revision) references public.emr_therapy_group_versions(group_id,revision),foreign key(group_id,library_revision) references public.emr_group_planning_versions(group_id,revision));
create index group_clinical_history_idx on public.emr_group_clinical_notes(group_id,start_at desc,id desc);
create function private.emr_group_ready() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal'='aal2' and exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=auth.uid() and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now()) and (p.account_type='admin' or (p.account_type='staff' and exists(select 1 from public.emr_modality_providers r where r.provider_id=u.id)))),false)
$$;
create function private.emr_group_can_access(p_group uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.emr_group_ready() and exists(select 1 from public.emr_therapy_groups g where g.id=p_group and (private.current_user_is_admin() or (g.document->'facilitators') ? auth.uid()::text))
$$;
revoke all on function private.emr_group_ready(),private.emr_group_can_access(uuid) from public,anon;
grant execute on function private.emr_group_ready(),private.emr_group_can_access(uuid) to authenticated;
create function public.emr_group_access_ready() returns boolean language sql security invoker set search_path='' as $$select private.emr_group_ready()$$;
revoke all on function public.emr_group_access_ready() from public,anon;grant execute on function public.emr_group_access_ready() to authenticated;
-- Setup belongs only to practice administrators. Assigned enrolled staff read their own groups.
alter table public.emr_therapy_groups enable row level security;
alter table public.emr_therapy_group_versions enable row level security;
alter table public.emr_group_planning_libraries enable row level security;
alter table public.emr_group_planning_versions enable row level security;
alter table public.emr_group_clinical_notes enable row level security;
revoke all on public.emr_therapy_groups,public.emr_therapy_group_versions,public.emr_group_planning_libraries,public.emr_group_planning_versions,public.emr_group_clinical_notes from public,anon,authenticated;
grant select on public.emr_therapy_groups,public.emr_therapy_group_versions,public.emr_group_planning_libraries,public.emr_group_planning_versions,public.emr_group_clinical_notes to authenticated;
create policy group_registry_read on public.emr_therapy_groups for select to authenticated using(private.emr_group_can_access(id));
create policy group_setup_history_read on public.emr_therapy_group_versions for select to authenticated using(private.emr_group_can_access(group_id));
create policy group_library_read on public.emr_group_planning_libraries for select to authenticated using(private.emr_group_can_access(group_id));
create policy group_library_history_read on public.emr_group_planning_versions for select to authenticated using(private.emr_group_can_access(group_id));
create policy group_clinical_read on public.emr_group_clinical_notes for select to authenticated using(private.emr_group_can_access(group_id));
create function private.save_emr_therapy_group(p_id uuid,p_revision integer,p_document jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();s jsonb;t jsonb;v text;zone text;saved public.emr_therapy_groups%rowtype;
begin
 if not private.emr_group_ready() or not private.current_user_is_admin() then raise exception 'Administrator MFA required' using errcode='42501';end if;
 if p_id is null or p_revision is null or p_revision<0 or jsonb_typeof(p_document) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_document))<>5 or not(p_document ?& array['name','subject','schedules','facilitators','members']) or octet_length(p_document::text)>100000 then raise exception 'Invalid group setup' using errcode='22023';end if;
 if jsonb_typeof(p_document->'name') is distinct from 'string' or length(regexp_replace(p_document->>'name','^[[:space:]]+|[[:space:]]+$','','g')) not between 2 and 160 or length(p_document->>'name')>160 or jsonb_typeof(p_document->'subject') is distinct from 'string' or length(regexp_replace(p_document->>'subject','^[[:space:]]+|[[:space:]]+$','','g')) not between 2 and 8000 or length(p_document->>'subject')>8000 or jsonb_typeof(p_document->'schedules') is distinct from 'array' or jsonb_array_length(p_document->'schedules') not between 1 and 49 or jsonb_typeof(p_document->'facilitators') is distinct from 'array' or jsonb_array_length(p_document->'facilitators') not between 1 and 20 or jsonb_typeof(p_document->'members') is distinct from 'array' or jsonb_array_length(p_document->'members')>200 then raise exception 'Complete group name, subject, operating schedule and facilitators' using errcode='22023';end if;
 for s in select * from jsonb_array_elements(p_document->'schedules') loop
  if jsonb_typeof(s) is distinct from 'object' or (select count(*) from jsonb_object_keys(s))<>3 or not(s ?& array['day','start','end']) or jsonb_typeof(s->'day') is distinct from 'number' or (s->>'day')!~'^[0-6]$' or jsonb_typeof(s->'start') is distinct from 'string' or jsonb_typeof(s->'end') is distinct from 'string' or (s->>'start')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' or (s->>'end')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' or (s->>'end')<=(s->>'start') then raise exception 'Valid weekday and increasing time range required' using errcode='22023';end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_document->'schedules') with ordinality a(s,i) cross join jsonb_array_elements(p_document->'schedules') with ordinality b(t,j) where a.i<b.j and a.s->>'day'=b.t->>'day' and a.s->>'start'<b.t->>'end' and b.t->>'start'<a.s->>'end') then raise exception 'Overlapping group operating ranges' using errcode='22023';end if;
 for v in select jsonb_array_elements_text(p_document->'facilitators') loop
  if not exists(select 1 from private.modality_directory(false) p where p.id::text=v and p.enrolled) then raise exception 'Choose an eligible practice provider' using errcode='22023';end if;
 end loop;
 if (select count(*) from jsonb_array_elements_text(p_document->'facilitators'))<>(select count(distinct value) from jsonb_array_elements_text(p_document->'facilitators')) or (select count(*) from jsonb_array_elements_text(p_document->'members'))<>(select count(distinct value) from jsonb_array_elements_text(p_document->'members')) then raise exception 'Duplicate facilitator or patient' using errcode='22023';end if;
 for v in select jsonb_array_elements_text(p_document->'members') loop
  if not exists(select 1 from public.clinical_patients p where p.id::text=v and p.directory_deleted_at is null) then raise exception 'Choose an existing patient' using errcode='22023';end if;
 end loop;
 select timezone into zone from public.appointment_settings where id=true;
 if zone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then raise exception 'Clinic timezone unavailable' using errcode='22023';end if;
 if p_revision=0 then insert into public.emr_therapy_groups(id,revision,document,timezone,updated_by) values(p_id,1,p_document,zone,uid) on conflict do nothing returning * into saved;
 else update public.emr_therapy_groups set revision=revision+1,document=p_document,timezone=zone,updated_by=uid,updated_at=clock_timestamp() where id=p_id and revision=p_revision returning * into saved;end if;
 if not found then raise exception 'Group changed; reload before saving' using errcode='40001';end if;
 insert into public.emr_therapy_group_versions(group_id,revision,document,timezone,recorded_by) values(saved.id,saved.revision,saved.document,saved.timezone,uid);
 return jsonb_build_object('id',saved.id,'revision',saved.revision,'document',saved.document,'timezone',saved.timezone);
end $$;
create function private.save_emr_group_library(p_group uuid,p_revision integer,p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb;k text;locked_document jsonb;sid uuid;seen uuid[]:='{}';saved public.emr_group_planning_libraries%rowtype;
begin
 if not private.emr_group_can_access(p_group) then raise exception 'Assigned provider MFA required' using errcode='42501';end if;
 select document into locked_document from public.emr_therapy_groups where id=p_group for share;
 if not private.current_user_is_admin() and not (locked_document->'facilitators') ? auth.uid()::text then raise exception 'Group assignment changed' using errcode='42501';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>200 or octet_length(p_items::text)>500000 then raise exception 'Invalid bounded planning library' using errcode='22023';end if;
 for s in select * from jsonb_array_elements(p_items) loop
  if jsonb_typeof(s) is distinct from 'object' or (select count(*) from jsonb_object_keys(s))<>6 or not(s ?& array['id','subject','definition','goal','objective','planned_implementation']) or jsonb_typeof(s->'id') is distinct from 'string' then raise exception 'Invalid planning entry' using errcode='22023';end if;
  begin sid:=(s->>'id')::uuid;exception when others then raise exception 'Valid planning item ID required' using errcode='22023';end;
  if sid=any(seen) then raise exception 'Duplicate planning item' using errcode='22023';end if;seen:=array_append(seen,sid);
  foreach k in array array['subject','definition','goal','objective','planned_implementation'] loop
   if jsonb_typeof(s->k) is distinct from 'string' or length(s->>k)>(case when k='subject' then 500 else 15000 end) or (k='subject' and length(regexp_replace(s->>k,'^[[:space:]]+|[[:space:]]+$','','g'))<2) then raise exception 'Invalid planning text' using errcode='22023';end if;
  end loop;
 end loop;
 if p_revision=0 then insert into public.emr_group_planning_libraries(group_id,revision,items,updated_by) values(p_group,1,p_items,auth.uid()) on conflict do nothing returning * into saved;
 else update public.emr_group_planning_libraries set revision=revision+1,items=p_items,updated_by=auth.uid(),updated_at=clock_timestamp() where group_id=p_group and revision=p_revision returning * into saved;end if;
 if not found then raise exception 'Planning library changed; reload before saving' using errcode='40001';end if;
 insert into public.emr_group_planning_versions(group_id,revision,items,recorded_by) values(p_group,saved.revision,saved.items,auth.uid());
 return jsonb_build_object('groupId',p_group,'revision',saved.revision,'items',saved.items);
end $$;
create function private.save_emr_group_clinical_note(p_id uuid,p_note jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare g public.emr_therapy_groups%rowtype;l public.emr_group_planning_libraries%rowtype;old public.emr_group_clinical_notes%rowtype;v text;s jsonb;k text;fac jsonb;started timestamptz;ended timestamptz;gid uuid;
begin
 if p_id is null or jsonb_typeof(p_note) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_note))<>9 or not(p_note ?& array['group_id','group_revision','library_revision','start_at','end_at','facilitator_ids','selections','narrative','reviewed']) or octet_length(p_note::text)>500000 then raise exception 'Invalid shared note' using errcode='22023';end if;
 begin gid:=(p_note->>'group_id')::uuid;exception when others then raise exception 'Valid group required' using errcode='22023';end;
 if not private.emr_group_can_access(gid) then raise exception 'Assigned provider MFA required' using errcode='42501';end if;
 select * into old from public.emr_group_clinical_notes where id=p_id;
 if found then if old.group_id=gid and old.recorded_by=auth.uid() and old.submission=p_note then return old.id;else raise exception 'Note reference conflict' using errcode='40001';end if;end if;
 select * into g from public.emr_therapy_groups where id=gid for share;
 if not private.current_user_is_admin() and not (g.document->'facilitators') ? auth.uid()::text then raise exception 'Group assignment changed' using errcode='42501';end if;
 select * into l from public.emr_group_planning_libraries where group_id=gid for share;
 if l.group_id is null or p_note->'group_revision' is distinct from to_jsonb(g.revision) or p_note->'library_revision' is distinct from to_jsonb(l.revision) then raise exception 'Group or planning library changed; reload before saving' using errcode='40001';end if;
 if p_note->'reviewed' is distinct from 'true'::jsonb or jsonb_typeof(p_note->'narrative') is distinct from 'string' or length(regexp_replace(p_note->>'narrative','^[[:space:]]+|[[:space:]]+$','','g')) not between 2 and 20000 or jsonb_typeof(p_note->'facilitator_ids') is distinct from 'array' or jsonb_array_length(p_note->'facilitator_ids') not between 1 and 20 or jsonb_typeof(p_note->'selections') is distinct from 'array' or jsonb_array_length(p_note->'selections') not between 1 and 50 then raise exception 'Complete and review the group-wide note' using errcode='22023';end if;
 if (p_note->>'start_at')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$' or (p_note->>'end_at')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$' then raise exception 'Explicit session instants required' using errcode='22023';end if;
 begin started:=(p_note->>'start_at')::timestamptz;ended:=(p_note->>'end_at')::timestamptz;exception when others then raise exception 'Valid session instants required' using errcode='22023';end;
 if started is null or ended is null or ended<=started or ended-started>interval '24 hours' then raise exception 'Increasing session time within 24 hours required' using errcode='22023';end if;
 for v in select jsonb_array_elements_text(p_note->'facilitator_ids') loop
  if not (g.document->'facilitators') ? v or not exists(select 1 from private.modality_directory(false) p where p.id::text=v and p.enrolled) then raise exception 'Choose assigned facilitators' using errcode='22023';end if;
 end loop;
 if (select count(*) from jsonb_array_elements_text(p_note->'facilitator_ids'))<>(select count(distinct value) from jsonb_array_elements_text(p_note->'facilitator_ids')) then raise exception 'Duplicate facilitator' using errcode='22023';end if;
 for s in select * from jsonb_array_elements(p_note->'selections') loop
  if jsonb_typeof(s) is distinct from 'object' or (select count(*) from jsonb_object_keys(s))<>5 or not(s ?& array['subject','definition','goal','objective','planned_implementation']) or jsonb_typeof(s->'subject') is distinct from 'string' or length(regexp_replace(s->>'subject','^[[:space:]]+|[[:space:]]+$','','g'))<2 or not exists(select 1 from jsonb_array_elements(l.items) i where i->>'subject'=s->>'subject') then raise exception 'Choose a subject from this group library' using errcode='22023';end if;
  foreach k in array array['definition','goal','objective','planned_implementation'] loop
   if jsonb_typeof(s->k) is distinct from 'string' or ((s->>k)<>'' and not exists(select 1 from jsonb_array_elements(l.items) i where i->>'subject'=s->>'subject' and i->>k=s->>k)) then raise exception 'Choose planning fields from the selected group subject' using errcode='22023';end if;
  end loop;
 end loop;
 select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name) order by p.name,p.id) into fac from private.modality_directory(false) p where (p_note->'facilitator_ids') ? p.id::text;
 insert into public.emr_group_clinical_notes(id,group_id,group_revision,library_revision,start_at,end_at,group_snapshot,facilitator_snapshot,selections,narrative,submission,recorded_by) values(p_id,gid,g.revision,l.revision,started,ended,jsonb_build_object('name',g.document->>'name','subject',g.document->>'subject','timezone',g.timezone),fac,p_note->'selections',p_note->>'narrative',p_note,auth.uid());
 return p_id;
end $$;
create function private.emr_group_patient_directory(p_after uuid default null) returns table(id uuid,name text,active boolean) language plpgsql stable security definer set search_path='' as $$
begin
 if not private.emr_group_ready() or not private.current_user_is_admin() then raise exception 'Administrator MFA required' using errcode='42501';end if;
 return query select p.id,coalesce(nullif(btrim(concat_ws(' ',p.demographics->>'first_name',p.demographics->>'last_name')),''),nullif(btrim(profile.full_name),''),'Patient '||left(p.id::text,8)),p.demographics->>'active' is distinct from 'false' from public.clinical_patients p left join public.profiles profile on profile.id=p.account_id where p.directory_deleted_at is null and (p_after is null or p.id>p_after) order by p.id limit 101;
end $$;
revoke all on function private.save_emr_therapy_group(uuid,integer,jsonb),private.save_emr_group_library(uuid,integer,jsonb),private.save_emr_group_clinical_note(uuid,jsonb),private.emr_group_patient_directory(uuid) from public,anon;
grant execute on function private.save_emr_therapy_group(uuid,integer,jsonb),private.save_emr_group_library(uuid,integer,jsonb),private.save_emr_group_clinical_note(uuid,jsonb),private.emr_group_patient_directory(uuid) to authenticated;
create function public.save_emr_therapy_group(p_id uuid,p_revision integer,p_document jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_emr_therapy_group(p_id,p_revision,p_document)$$;
create function public.save_emr_group_library(p_group uuid,p_revision integer,p_items jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_emr_group_library(p_group,p_revision,p_items)$$;
create function public.save_emr_group_clinical_note(p_id uuid,p_note jsonb) returns uuid language sql security invoker set search_path='' as $$select private.save_emr_group_clinical_note(p_id,p_note)$$;
create function public.emr_group_patient_directory(p_after uuid default null) returns table(id uuid,name text,active boolean) language sql security invoker set search_path='' as $$select * from private.emr_group_patient_directory(p_after)$$;
revoke all on function public.save_emr_therapy_group(uuid,integer,jsonb),public.save_emr_group_library(uuid,integer,jsonb),public.save_emr_group_clinical_note(uuid,jsonb),public.emr_group_patient_directory(uuid) from public,anon;
grant execute on function public.save_emr_therapy_group(uuid,integer,jsonb),public.save_emr_group_library(uuid,integer,jsonb),public.save_emr_group_clinical_note(uuid,jsonb),public.emr_group_patient_directory(uuid) to authenticated;
