import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
const db=new PGlite(),admin='00000000-0000-0000-0000-000000000101',other='00000000-0000-0000-0000-000000000102',student='00000000-0000-0000-0000-000000000103',parent='00000000-0000-0000-0000-000000000104',teacher='00000000-0000-0000-0000-000000000105',subject='00000000-0000-0000-0000-000000000201';
await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.user',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.aal',true),'email',current_setting('request.email',true))$$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create table public.profiles(id uuid primary key references auth.users(id),account_type text);
create table public.clinical_patients(id uuid primary key);
create function private.current_user_is_admin() returns boolean language sql security definer stable set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and account_type='admin')$$;
grant usage on schema public,auth,private to authenticated,anon;grant select on profiles to authenticated;`);
for(const [id,role,email] of [[admin,'admin','admin@example.invalid'],[other,'admin','other@example.invalid'],[student,'patient','student@example.invalid'],[parent,'patient','parent@example.invalid'],[teacher,'patient','teacher@example.invalid']]){await db.query('insert into auth.users values($1,$2,now())',[id,email]);await db.query('insert into profiles values($1,$2)',[id,role]);}
await db.query('insert into clinical_patients values($1)',[subject]);
await db.exec(readFileSync('supabase/migrations/20261013094000_psych_test_assignments.sql','utf8'));
await db.exec('alter table psych_test_assignments add dsm_version text;');
await db.query("insert into psych_test_assignments(assigned_by,recipient_first_name,recipient_last_name,recipient_email,recipient_dob,test_key) values($1,'Legacy','Version','legacy@example.invalid','1990-01-01','asq')",[admin]);
await db.exec(readFileSync('supabase/migrations/20261103234805_asq_recipient_assignments.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261103235256_asq_recipient_policy_compatibility.sql','utf8'));
async function as(id,aal='aal2',email='spoofed@example.invalid'){await db.exec('reset role');await db.query("select set_config('request.user',$1,false),set_config('request.aal',$2,false),set_config('request.email',$3,false)",[id,aal,email]);await db.exec('set role authenticated');}
await db.exec('create table dsm_records(id uuid primary key default gen_random_uuid(),patient_id uuid,owner_id uuid);');
await db.exec(readFileSync('supabase/migrations/20261104071845_dsm_recipient_assignments.sql','utf8'));

await db.exec(readFileSync('supabase/migrations/20261104074244_dsm_six_tier_recipient.sql','utf8'));
const source={format:'icps-dsm-recipient/1',version:'adult',questions:[...Array.from({length:60},(_,i)=>({id:'q'+i,tier:1,domain:i<3?'a':'b',choices:['No','Yes, currently','Unsure']})),{id:'follow-a',tier:2,domain:'a',choices:['Never','Often']},{id:'follow-b',tier:2,domain:'b',choices:['Never','Often']}]};
async function create(email,sent=true,expired=false,definition=source){await as(admin);const r=await db.query("insert into psych_test_assignments(recipient_first_name,recipient_last_name,recipient_email,recipient_dob,test_key,dsm_version,patient_id,dsm_source,dsm_source_hash,created_at,expires_at) values('Fictional','Recipient',$1,'1990-01-01','dsm','adult',$2,$3,$4,now()-interval '2 days',now()+case when $5 then interval '-1 day' else interval '14 days' end) returning id",[email,subject,definition,'b'.repeat(64),expired]);const id=r.rows[0].id;if(sent)await db.query("update psych_test_assignments set status='sent',sent_at=now() where id=$1",[id]);return id;}
const id=await create('student@example.invalid'),second=await create('parent@example.invalid'),expired=await create('student@example.invalid',true,true),draft=await create('student@example.invalid',false);
const one=Object.fromEntries(source.questions.filter(q=>q.tier===1).map(q=>[q.id,'No']));
const save=(id,revision,answers,page=0,submit=false)=>db.query('select save_dsm_assignment($1,$2,$3,$4,$5,true) revision',[id,revision,answers,page,submit]);
await test('DSM source and patient identity cannot change after draft creation; legacy source-less drafts cannot be newly created',async()=>{await as(admin);for(const sql of ["update psych_test_assignments set dsm_source_hash='c' where id=$1","update psych_test_assignments set patient_id=null where id=$1"])await assert.rejects(db.query(sql,[draft]));await assert.rejects(db.query("insert into psych_test_assignments(recipient_first_name,recipient_last_name,recipient_email,recipient_dob,test_key,dsm_version) values('F','R','f@example.invalid','1990-01-01','dsm','adult')"));});
await test('seven answers save, versions remain immutable and conflicts do not overwrite',async()=>{await as(student);const answers=Object.fromEntries(Object.entries(one).slice(0,7));assert.equal((await save(id,0,answers,1)).rows[0].revision,1);assert.equal((await db.query('select answered_count from dsm_assignment_responses')).rows[0].answered_count,7);await assert.rejects(save(id,0,answers,1),/Another session/);await assert.rejects(db.query('delete from dsm_assignment_response_versions'),/permission denied/);});
await test('MFA, current verified email, invitation expiry and recipient identity isolate records',async()=>{await as(student,'aal1');assert.equal((await db.query('select * from dsm_assignment_responses')).rows.length,0);await assert.rejects(save(id,1,one),/Recipient access/);await as(parent,'aal2','student@example.invalid');assert.equal((await db.query('select * from dsm_assignment_responses')).rows.length,0);await assert.rejects(save(id,1,one),/Recipient access/);await as(student);await assert.rejects(save(expired,0,one),/Recipient access/);await assert.rejects(save(draft,0,one),/Recipient access/);await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from dsm_assignment_responses'),/permission denied/);});
await test('direct RPC rejects invalid choices, unrelated Tier 2 domains, skipped pages and incomplete submissions',async()=>{await as(student);for(const answers of [{...one,forged:'Yes'},{...one,q0:'Invalid'},{...one,'follow-a':'Never'},{...one,q0:'Yes, currently','follow-b':'Never'}])await assert.rejects(save(id,1,answers));await assert.rejects(save(id,1,{},2),/earlier pages/);await assert.rejects(save(id,1,{...one,q0:'Yes, currently'},0,true),/every selected/);assert.equal((await db.query('select revision from dsm_assignment_responses')).rows[0].revision,1);});
await test('only positive domains require follow-up and final submission locks editing',async()=>{await as(student);const answers={...one,q0:'Yes, currently','follow-a':'Often'};assert.equal((await save(id,1,answers,8,true)).rows[0].revision,2);await assert.rejects(save(id,2,answers,8),/cannot be changed/);const r=(await db.query('select * from dsm_assignment_responses')).rows[0];assert.equal(r.status,'submitted');assert.equal(r.answered_count,61);});
await test('assigning administrator sees original submission; unrelated administrator and other recipient cannot',async()=>{await as(admin);assert.equal((await db.query('select * from dsm_assignment_responses')).rows.length,1);assert.equal((await db.query('select * from dsm_assignment_response_versions')).rows.length,2);await as(other);assert.equal((await db.query('select * from dsm_assignment_responses')).rows.length,0);await as(parent);assert.equal((await db.query('select * from dsm_assignment_responses')).rows.length,0);});
await test('six tiers persist separately across repeated patient administrations; direct RPC enforces all tiers and optional dates/text',async()=>{
 const source2={...source,format:'icps-dsm-recipient/2',questions:[...source.questions,...[3,4,5,6].map(tier=>({id:'tier-'+tier,tier,domain:'a',choices:['Yes','No']})),{id:'example',tier:6,domain:'a',kind:'text',optional:true,choices:[]},{id:'date',tier:6,domain:'a',kind:'date',optional:true,choices:[]}]};
 const first=await create('student@example.invalid',true,false,source2),repeat=await create('student@example.invalid',true,false,source2);
 const full={...one,q0:'Yes, currently','follow-a':'Often',...Object.fromEntries([3,4,5,6].map(t=>['tier-'+t,'Yes'])),example:'Fictional six-tier example',date:'2020-01-01'};
 await as(student);
 await assert.rejects(save(first,0,{...one,q0:'Yes, currently','follow-a':'Often'},0,true),/every selected/);
 await assert.rejects(save(first,0,{...full,date:'2026-02-30'},0,true),/invalid answer/);
 await assert.rejects(save(first,0,{...full,example:'x'.repeat(2001)},0,true),/invalid answer/);
 assert.equal((await save(first,0,full,0,true)).rows[0].revision,1);
 const different={...full,'tier-6':'No',example:'Independent fictional repeat'};
 assert.equal((await save(repeat,0,different,0,true)).rows[0].revision,1);
 await as(admin);
 const rows=(await db.query('select assignment_id,answers,status from dsm_assignment_responses where assignment_id in ($1,$2)',[first,repeat])).rows;
 assert.equal(rows.length,2);assert.equal(rows.find(r=>r.assignment_id===first).answers['tier-6'],'Yes');assert.equal(rows.find(r=>r.assignment_id===repeat).answers['tier-6'],'No');
 await as(other);assert.equal((await db.query('select * from dsm_assignment_responses where assignment_id in ($1,$2)',[first,repeat])).rows.length,0);
});
await db.close();
