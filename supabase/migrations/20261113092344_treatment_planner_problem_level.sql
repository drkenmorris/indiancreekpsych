create or replace function private.validate_planner_library(p_nodes jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if jsonb_typeof(p_nodes) is distinct from 'array' or jsonb_array_length(p_nodes) not between 1 and 5000 or octet_length(p_nodes::text)>2000000 then
  raise exception 'Invalid library size';
 end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(p_nodes) x)<>jsonb_array_length(p_nodes) then
  raise exception 'Duplicate library IDs';
 end if;
 if exists (
  select 1 from jsonb_array_elements(p_nodes) n
  where coalesce(n->>'kind','') not in ('problem','definition','goal','objective','intervention')
    or jsonb_typeof(n->'id') is distinct from 'string' or length(n->>'id') not between 1 and 100
    or jsonb_typeof(n->'text') is distinct from 'string' or length(btrim(n->>'text')) not between 1 and 2000
    or jsonb_typeof(n->'active') is distinct from 'boolean'
 ) then raise exception 'Invalid library item'; end if;
 if exists (
  with nodes as materialized (select x->>'id' as id,x->>'kind' as kind,x->>'parent' as parent from jsonb_array_elements(p_nodes) x)
  select 1 from nodes n left join nodes p on p.id=n.parent
  where (n.kind='problem' and n.parent is not null)
     or (n.kind<>'problem' and p.kind is distinct from case when n.kind='intervention' then 'objective' else 'problem' end)
 ) then raise exception 'Invalid parent relationship'; end if;
end;
$$;

create or replace function private.resolve_planner_node(p_selection jsonb,p_kind text,p_parent text,p_nodes jsonb,p_final boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 source jsonb;
 child jsonb;
 resolved jsonb:='[]';
 children jsonb:=coalesce(p_selection->'children','[]');
 child_kind text;
 definition_count integer:=0;
 goal_count integer:=0;
 objective_count integer:=0;
 wording text;
begin
 select x into source from jsonb_array_elements(p_nodes) x
 where x->>'id'=p_selection->>'id' and x->>'kind'=p_kind
   and x->>'parent' is not distinct from p_parent and x->>'active'='true';
 if source is null then raise exception 'Selection does not belong to its active library parent'; end if;
 if jsonb_typeof(children) is distinct from 'array' then raise exception 'Invalid selected children'; end if;
 if jsonb_array_length(children)>(case p_kind when 'problem' then 42 when 'objective' then 20 else 0 end) then
  raise exception 'Too many selected items for this parent';
 end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(children) x)<>jsonb_array_length(children) then
  raise exception 'Duplicate selected items';
 end if;
 for child in select value from jsonb_array_elements(children) loop
  if p_kind='objective' then
   child_kind:='intervention';
  else
   select x->>'kind' into child_kind from jsonb_array_elements(p_nodes) x where x->>'id'=child->>'id';
   if coalesce(child_kind,'') not in ('definition','goal','objective') then
    raise exception 'Selection does not belong to its active library parent';
   end if;
   definition_count:=definition_count+case when child_kind='definition' then 1 else 0 end;
   goal_count:=goal_count+case when child_kind='goal' then 1 else 0 end;
   objective_count:=objective_count+case when child_kind='objective' then 1 else 0 end;
  end if;
  resolved:=resolved||jsonb_build_array(private.resolve_planner_node(child,child_kind,source->>'id',p_nodes,p_final));
 end loop;
 if definition_count>2 then raise exception 'Problems allow at most two definitions'; end if;
 if goal_count>20 or objective_count>20 then raise exception 'Too many selected goals or objectives'; end if;
 if p_final and p_kind='problem' and (definition_count=0 or goal_count=0 or objective_count=0) then
  raise exception 'Each finalized problem requires a definition, goal, and objective';
 end if;
 if p_final and p_kind='objective' and jsonb_array_length(children)=0 then
  raise exception 'Each finalized objective requires an intervention';
 end if;
 if p_final and p_kind='goal' and p_selection->>'agreed' is distinct from 'true' then
  raise exception 'Record patient agreement on every finalized goal';
 end if;
 wording:=coalesce(nullif(btrim(p_selection->>'text'),''),source->>'text');
 if length(wording)>2000 then raise exception 'Patient wording is too long'; end if;
 return jsonb_build_object('id',source->>'id','kind',p_kind,'source_text',source->>'text',
  'text',wording,'primary',coalesce(p_selection->>'primary','false')='true',
  'agreed',coalesce(p_selection->>'agreed','false')='true','children',resolved);
end;
$$;

-- The migration is the single exception to immutable parent links. Keep all
-- choice IDs and archive the prior library and patient snapshots as-is.
do $$
declare
 current_revision integer;
 migrated jsonb;
begin
 select revision into strict current_revision from public.emr_treatment_library where id='clinic' for update;
 with nodes as materialized (
  select value as node, ordinality, value->>'id' as id, value->>'kind' as kind, value->>'parent' as parent
  from public.emr_treatment_library_versions v
  cross join lateral jsonb_array_elements(v.nodes) with ordinality
  where v.revision=current_revision
 )
 select jsonb_agg(
  case
   when n.kind='goal' and p.kind='definition'
    then n.node||jsonb_build_object('parent',p.parent,'active',(n.node->>'active')::boolean and (p.node->>'active')::boolean)
   when n.kind='objective' and p.kind='goal' and gp.kind='definition'
    then n.node||jsonb_build_object('parent',gp.parent,'active',(n.node->>'active')::boolean and (p.node->>'active')::boolean and (gp.node->>'active')::boolean)
   else n.node
  end order by n.ordinality
 ) into migrated
 from nodes n left join nodes p on n.parent=p.id left join nodes gp on p.parent=gp.id;
 perform private.validate_planner_library(migrated);
 alter table public.emr_treatment_library_versions disable trigger treatment_library_version_guard;
 update public.emr_treatment_library set revision=current_revision+1 where id='clinic';
 insert into public.emr_treatment_library_versions(revision,nodes) values(current_revision+1,migrated);
 alter table public.emr_treatment_library_versions enable trigger treatment_library_version_guard;
end;
$$;
