-- Focused group corpus, independently owned and versioned; no individual planner/patient FK.
create table public.emr_group_corpora(
 id uuid primary key, owner_id uuid not null references auth.users(id),
 group_name text not null check(length(group_name) between 2 and 160),
 revision integer not null check(revision>0), document jsonb not null,
 updated_at timestamptz not null default clock_timestamp(), unique(id,owner_id)
);
create index emr_group_corpora_owner_id_idx on public.emr_group_corpora(owner_id,id);
create table public.emr_group_corpus_versions(
 group_id uuid not null, owner_id uuid not null, revision integer not null check(revision>0),
 document jsonb not null, recorded_at timestamptz not null default clock_timestamp(),
 primary key(group_id,revision), foreign key(group_id,owner_id) references public.emr_group_corpora(id,owner_id)
);
create index emr_group_corpus_versions_owner_idx on public.emr_group_corpus_versions(owner_id,group_id);
alter table public.emr_group_corpora enable row level security;
alter table public.emr_group_corpus_versions enable row level security;
revoke all on public.emr_group_corpora,public.emr_group_corpus_versions from public,anon,authenticated;
grant select on public.emr_group_corpora,public.emr_group_corpus_versions to authenticated;
create policy group_corpus_owner_read on public.emr_group_corpora for select to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and (select private.current_user_is_admin()));
create policy group_corpus_version_owner_read on public.emr_group_corpus_versions for select to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and (select private.current_user_is_admin()));
create function private.save_emr_group_corpus(p_id uuid,p_expected integer,p_document jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); item jsonb; sid uuid; seen uuid[]:='{}'; saved public.emr_group_corpora%rowtype;
begin
 if uid is null or (auth.jwt()->>'aal') is distinct from 'aal2' or not private.current_user_is_admin() or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'Verified administrator MFA required' using errcode='42501';end if;
 if p_id is null or p_expected is null or p_expected<0 or jsonb_typeof(p_document) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_document))<>3 or not(p_document ?& array['group_name','group_focus','sessions']) or octet_length(p_document::text)>500000 then raise exception 'Valid bounded group corpus required' using errcode='22023';end if;
 if jsonb_typeof(p_document->'group_name') is distinct from 'string' or length(p_document->>'group_name') not between 2 and 160 or (p_document->>'group_name') ~ '^[[:space:]]|[[:space:]]$' or jsonb_typeof(p_document->'group_focus') is distinct from 'string' or length(regexp_replace(p_document->>'group_focus','^[[:space:]]+|[[:space:]]+$','','g'))<2 or length(p_document->>'group_focus')>8000 or jsonb_typeof(p_document->'sessions') is distinct from 'array' or jsonb_array_length(p_document->'sessions')>100 then raise exception 'Group name, focus and bounded session list required' using errcode='22023';end if;
 for item in select * from jsonb_array_elements(p_document->'sessions') loop
  if jsonb_typeof(item) is distinct from 'object' or (select count(*) from jsonb_object_keys(item))<>4 or not(item ?& array['id','subject','objective','planned_implementation']) or jsonb_typeof(item->'id') is distinct from 'string' or jsonb_typeof(item->'subject') is distinct from 'string' or length(regexp_replace(item->>'subject','^[[:space:]]+|[[:space:]]+$','','g')) not between 2 and 500 or length(item->>'subject')>500 or (item->>'subject') ~ '^[[:space:]]|[[:space:]]$' or jsonb_typeof(item->'objective') is distinct from 'string' or length(regexp_replace(item->>'objective','^[[:space:]]+|[[:space:]]+$','','g'))<2 or length(item->>'objective')>10000 or jsonb_typeof(item->'planned_implementation') is distinct from 'string' or length(regexp_replace(item->>'planned_implementation','^[[:space:]]+|[[:space:]]+$','','g'))<2 or length(item->>'planned_implementation')>15000 then raise exception 'Complete each session subject, objective and planned implementation' using errcode='22023';end if;
  begin sid:=(item->>'id')::uuid;exception when others then raise exception 'Valid session ID required' using errcode='22023';end;
  if sid=any(seen) then raise exception 'Duplicate session ID' using errcode='22023';end if;seen:=array_append(seen,sid);
 end loop;
 if p_expected=0 then
  insert into public.emr_group_corpora(id,owner_id,group_name,revision,document) values(p_id,uid,p_document->>'group_name',1,p_document) on conflict(id) do nothing returning * into saved;
 else
  update public.emr_group_corpora set group_name=p_document->>'group_name',revision=revision+1,document=p_document,updated_at=clock_timestamp() where id=p_id and owner_id=uid and revision=p_expected returning * into saved;
 end if;
 if not found then raise exception 'Group corpus changed or unavailable; refresh before saving' using errcode='40001';end if;
 insert into public.emr_group_corpus_versions(group_id,owner_id,revision,document) values(saved.id,uid,saved.revision,saved.document);
 return jsonb_build_object('id',saved.id,'revision',saved.revision,'document',saved.document,'updated_at',saved.updated_at);
end $$;
revoke all on function private.save_emr_group_corpus(uuid,integer,jsonb) from public,anon;
grant execute on function private.save_emr_group_corpus(uuid,integer,jsonb) to authenticated;
create function public.save_emr_group_corpus(p_id uuid,p_expected integer,p_document jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_emr_group_corpus(p_id,p_expected,p_document)$$;
revoke all on function public.save_emr_group_corpus(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_emr_group_corpus(uuid,integer,jsonb) to authenticated;
