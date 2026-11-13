create or replace function private.guard_emr_modality() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.revision is distinct from old.revision+1 then raise exception 'Modality revision conflict' using errcode='40001'; end if;
  if new.assigned_provider_id is distinct from old.assigned_provider_id and private.modality_role() is distinct from 'admin' then
   raise exception 'Only an administrator can change the chart assignment' using errcode='42501';
  end if;
 elsif new.revision is distinct from 1 then
  raise exception 'Invalid initial revision';
 end if;
 if new.assigned_provider_id is not null and not exists (
  select 1 from private.modality_directory(false) p where p.id=new.assigned_provider_id
 ) then raise exception 'Select an active chart provider'; end if;
 if jsonb_typeof(new.sessions) is distinct from 'array' or jsonb_array_length(new.sessions)>50 then
  raise exception 'Use up to 50 session rows';
 end if;
 if exists (
  select 1 from jsonb_array_elements(new.sessions) s
  where jsonb_typeof(s) is distinct from 'object'
    or coalesce(s->>'code','') not in ('90791','90832','90834','90837','90839','90846','90847','90849','90853','96130','96136','96138','96146')
    or coalesce(s->>'frequency','') not in ('three_weekly','twice_weekly','weekly','every_two_weeks','monthly')
    or jsonb_typeof(s->'count') is distinct from 'number'
    or coalesce(s->>'count','') !~ '^([1-9]|[1-9][0-9]|100)$'
    or not exists (select 1 from private.modality_directory(false) p where p.id::text=s->>'providerId')
    or (select count(*) from jsonb_object_keys(case when jsonb_typeof(s)='object' then s else '{}'::jsonb end))<>4
 ) then raise exception 'Invalid session row or inactive session provider'; end if;
 new.updated_by:=auth.uid();
 new.updated_at:=now();
 return new;
end;
$$;
