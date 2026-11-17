import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();const ids=[1,2,3].map(n=>'00000000-0000-4000-8000-00000000000'+n);
await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
create table public.profiles(id uuid primary key,account_type text);
create function auth.uid() returns uuid language sql stable as $$select current_setting('test.user')::uuid$$;
create function private.current_user_is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and account_type='admin')$$;
create function private.patient_secure_session() returns boolean language sql stable as $$select current_setting('test.aal')='aal2'$$;
grant usage on schema public,auth,private to authenticated;`);
for(const [i,id] of ids.entries())await db.query('insert into profiles values($1,$2)',[id,i===2?'patient':'admin']);
await db.exec(readFileSync('supabase/migrations/20261117204947_emr_account_settings.sql','utf8'));
const settings={preferences:{density:'compact',large_text:true,contrast:true},defaults:{note_template:'SOAP',country:'Fictional country',modality:'Group'},shortcuts:['personal','plan'],custom_fields:[{id:'custom_00000000-0000-4000-8000-000000000009',label:'Fictional date',type:'date'}]};
async function as(id,aal='aal2'){await db.exec('reset role');await db.query("select set_config('test.user',$1,false),set_config('test.aal',$2,false)",[id,aal]);await db.exec('set role authenticated');}
await test('all account settings persist and revision checks reject stale writes',async()=>{await as(ids[0]);await db.query('insert into emr_account_settings(account_id,revision,settings) values($1,1,$2)',[ids[0],settings]);assert.deepEqual((await db.query('select settings from emr_account_settings')).rows[0].settings,settings);await db.query('update emr_account_settings set settings=$1,revision=2',[{...settings,shortcuts:[]}]);await assert.rejects(db.exec('update emr_account_settings set revision=2'),/revision conflict/);});
await test('another account, patient, low MFA and anonymous callers cannot access saved configuration',async()=>{for(const [id,aal] of [[ids[1],'aal2'],[ids[2],'aal2'],[ids[0],'aal1']]){await as(id,aal);assert.equal((await db.query('select * from emr_account_settings')).rows.length,0);assert.equal((await db.query('update emr_account_settings set revision=3 returning revision')).rows.length,0);await assert.rejects(db.query('insert into emr_account_settings(account_id,revision,settings) values($1,1,$2)',[ids[0],settings]),/row-level security/);}await db.exec('reset role;set role anon');await assert.rejects(db.exec('select * from public.emr_account_settings'),/permission denied/);});
await db.close();
