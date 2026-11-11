-- Reconstruct the original application tables from deployed schema metadata.
-- Supabase supplies the auth schema and roles. This migration contains no user data.
create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  preferred_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  account_type text not null default 'guest'
    check (account_type in ('guest','patient','staff','admin'))
);

create table public.newsletter_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  subscribed boolean not null default true,
  frequency text not null default 'biweekly' check (frequency in ('weekly','biweekly')),
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.newsletter_subscriptions enable row level security;
revoke all on public.profiles, public.newsletter_subscriptions from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update(full_name,preferred_name) on public.profiles to authenticated;
grant select,insert,update on public.newsletter_subscriptions to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy newsletter_select_own on public.newsletter_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy newsletter_insert_own on public.newsletter_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy newsletter_update_own on public.newsletter_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  wants_newsletter boolean := coalesce((new.raw_user_meta_data ->> 'newsletter_consent')::boolean, false);
  requested_frequency text := coalesce(new.raw_user_meta_data ->> 'newsletter_frequency', 'biweekly');
begin
  if requested_frequency not in ('weekly','biweekly') then
    requested_frequency := 'biweekly';
  end if;

  insert into public.profiles (id, full_name, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'guest'
  )
  on conflict (id) do nothing;

  if wants_newsletter and new.email is not null then
    insert into public.newsletter_subscriptions (
      user_id, email, subscribed, frequency, consented_at
    )
    values (
      new.id, new.email, true, requested_frequency, now()
    )
    on conflict (user_id) do update
      set email = excluded.email,
          subscribed = true,
          frequency = excluded.frequency,
          consented_at = now(),
          unsubscribed_at = null,
          updated_at = now();
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.set_newsletter_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  new.updated_at = now();
  if new.subscribed = false and old.subscribed = true then
    new.unsubscribed_at = now();
  elsif new.subscribed = true then
    new.unsubscribed_at = null;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.set_profiles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_profiles_updated_at() from public, anon, authenticated;
revoke all on function private.set_newsletter_updated_at() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_profiles_updated_at();
create trigger newsletter_set_updated_at before update on public.newsletter_subscriptions
  for each row execute function private.set_newsletter_updated_at();
