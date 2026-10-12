import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';

const db=new PGlite();
const admin='00000000-0000-0000-0000-000000000051';
const guest='00000000-0000-0000-0000-000000000052';
const qa='00000000-0000-0000-0000-000000000053';
await db.exec(`
create role authenticated;create role anon;
create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.user',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('request.aal',true)) $$;
create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),email_confirmed_at timestamptz,raw_app_meta_data jsonb default '{}');
create table public.profiles(id uuid primary key references auth.users(id),account_type text not null);
grant usage on schema public,auth,private to authenticated,anon;
`);
await db.exec(readFileSync(new URL('../supabase/migrations/20261012160000_admin_temporary_test_patients.sql',import.meta.url),'utf8'));
await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())',[admin,'admin@example.com',guest,'guest@example.com']);
await db.query('insert into public.profiles(id,account_type) values($1,$2),($3,$4)',[admin,'admin',guest,'patient']);
async function as(id,aal='aal2'){
 await db.exec('reset role');
 await db.query("select set_config('request.user',$1,false),set_config('request.aal',$2,false)",[id,aal]);
 await db.exec('set role authenticated');
}
async function query(sql,args=[]){return db.query(sql,args);}
await test('test mode defaults off and is visible only to MFA-verified administrators',async()=>{
 await as(admin);
 const a=await query('select public.patient_test_mode_status() as status');
 assert.equal(a.rows[0].status.active,false);
 await as(guest);
 await assert.rejects(query('select public.patient_test_mode_status()'),/administrator/i);
 await as(admin,'aal1');
 await assert.rejects(query('select public.set_patient_test_mode(true)'),/second factor/i);
});
await test('administrator can open a one-hour, five-account window and turn it off',async()=>{
 await as(admin);
 const result=await query('select public.set_patient_test_mode(true) as state');
 assert.equal(result.rows[0].state.active,true);
 assert.equal(result.rows[0].state.remaining,5);
 for(let i=0;i<5;i++)await query('select public.consume_patient_test_slot()');
 await assert.rejects(query('select public.consume_patient_test_slot()'),/five-account limit/i);
 const end=await query('select public.set_patient_test_mode(false) as state');
 assert.equal(end.rows[0].state.active,false);
 await assert.rejects(query('select public.consume_patient_test_slot()'),/disabled/i);
});
await test('only a new, confirmed, marked synthetic account can be registered',async()=>{
 await as(admin);
 await query('select public.set_patient_test_mode(true)');
 await query('select public.consume_patient_test_slot()');
 await db.exec('reset role');
 await query('insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values($1,$2,now(),$3)',[qa,'icp-qa-test123@example.com',{qa_test_account:true}]);
 await query("insert into public.profiles(id,account_type) values($1,'patient')",[qa]);
 await as(admin);
 const expiry=await query("select now()+interval '23 hours' as expires");
 await query('select public.register_patient_test_account($1,$2)',[qa,expiry.rows[0].expires]);
 await as(qa);
 const allowed=await query('select private.patient_secure_session() as allowed');
 assert.equal(allowed.rows[0].allowed,true);
 await db.exec('reset role');
 await query("update private.patient_test_accounts set expires_at=now()-interval '1 minute' where user_id=$1",[qa]);
 await as(qa);
 const blocked=await query('select private.patient_secure_session() as allowed');
 assert.equal(blocked.rows[0].allowed,false);
});
await db.close();
