-- Reconstruct kiosk storage and its original RPC entry points from schema metadata.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table private.kiosk_patient_intakes (
  id uuid default gen_random_uuid() not null,
  token_hash text not null,
  patient_name text not null,
  date_of_birth date not null,
  answers jsonb default '{}'::jsonb not null,
  status text default 'draft'::text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone not null,
  submitted_at timestamp with time zone,
  constraint kiosk_patient_intakes_patient_name_check CHECK (((length(patient_name) >= 1) AND (length(patient_name) <= 160))),
  constraint kiosk_patient_intakes_pkey PRIMARY KEY (id),
  constraint kiosk_patient_intakes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'expired'::text]))),
  constraint kiosk_patient_intakes_token_hash_key UNIQUE (token_hash)
);
alter table private.kiosk_patient_intakes enable row level security;
revoke all on private.kiosk_patient_intakes from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.current_user_can_manage_intakes()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(
    select 1 from public.profiles
    where id=(select auth.uid()) and account_type in ('staff','admin')
  )
$function$;
revoke all on function private.current_user_can_manage_intakes() from public,anon,authenticated;
grant execute on function private.current_user_can_manage_intakes() to authenticated;

CREATE OR REPLACE FUNCTION private.create_intake_kiosk_session(p_patient_name text, p_date_of_birth date)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare token text;
begin
  if not coalesce(private.current_user_can_manage_intakes(),false) then raise exception 'Staff or administrator access required'; end if;
  if nullif(btrim(p_patient_name),'') is null or p_date_of_birth is null or p_date_of_birth>current_date then raise exception 'Enter a valid patient name and date of birth'; end if;
  token:=gen_random_uuid()::text||gen_random_uuid()::text;
  insert into private.kiosk_patient_intakes(token_hash,patient_name,date_of_birth,answers,created_by,expires_at)
  values(encode(extensions.digest(token,'sha256'),'hex'),btrim(p_patient_name),p_date_of_birth,
         jsonb_build_object('full_name',btrim(p_patient_name),'date_of_birth',p_date_of_birth::text),
         auth.uid(),now()+interval '8 hours');
  return token;
end
$function$;
revoke all on function private.create_intake_kiosk_session(text,date) from public,anon,authenticated;
grant execute on function private.create_intake_kiosk_session(text,date) to authenticated;

CREATE OR REPLACE FUNCTION private.get_intake_kiosk_session_impl(p_token text)
 RETURNS TABLE(patient_name text, date_of_birth date, answers jsonb, status text, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    k.patient_name,
    k.date_of_birth,
    case when k.status='submitted' then '{}'::jsonb else k.answers end,
    k.status,
    k.expires_at
  from private.kiosk_patient_intakes k
  where k.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
    and k.expires_at>now()
    and k.status in ('draft','submitted')
  limit 1
$function$;
revoke all on function private.get_intake_kiosk_session_impl(text) from public,anon,authenticated;
grant execute on function private.get_intake_kiosk_session_impl(text) to anon,authenticated;

CREATE OR REPLACE FUNCTION private.list_kiosk_intakes_impl()
 RETURNS TABLE(id uuid, patient_name text, date_of_birth date, answers jsonb, status text, created_at timestamp with time zone, submitted_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not coalesce(private.current_user_can_manage_intakes(),false) then raise exception 'Staff or administrator access required'; end if;
  return query
  select k.id,k.patient_name,k.date_of_birth,k.answers,k.status,k.created_at,k.submitted_at
  from private.kiosk_patient_intakes k
  where k.status='submitted'
  order by k.submitted_at desc
  limit 100;
end
$function$;
revoke all on function private.list_kiosk_intakes_impl() from public,anon,authenticated;
grant execute on function private.list_kiosk_intakes_impl() to authenticated;

CREATE OR REPLACE FUNCTION private.save_intake_kiosk_session_impl(p_token text, p_answers jsonb, p_submit boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare kiosk_id uuid; current_status text;
begin
  select id,status into kiosk_id,current_status
  from private.kiosk_patient_intakes
  where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now()
  for update;
  if kiosk_id is null then raise exception 'This intake session is invalid or has expired'; end if;
  if current_status<>'draft' then raise exception 'This intake has already been submitted'; end if;
  perform private.validate_intake_answers(p_answers,p_submit);
  update private.kiosk_patient_intakes
  set answers=p_answers,
      status=case when p_submit then 'submitted' else 'draft' end,
      updated_at=now(),
      submitted_at=case when p_submit then now() else null end
  where id=kiosk_id;
  return case when p_submit then 'submitted' else 'draft' end;
end
$function$;
revoke all on function private.save_intake_kiosk_session_impl(text,jsonb,boolean) from public,anon,authenticated;
grant execute on function private.save_intake_kiosk_session_impl(text,jsonb,boolean) to anon,authenticated;

CREATE OR REPLACE FUNCTION public.create_intake_kiosk_session(p_patient_name text, p_date_of_birth date)
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select private.create_intake_kiosk_session(p_patient_name,p_date_of_birth)
$function$;
revoke all on function public.create_intake_kiosk_session(text,date) from public,anon,authenticated;
grant execute on function public.create_intake_kiosk_session(text,date) to anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_intake_kiosk_session(p_token text)
 RETURNS TABLE(patient_name text, date_of_birth date, answers jsonb, status text, expires_at timestamp with time zone)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select * from private.get_intake_kiosk_session_impl(p_token)
$function$;
revoke all on function public.get_intake_kiosk_session(text) from public,anon,authenticated;
grant execute on function public.get_intake_kiosk_session(text) to anon,authenticated;

CREATE OR REPLACE FUNCTION public.list_kiosk_intakes()
 RETURNS TABLE(id uuid, patient_name text, date_of_birth date, answers jsonb, status text, created_at timestamp with time zone, submitted_at timestamp with time zone)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select * from private.list_kiosk_intakes_impl()
$function$;
revoke all on function public.list_kiosk_intakes() from public,anon,authenticated;
grant execute on function public.list_kiosk_intakes() to anon,authenticated;

CREATE OR REPLACE FUNCTION public.save_intake_kiosk_session(p_token text, p_answers jsonb, p_submit boolean)
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select private.save_intake_kiosk_session_impl(p_token,p_answers,p_submit)
$function$;
revoke all on function public.save_intake_kiosk_session(text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.save_intake_kiosk_session(text,jsonb,boolean) to anon,authenticated;
