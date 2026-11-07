import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
const ids = Object.fromEntries(['patient','other','admin','guest','unverified','expired'].map((key,i)=>[key,`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`]));
await db.exec(`
create role anon; create role authenticated;
create schema auth; create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.user',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.aal',true))$$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');
create table auth.mfa_factors(user_id uuid,status text);
create table public.profiles(id uuid primary key references auth.users(id),account_type text);
create table private.patient_test_accounts(user_id uuid,expires_at timestamptz);
create function private.current_user_is_admin() returns boolean language sql stable security definer as $$select exists(select 1 from public.profiles where id=auth.uid() and account_type='admin')$$;
create function private.prevent_profile_role_escalation() returns trigger language plpgsql as $$begin return new; end$$;
create table public.appointments(id uuid,patient_id uuid);
alter table public.appointments enable row level security;
create policy own_appointment on public.appointments for all to authenticated using(patient_id=auth.uid()) with check(patient_id=auth.uid());
grant usage on schema public,auth,private to authenticated,anon;
grant select on public.profiles to authenticated;
grant select,insert on public.appointments to authenticated;
create table public.psych_test_assignments(id uuid,test_key text,asq_role text,dsm_source jsonb,connected_source jsonb,patient_id uuid,status text,expires_at timestamptz,recipient_email text);
`);
await db.exec(readFileSync(new URL('../supabase/migrations/20260927024746_patient_registration_intake.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../supabase/migrations/20261107203826_optional_patient_mfa.sql',import.meta.url),'utf8'));
for (const [key,id] of Object.entries(ids)) {
  await db.query('insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values($1,$2,$3,$4)',[id,key+'@example.invalid',key==='unverified'?null:new Date().toISOString(),key==='expired'?{qa_test_account:'true'}:{}]);
  await db.query('insert into public.profiles values($1,$2)',[id,['admin','guest'].includes(key)?key:'patient']);
}
async function as(key,aal='aal1') {
  await db.exec('reset role');
  await db.query("select set_config('request.user',$1,false),set_config('request.aal',$2,false)",[ids[key]??'',aal]);
  await db.exec('set role authenticated');
}
const ready = async () => (await db.query('select public.patient_security_ready() as ready')).rows[0].ready;

await test('verified patient without MFA can save own intake and appointment at aal1', async()=>{
  await as('patient'); assert.equal(await ready(),true);
  await db.query('insert into patient_intakes(patient_id,answers) values($1,$2)',[ids.patient,{full_name:'Fictional Patient'}]);
  await db.query('insert into appointments values($1,$2)',[ids.patient,ids.patient]);
  assert.equal((await db.query('select * from patient_intakes')).rows.length,1);
  assert.equal((await db.query('select * from appointments')).rows.length,1);
  await assert.rejects(db.query('insert into patient_intakes(patient_id) values($1)',[ids.other]),/row-level security/);
  await assert.rejects(db.query('insert into appointments values($1,$2)',[ids.other,ids.other]),/row-level security/);
});
await test('other patients cannot read this patient intake or bookings',async()=>{
  await as('other'); assert.equal(await ready(),true);
  assert.equal((await db.query('select * from patient_intakes')).rows.length,0);
  assert.equal((await db.query('select * from appointments')).rows.length,0);
});
await test('guest, unverified, expired synthetic and aal1 admin remain denied',async()=>{
  for(const key of ['guest','unverified','expired','admin']) {
    await as(key); assert.equal(await ready(),false,key);
    assert.equal((await db.query('select * from patient_intakes')).rows.length,0);
  }
  await as('admin','aal2'); assert.equal(await ready(),true);
});
await test('voluntary verified MFA still requires step-up; unverified setup does not force enrollment',async()=>{
  await db.exec('reset role'); await db.query("insert into auth.mfa_factors values($1,'unverified')",[ids.patient]);
  await as('patient'); assert.equal(await ready(),true);
  await db.exec("reset role;update auth.mfa_factors set status='verified'");
  await as('patient'); assert.equal(await ready(),false);
  assert.equal((await db.query('select * from patient_intakes')).rows.length,0);
  await as('patient','aal2'); assert.equal(await ready(),true);
  await db.exec('reset role;delete from auth.mfa_factors');
});
await test('assigned questionnaire access works without MFA while recipient, sent-state and expiry stay enforced',async()=>{
  for(const key of ['asq','dsm','connected']) {
    await db.exec('reset role;delete from psych_test_assignments');
    await db.query("insert into psych_test_assignments values($1,$2,'self','{}','{}',$1,'sent',now()+interval '1 day','patient@example.invalid')",[ids.patient,key==='connected'?'cseq':key]);
    const allowed=async()=> (await db.query(`select private.${key}_recipient_allowed($1) as allowed`,[ids.patient])).rows[0].allowed;
    await as('patient'); assert.equal(await allowed(),true,key);
    await as('other'); assert.equal(await allowed(),false,key);
    await as('guest'); assert.equal(await allowed(),false,key);
    await db.exec("reset role;update psych_test_assignments set expires_at=now()-interval '1 day'");
    await as('patient'); assert.equal(await allowed(),false,key);
    await db.exec("reset role;update psych_test_assignments set expires_at=now()+interval '1 day',status='draft'");
    await as('patient'); assert.equal(await allowed(),false,key);
  }
});
await test('anonymous cannot call patient readiness',async()=>{
  await db.exec('reset role;set role anon');
  await assert.rejects(db.query('select patient_security_ready()'),/permission denied/);
});
await db.close();
