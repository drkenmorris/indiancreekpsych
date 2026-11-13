alter table public.patient_intakes
 add column completed_pages integer[] not null default '{}',
 add constraint patient_intakes_completed_pages_valid check (
  array_position(completed_pages, null) is null
  and completed_pages <@ array[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]
  and cardinality(completed_pages) <= 21
 );
grant insert (completed_pages), update (completed_pages) on public.patient_intakes to authenticated;
