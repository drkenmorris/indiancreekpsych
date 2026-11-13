alter table public.emr_treatment_modalities
 add column approaches text[] not null default '{}',
 add constraint emr_modality_approach_count check (cardinality(approaches)<=100),
 add constraint emr_modality_approach_size check (octet_length(approaches::text)<=48000);
grant update(approaches) on public.emr_treatment_modalities to authenticated;

create table public.emr_treatment_approach_options (
 label text not null check (char_length(label) between 1 and 120 and label=btrim(label) and label !~ '[[:cntrl:]]'),
 created_by uuid not null default auth.uid() references auth.users(id)
);
create unique index emr_treatment_approach_options_label_idx on public.emr_treatment_approach_options (lower(label));
alter table public.emr_treatment_approach_options enable row level security;
revoke all on public.emr_treatment_approach_options from public,anon,authenticated;
grant select(label),insert(label) on public.emr_treatment_approach_options to authenticated;
create policy treatment_approach_options_read on public.emr_treatment_approach_options for select to authenticated
 using (exists (select 1 from private.modality_directory(false) p where p.id=(select auth.uid())));
create policy treatment_approach_options_add on public.emr_treatment_approach_options for insert to authenticated
 with check (created_by=(select auth.uid()) and exists (
  select 1 from private.modality_directory(false) p where p.id=(select auth.uid())
 ));
