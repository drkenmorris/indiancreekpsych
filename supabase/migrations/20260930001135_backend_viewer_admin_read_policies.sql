
drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select
on public.profiles
for select
to authenticated
using ((select private.current_user_is_admin()));

drop policy if exists newsletter_admin_select on public.newsletter_subscriptions;
create policy newsletter_admin_select
on public.newsletter_subscriptions
for select
to authenticated
using ((select private.current_user_is_admin()));
