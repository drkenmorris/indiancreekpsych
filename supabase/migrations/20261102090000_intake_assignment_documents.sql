-- Private, append-only copies associated with the existing patient/kiosk intake boundary.
create table private.intake_assignment_documents (
 id uuid primary key default gen_random_uuid(),
 patient_id uuid references public.profiles(id) on delete cascade,
 kiosk_id uuid references private.kiosk_patient_intakes(id) on delete cascade,
 document_type text not null check(document_type in ('Foster parent assignment','Guardian assignment')),
 authority text not null check(authority in ('Court','State agency')),
 filename text not null check(length(filename) between 1 and 180),
 mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),
 content bytea not null check(octet_length(content) between 1 and 2097152),
 created_at timestamptz not null default now(),
 check((patient_id is not null)::integer+(kiosk_id is not null)::integer=1)
);
alter table private.intake_assignment_documents enable row level security;
revoke all on private.intake_assignment_documents from public,anon,authenticated;
create index on private.intake_assignment_documents(patient_id);
create index on private.intake_assignment_documents(kiosk_id);

create function private.intake_assignment_documents_impl(
 p_operation text,p_patient_id uuid default null,p_kiosk_id uuid default null,p_token text default null,
 p_document_id uuid default null,p_document_type text default null,p_authority text default null,
 p_filename text default null,p_mime text default null,p_content text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 target_patient uuid;target_kiosk uuid;state text;raw bytea;count_docs integer;used_bytes bigint;
 item private.intake_assignment_documents%rowtype;result jsonb;
 staff boolean := auth.uid() is not null and coalesce(auth.jwt()->>'aal','')='aal2'
   and coalesce(private.current_user_can_manage_intakes(),false)
   and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null);
begin
 if p_operation not in ('list','upload','get') or p_operation is null then raise exception 'Invalid attachment operation';end if;
 if p_token is not null then
  if p_patient_id is not null or p_kiosk_id is not null or length(p_token)<32 or length(p_token)>256 then raise exception 'Intake access unavailable' using errcode='42501';end if;
  select k.id,k.status into target_kiosk,state from private.kiosk_patient_intakes k
   where k.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and k.expires_at>now() and k.status='draft' for update;
  if target_kiosk is null then raise exception 'Intake access unavailable' using errcode='42501';end if;
 elsif p_patient_id is not null and p_kiosk_id is null then
  target_patient:=p_patient_id;
  if target_patient=auth.uid() and coalesce(private.patient_secure_session(),false) then
   if not exists(select 1 from public.profiles where id=auth.uid() and account_type='patient') then raise exception 'Patient intake required' using errcode='42501';end if;
   perform 1 from public.profiles where id=target_patient for update;
   select status into state from public.patient_intakes where patient_id=target_patient for update;
   state:=coalesce(state,'draft');
  elsif p_operation<>'upload' and staff then
   select status into state from public.patient_intakes where patient_id=target_patient;
   if state is distinct from 'submitted' then raise exception 'Submitted intake required' using errcode='42501';end if;
  else raise exception 'Intake access unavailable' using errcode='42501';end if;
 elsif p_kiosk_id is not null and p_patient_id is null and p_operation<>'upload' and staff then
  select k.id,k.status into target_kiosk,state from private.kiosk_patient_intakes k where k.id=p_kiosk_id and k.status='submitted';
  if target_kiosk is null then raise exception 'Submitted intake required' using errcode='42501';end if;
 else raise exception 'Intake access unavailable' using errcode='42501';end if;

 if p_operation='upload' then
  if state<>'draft' then raise exception 'Submitted intake documents cannot be changed';end if;
  if p_document_type not in ('Foster parent assignment','Guardian assignment') or p_document_type is null
   or p_authority not in ('Court','State agency') or p_authority is null then raise exception 'Choose assignment type and issuing authority';end if;
  if p_filename is null or length(btrim(p_filename)) not between 1 and 180 or p_filename ~ '[[:cntrl:]/\\]' then raise exception 'Invalid document filename';end if;
  if p_content is null or length(p_content)>2796204 then raise exception 'Choose a document no larger than 2 MB';end if;
  begin raw:=decode(p_content,'base64');exception when others then raise exception 'Invalid document encoding';end;
  if octet_length(raw) not between 1 and 2097152 then raise exception 'Choose a document no larger than 2 MB';end if;
  if not coalesce((p_mime='application/pdf' and substring(raw from 1 for 5)=decode('255044462d','hex'))
   or (p_mime='image/jpeg' and substring(raw from 1 for 3)=decode('ffd8ff','hex'))
   or (p_mime='image/png' and substring(raw from 1 for 8)=decode('89504e470d0a1a0a','hex')),false) then raise exception 'Choose a PDF, JPEG or PNG document';end if;
  select count(*),coalesce(sum(octet_length(d.content)),0) into count_docs,used_bytes from private.intake_assignment_documents d
   where (target_patient is not null and d.patient_id=target_patient) or (target_kiosk is not null and d.kiosk_id=target_kiosk);
  if count_docs>=8 or used_bytes+octet_length(raw)>8388608 then raise exception 'Intake attachment limit reached (8 copies / 8 MB total)';end if;
  insert into private.intake_assignment_documents(patient_id,kiosk_id,document_type,authority,filename,mime_type,content)
   values(target_patient,target_kiosk,p_document_type,p_authority,p_filename,p_mime,raw) returning * into item;
  return jsonb_build_object('id',item.id,'document_type',item.document_type,'authority',item.authority,'filename',item.filename,'mime_type',item.mime_type,'byte_size',octet_length(item.content),'created_at',item.created_at);
 elsif p_operation='get' then
  select * into item from private.intake_assignment_documents d where d.id=p_document_id
   and ((target_patient is not null and d.patient_id=target_patient) or (target_kiosk is not null and d.kiosk_id=target_kiosk));
  if item.id is null then raise exception 'Document unavailable' using errcode='42501';end if;
  return jsonb_build_object('filename',item.filename,'mime_type',item.mime_type,'content',encode(item.content,'base64'));
 else
  select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'document_type',d.document_type,'authority',d.authority,'filename',d.filename,'mime_type',d.mime_type,'byte_size',octet_length(d.content),'created_at',d.created_at) order by d.created_at),'[]'::jsonb) into result
   from private.intake_assignment_documents d where (target_patient is not null and d.patient_id=target_patient) or (target_kiosk is not null and d.kiosk_id=target_kiosk);
  return result;
 end if;
end $$;
create function public.intake_assignment_documents(
 p_operation text,p_patient_id uuid default null,p_kiosk_id uuid default null,p_token text default null,
 p_document_id uuid default null,p_document_type text default null,p_authority text default null,
 p_filename text default null,p_mime text default null,p_content text default null
) returns jsonb language sql security invoker set search_path='' as $$
 select private.intake_assignment_documents_impl(p_operation,p_patient_id,p_kiosk_id,p_token,p_document_id,p_document_type,p_authority,p_filename,p_mime,p_content)
$$;
revoke all on function private.intake_assignment_documents_impl(text,uuid,uuid,text,uuid,text,text,text,text,text),public.intake_assignment_documents(text,uuid,uuid,text,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function private.intake_assignment_documents_impl(text,uuid,uuid,text,uuid,text,text,text,text,text),public.intake_assignment_documents(text,uuid,uuid,text,uuid,text,text,text,text,text) to anon,authenticated;
