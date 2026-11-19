-- Account-owned editable generic criteria. Patient saves retain selected wording snapshots.
create table public.emr_discharge_criteria_libraries(
 account_id uuid primary key references auth.users(id),
 revision integer not null check(revision>0),
 items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=250),
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.emr_discharge_criteria_libraries enable row level security;
revoke all on public.emr_discharge_criteria_libraries from public,anon,authenticated;
grant select on public.emr_discharge_criteria_libraries to authenticated;
create policy discharge_criteria_library_owner_read on public.emr_discharge_criteria_libraries for select to authenticated using(account_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin());
create function private.save_discharge_criteria_library(p_revision integer,p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();item jsonb;item_id uuid;ids uuid[]:='{}';labels text[]:='{}';label text;saved public.emr_discharge_criteria_libraries%rowtype;
begin
 if uid is null or (auth.jwt()->>'aal') is distinct from 'aal2' or not private.current_user_is_admin() or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'Verified administrator MFA required' using errcode='42501';end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>250 or octet_length(p_items::text)>650000 then raise exception 'Valid revision and bounded criteria list required' using errcode='22023';end if;
 for item in select * from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item) is distinct from 'object' or (select count(*) from jsonb_object_keys(item))<>3 or not(item ?& array['id','text','active']) or jsonb_typeof(item->'id') is distinct from 'string' or jsonb_typeof(item->'text') is distinct from 'string' or jsonb_typeof(item->'active') is distinct from 'boolean' then raise exception 'Exact criterion ID, wording and active status required' using errcode='22023';end if;
  begin item_id:=(item->>'id')::uuid;exception when others then raise exception 'Valid criterion UUID required' using errcode='22023';end;
  label:=btrim(item->>'text');if length(label) not between 2 and 500 or label<>item->>'text' or item_id=any(ids) or lower(label)=any(labels) then raise exception 'Unique criterion IDs and wording within 2-500 characters required' using errcode='22023';end if;
  ids:=array_append(ids,item_id);labels:=array_append(labels,lower(label));
 end loop;
 if p_revision>0 and not exists(select 1 from public.emr_discharge_criteria_libraries where account_id=uid) then raise exception 'Library changed; refresh before saving' using errcode='40001';end if;
 insert into public.emr_discharge_criteria_libraries(account_id,revision,items) values(uid,1,p_items)
 on conflict(account_id) do update set items=excluded.items,revision=emr_discharge_criteria_libraries.revision+1,updated_at=clock_timestamp() where emr_discharge_criteria_libraries.revision=p_revision returning * into saved;
 if not found then raise exception 'Library changed; refresh before saving' using errcode='40001';end if;
 return jsonb_build_object('revision',saved.revision,'items',saved.items);
end $$;
revoke all on function private.save_discharge_criteria_library(integer,jsonb) from public,anon;
grant execute on function private.save_discharge_criteria_library(integer,jsonb) to authenticated;
create function public.save_discharge_criteria_library(p_revision integer,p_items jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_discharge_criteria_library(p_revision,p_items)$$;
revoke all on function public.save_discharge_criteria_library(integer,jsonb) from public,anon;
grant execute on function public.save_discharge_criteria_library(integer,jsonb) to authenticated;
