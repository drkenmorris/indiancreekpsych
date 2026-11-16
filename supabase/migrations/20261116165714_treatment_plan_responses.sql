-- Treatment-plan participation and three structured rich-text narratives.
-- Existing plan records and narrative history are not rewritten.
alter table public.emr_treatment_modalities add column treatment_response jsonb;
grant update(treatment_response) on public.emr_treatment_modalities to authenticated;
create table public.emr_treatment_response_versions (
 patient_id uuid not null references public.clinical_patients(id),
 revision integer not null,
 response jsonb not null,
 recorded_by uuid not null references auth.users(id),
 recorded_at timestamptz not null default now(),
 primary key(patient_id,revision)
);
alter table public.emr_treatment_response_versions enable row level security;
revoke all on public.emr_treatment_response_versions from public,anon,authenticated;
grant select on public.emr_treatment_response_versions to authenticated;
create policy treatment_response_history_read on public.emr_treatment_response_versions for select to authenticated
 using (exists (select 1 from public.emr_treatment_modalities m where m.patient_id=emr_treatment_response_versions.patient_id));

create function private.valid_response_richtext(n jsonb,depth integer default 0) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare child jsonb; mark jsonb; a jsonb; typ text; child_type text; size_value text;
begin
 if depth>16 or jsonb_typeof(n) is distinct from 'object' then return false; end if;
 typ:=n->>'type';
 if typ is null or typ not in ('doc','paragraph','text','bulletList','orderedList','listItem','hardBreak')
  or (depth=0 and typ<>'doc') or (depth>0 and typ='doc')
  or exists(select 1 from jsonb_object_keys(n) k where k not in ('type','text','attrs','marks','content')) then return false; end if;
 if typ='text' then
  if jsonb_typeof(n->'text') is distinct from 'string' or char_length(n->>'text')=0 or n?'content' then return false; end if;
 elsif n?'text' then return false; end if;
 if n?'attrs' then
  a:=n->'attrs';
  if jsonb_typeof(a) is distinct from 'object' then return false; end if;
  if exists(select 1 from jsonb_object_keys(a) k where not (typ='paragraph' and k in ('textAlign','indent') or typ='orderedList' and k in ('start','type'))) then return false; end if;
  if a->>'textAlign' is not null and a->>'textAlign' not in ('left','center','right','justify') then return false; end if;
  if a->>'indent' is not null and (jsonb_typeof(a->'indent')<>'number' or a->>'indent' !~ '^[0-8]$') then return false; end if;
  if a->>'start' is not null and (jsonb_typeof(a->'start')<>'number' or a->>'start' !~ '^([1-9][0-9]{0,2}|1000)$') then return false; end if;
  if a->>'type' is not null and a->>'type'<>'1' then return false; end if;
 end if;
 if n?'marks' then
  if typ<>'text' or jsonb_typeof(n->'marks') is distinct from 'array' then return false; end if;
  if jsonb_array_length(n->'marks')>5 or (select count(distinct m->>'type') from jsonb_array_elements(n->'marks') m)<>jsonb_array_length(n->'marks') then return false; end if;
  for mark in select * from jsonb_array_elements(n->'marks') loop
   if jsonb_typeof(mark) is distinct from 'object' or coalesce(mark->>'type','') not in ('bold','italic','underline','strike','textStyle')
    or exists(select 1 from jsonb_object_keys(mark) k where k not in ('type','attrs')) then return false; end if;
   if mark?'attrs' then
    a:=mark->'attrs';
    if jsonb_typeof(a) is distinct from 'object' then return false; end if;
    if exists(select 1 from jsonb_object_keys(a) k where not (mark->>'type'='textStyle' and k in ('fontFamily','fontSize'))) then return false; end if;
    if a->>'fontFamily' is not null and a->>'fontFamily' not in ('Arial','Calibri','Georgia','Times New Roman','Verdana','Courier New') then return false; end if;
    if a->>'fontSize' is not null and a->>'fontSize' not in ('10pt','11pt','12pt','14pt','16pt','18pt','20pt','24pt') then return false; end if;
   end if;
  end loop;
 end if;
 if n?'content' then
  if typ in ('text','hardBreak') or jsonb_typeof(n->'content') is distinct from 'array' then return false; end if;
  if jsonb_array_length(n->'content')>2000 then return false; end if;
  for child in select * from jsonb_array_elements(n->'content') loop
   child_type:=child->>'type';
   if not private.valid_response_richtext(child,depth+1) then return false; end if;
   if not (typ in ('doc','listItem') and child_type in ('paragraph','bulletList','orderedList') or typ='paragraph' and child_type in ('text','hardBreak') or typ in ('bulletList','orderedList') and child_type='listItem') then return false; end if;
  end loop;
 elsif typ not in ('text','paragraph','hardBreak') then return false; end if;
 if typ not in ('text','paragraph','hardBreak') and jsonb_array_length(n->'content')=0 then return false; end if;
 return true;
end;
$$;
create function private.guard_emr_treatment_response() returns trigger
language plpgsql security invoker set search_path='' as $$
declare r jsonb; p jsonb; d jsonb; text_count integer; node_count integer;
begin
 r:=new.treatment_response;
 if r is null then
  if tg_op='UPDATE' and old.treatment_response is not null then raise exception 'Save a blank response revision instead of removing history'; end if;
  return new;
 end if;
 if jsonb_typeof(r) is distinct from 'object' then raise exception 'Invalid treatment response'; end if;
 if octet_length(r::text)>450000 or (select count(*) from jsonb_object_keys(r))<>4
  or r->>'schema' is distinct from 'treatment-response/1'
  or jsonb_typeof(r->'planReference') is distinct from 'string' or char_length(r->>'planReference')>200
  or jsonb_typeof(r->'participants') is distinct from 'array' or jsonb_typeof(r->'narratives') is distinct from 'object'
  then raise exception 'Invalid treatment response'; end if;
 if jsonb_array_length(r->'participants') not between 1 and 30 then raise exception 'Use 1 to 30 participants'; end if;
 if (select count(*) from jsonb_array_elements(r->'participants') participant where participant->>'role'='patient')<>1
  or (select count(distinct lower(participant->>'id')) from jsonb_array_elements(r->'participants') participant)<>jsonb_array_length(r->'participants') then raise exception 'Use one identified patient and unique participants'; end if;
 for p in select * from jsonb_array_elements(r->'participants') loop
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'Invalid participant'; end if;
  if (select count(*) from jsonb_object_keys(p))<>4 or coalesce(p->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(p->>'role','') not in ('patient','significant_other','parent','guardian','family')
   or jsonb_typeof(p->'name') is distinct from 'string' or char_length(p->>'name')>120
   or coalesce(p->>'approval','') not in ('yes','no','unanswered')
   or (p->>'role'<>'patient' and p->>'approval'<>'unanswered' and btrim(p->>'name')='') then raise exception 'Name each participant with a recorded approval'; end if;
 end loop;
 if (select count(*) from jsonb_object_keys(r->'narratives'))<>3 or not (r->'narratives'?&array['patient','significantOther','family']) then raise exception 'Use the three response narratives'; end if;
 for d in select value from jsonb_each(r->'narratives') loop
  if not private.valid_response_richtext(d) or octet_length(d::text)>150000 then raise exception 'Invalid narrative formatting'; end if;
  with recursive nodes(n) as (select d union all select child from nodes cross join lateral jsonb_array_elements(coalesce(n->'content','[]'::jsonb)) child)
  select coalesce(sum(char_length(n->>'text')),0),count(*) into text_count,node_count from nodes;
  if text_count>20000 or node_count>2000 then raise exception 'Narrative is too long'; end if;
 end loop;
 return new;
end;
$$;
create trigger emr_treatment_response_guard before insert or update of treatment_response on public.emr_treatment_modalities
 for each row execute function private.guard_emr_treatment_response();
create function private.record_emr_treatment_response_version() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or private.modality_role() not in ('admin','staff') then raise exception 'Clinic sign-in and MFA required'; end if;
 if new.treatment_response is not null and (tg_op='INSERT' or new.treatment_response is distinct from old.treatment_response) then
  insert into public.emr_treatment_response_versions(patient_id,revision,response,recorded_by)
   values(new.patient_id,new.revision,new.treatment_response,auth.uid());
 end if;
 return new;
end;
$$;
create trigger emr_treatment_response_history after insert or update of treatment_response on public.emr_treatment_modalities
 for each row execute function private.record_emr_treatment_response_version();
revoke all on function private.valid_response_richtext(jsonb,integer),private.guard_emr_treatment_response(),private.record_emr_treatment_response_version() from public,anon,authenticated;
grant execute on function private.valid_response_richtext(jsonb,integer) to authenticated;
