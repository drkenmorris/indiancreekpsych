-- Append-only clinician evaluations bind to an immutable submitted response revision.
create table public.asq_assignment_evaluations(
 assignment_id uuid not null references public.psych_test_assignments(id),revision integer not null check(revision>0),
 response_revision integer not null,owner_id uuid not null default auth.uid() references auth.users(id),
 definition_hash text not null check(definition_hash ~ '^[a-f0-9]{64}$'),algorithm_hash text not null check(algorithm_hash ~ '^[a-f0-9]{64}$'),
 report jsonb not null check(jsonb_typeof(report)='object' and octet_length(report::text)<200000),
 notes text not null default '' check(length(notes)<=20000),content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),created_at timestamptz not null default now(),
 primary key(assignment_id,revision),foreign key(assignment_id,response_revision) references public.asq_assignment_response_versions(assignment_id,revision));
create index asq_evaluation_owner_idx on public.asq_assignment_evaluations(owner_id,created_at desc);
alter table public.asq_assignment_evaluations enable row level security;
revoke all on public.asq_assignment_evaluations from public,anon,authenticated;
grant select,insert on public.asq_assignment_evaluations to authenticated;
create policy asq_evaluation_read on public.asq_assignment_evaluations for select to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin() and exists(select 1 from public.psych_test_assignments a where a.id=assignment_id and a.assigned_by=(select auth.uid())));
create policy asq_evaluation_insert on public.asq_assignment_evaluations for insert to authenticated with check(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and private.current_user_is_admin() and exists(select 1 from public.psych_test_assignments a where a.id=assignment_id and a.assigned_by=(select auth.uid())));
create function private.guard_asq_evaluation() returns trigger language plpgsql set search_path='' as $$
declare a public.psych_test_assignments;r public.asq_assignment_responses;
begin
 select * into a from public.psych_test_assignments where id=new.assignment_id;
 select * into r from public.asq_assignment_responses where assignment_id=new.assignment_id;
 if a.test_key is distinct from 'asq' or a.asq_role is null or a.assigned_by is distinct from auth.uid() or new.owner_id is distinct from auth.uid() or r.status is distinct from 'submitted' or new.response_revision is distinct from r.revision or new.definition_hash is distinct from a.asq_definition_hash or new.report->>'role' is distinct from a.asq_role or new.report->>'algorithmHash' is distinct from new.algorithm_hash then raise exception 'Evaluation must match your submitted assignment and original source' using errcode='42501';end if;
 if new.report->>'answeredCount' is distinct from r.answered_count::text or new.report->>'totalCount' is distinct from jsonb_array_length(a.asq_definition->'items')::text then raise exception 'Evaluation answer count mismatch';end if;
 new.created_at=now();return new;
end $$;
revoke all on function private.guard_asq_evaluation() from public,anon,authenticated;
create trigger guard_asq_evaluation before insert on public.asq_assignment_evaluations for each row execute function private.guard_asq_evaluation();
create function public.save_asq_evaluation(p_id uuid,p_expected integer,p_response_revision integer,p_algorithm_hash text,p_report jsonb,p_notes text,p_hash text) returns integer language plpgsql security invoker set search_path='' as $$
declare a public.psych_test_assignments;n integer;
begin
 if auth.uid() is null or (select auth.jwt()->>'aal') is distinct from 'aal2' or not private.current_user_is_admin() then raise exception 'Clinician access required' using errcode='42501';end if;
 select * into a from public.psych_test_assignments where id=p_id and assigned_by=auth.uid();
 if not found then raise exception 'Assignment unavailable' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,0));
 select coalesce(max(revision),0) into n from public.asq_assignment_evaluations where assignment_id=p_id;
 if p_expected is distinct from n then raise exception 'Another evaluation was saved. Reopen the record before saving.' using errcode='40001';end if;
 insert into public.asq_assignment_evaluations(assignment_id,revision,response_revision,definition_hash,algorithm_hash,report,notes,content_hash) values(p_id,n+1,p_response_revision,a.asq_definition_hash,p_algorithm_hash,p_report,p_notes,p_hash);
 return n+1;
end $$;
revoke all on function public.save_asq_evaluation(uuid,integer,integer,text,jsonb,text,text) from public,anon;
grant execute on function public.save_asq_evaluation(uuid,integer,integer,text,jsonb,text,text) to authenticated;
