-- Administrator-only editorial planning. No recipient data or sending worker.
create table if not exists public.newsletter_article_schedule (
  article_slug text primary key,
  status text not null default 'draft' check (status in ('draft','planned')),
  scheduled_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_planned_requires_date check (
    (status = 'planned' and scheduled_at is not null) or
    (status = 'draft' and scheduled_at is null)
  )
);

alter table public.newsletter_article_schedule enable row level security;
revoke all on public.newsletter_article_schedule from anon;
grant select, insert, update on public.newsletter_article_schedule to authenticated;

create policy "MFA administrators can view editorial plans"
on public.newsletter_article_schedule for select to authenticated
using (
  (select auth.jwt()->>'aal') = 'aal2'
  and exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_type = 'admin')
);

create policy "MFA administrators can create editorial plans"
on public.newsletter_article_schedule for insert to authenticated
with check (
  updated_by = (select auth.uid())
  and (select auth.jwt()->>'aal') = 'aal2'
  and exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_type = 'admin')
);

create policy "MFA administrators can edit editorial plans"
on public.newsletter_article_schedule for update to authenticated
using (
  (select auth.jwt()->>'aal') = 'aal2'
  and exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_type = 'admin')
)
with check (
  updated_by = (select auth.uid())
  and (select auth.jwt()->>'aal') = 'aal2'
  and exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_type = 'admin')
);
