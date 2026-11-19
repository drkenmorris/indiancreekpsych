import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const db=new PGlite();
const admin='00000000-0000-0000-0000-000000000101';
const secondAdmin='00000000-0000-0000-0000-000000000102';
const p1='00000000-0000-0000-0000-000000000103';
const p2='00000000-0000-0000-0000-000000000104';
await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.user',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.aal',true))$$;
create table auth.users(id uuid primary key);
create table public.profiles(id uuid primary key,account_type text);
create table public.clinical_patients(id uuid primary key,demographics jsonb);
create function private.current_user_is_admin() returns boolean language sql security definer stable set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and account_type='admin')$$;
grant usage on schema auth,private,public to anon,authenticated;
grant select on public.profiles,public.clinical_patients to authenticated;`);
for(const [id,role] of [[admin,'admin'],[secondAdmin,'admin'],[p1,'patient']]){
 await db.query('insert into auth.users values($1)',[id]);
 await db.query('insert into public.profiles values($1,$2)',[id,role]);
}
for(const id of [p1,p2])await db.query('insert into public.clinical_patients values($1,$2)',[id,{first_name:'Fictional',last_name:'Participant'}]);
await db.exec(readFileSync('supabase/migrations/20261109190000_emr_group_sessions.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261110032200_emr_group_individual_notes.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261110045500_emr_group_note_amendments.sql','utf8'));
await db.exec(`alter table auth.users add column email_confirmed_at timestamptz;
 alter table public.profiles add column full_name text;
 update auth.users set email_confirmed_at=now();
 update public.profiles set full_name=case when id='00000000-0000-0000-0000-000000000101'::uuid then 'Fictional Group Clinician' else 'Other Clinician' end;`);
await db.exec(readFileSync('supabase/migrations/20261110081500_emr_group_note_attestations.sql','utf8'));
const q=(sql,args=[])=>db.query(sql,args);
const as=async(id,aal='aal2')=>{
 await db.exec('reset role');
 await q("select set_config('request.user',$1,false),set_config('request.aal',$2,false)",[id,aal]);
 await db.exec('set role authenticated');
};
await db.exec(readFileSync('supabase/migrations/20261119185607_independent_group_notes.sql','utf8'));

const independent={patient_id:p1,group_name:'Fictional independent group',encounter_at:'2026-11-19T16:00:00Z',template:'DAP',sections:{data:'Fictional observations',assessment:'Fictional assessment',plan:'Fictional plan'},reviewed:true};let nid;
await test('new independent DAP SOAP and Narrative notes save with no shared sessions or participation rows',async()=>{
 await as(admin);for(const [template,sections]of [['DAP',independent.sections],['SOAP',{subjective:'Fictional report',objective:'Fictional observations',assessment:'Fictional assessment',plan:'Fictional plan'}],['Narrative',{narrative:'Fictional narrative'}]]){const id=(await q('select public.save_independent_group_note($1) id',[{...independent,template,sections}])).rows[0].id;if(template==='DAP')nid=id;const row=(await q('select * from public.emr_group_individual_notes where id=$1',[id])).rows[0];assert.equal(row.session_id,null);assert.equal(row.group_name,independent.group_name);assert.equal(row.patient_id,p1);assert.deepEqual(row.sections,sections);}
 assert.equal((await q('select count(*)::int n from public.emr_group_sessions')).rows[0].n,0);assert.equal((await q('select count(*)::int n from public.emr_group_participation')).rows[0].n,0);
});
await test('independent writer rejects invalid metadata, patient, missing timezone, shared IDs and incomplete sections',async()=>{
 await as(admin);for(const bad of [{...independent,patient_id:'00000000-0000-0000-0000-000000000999'},{...independent,session_id:null},{...independent,encounter_at:'2026-11-19T16:00:00'},{...independent,encounter_at:'2026-02-30T16:00:00Z'},{...independent,group_name:''},{...independent,reviewed:false},{...independent,sections:{data:'Only data'}},{...independent,template:'Other'}])await assert.rejects(q('select public.save_independent_group_note($1)',[bad]));
 assert.equal((await q('select count(*)::int n from public.emr_group_individual_notes')).rows[0].n,3);
});
await test('independent amendments and optional original attestations keep correct patient binding and full metadata',async()=>{
 await as(admin);const original=(await q('select sections from public.emr_group_individual_notes where id=$1',[nid])).rows[0].sections;
 const a={note_id:nid,patient_id:p1,session_id:null,reason:'Fictional correction',amendment:'Fictional supplementary information',reviewed:true};assert.ok((await q('select public.save_emr_group_note_amendment($1) id',[a])).rows[0].id);
 const signature={note_id:nid,patient_id:p1,session_id:null,typed_name:'Fictional Group Clinician',attested:true};assert.ok((await q('select public.attest_emr_group_individual_note($1) id',[signature])).rows[0].id);
 const saved=(await q('select statement,signed_content from public.emr_group_note_attestations where note_id=$1',[nid])).rows[0];assert.match(saved.statement,/documented session details/);assert.equal(saved.signed_content.group_name,independent.group_name);assert.ok(saved.signed_content.encounter_at);assert.equal(saved.signed_content.session_id,null);assert.deepEqual(saved.signed_content.sections,original);
 await assert.rejects(q('select public.save_emr_group_note_amendment($1)',[{...a,patient_id:p2}]));await assert.rejects(q('select public.save_emr_group_note_amendment($1)',[{...a,session_id:p2}]));assert.deepEqual((await q('select sections from public.emr_group_individual_notes where id=$1',[nid])).rows[0].sections,original);
});
await test('shared-session notes still require Present attendance and cannot use the independent null-session amendment path',async()=>{
 await as(admin);const group={group_name:'Fictional shared group',facilitators:'Fictional clinician',scheduled_start:'2026-11-19T16:00:00Z',duration_minutes:60,shared_topic:'Fictional topic',shared_content:'Fictional shared information',reviewed:true,participants:[{patient_id:p1,attendance:'Present'},{patient_id:p2,attendance:'Absent'}]};const sid=(await q('select public.save_emr_group_session($1) id',[group])).rows[0].id;
 const linked={session_id:sid,patient_id:p1,template:'DAP',sections:independent.sections,reviewed:true};const id=(await q('select public.save_emr_group_individual_note($1) id',[linked])).rows[0].id;
 await assert.rejects(q('select public.save_emr_group_individual_note($1)',[{...linked,patient_id:p2}]));
 const a={note_id:id,patient_id:p1,session_id:null,reason:'Fictional reason',amendment:'Fictional text here',reviewed:true};await assert.rejects(q('select public.save_emr_group_note_amendment($1)',[a]));await assert.rejects(q('select public.attest_emr_group_individual_note($1)',[{note_id:id,patient_id:p1,session_id:null,typed_name:'Fictional Group Clinician',attested:true}]));
 assert.ok((await q('select public.save_emr_group_note_amendment($1) id',[{...a,session_id:sid}])).rows[0].id);assert.ok((await q('select public.attest_emr_group_individual_note($1) id',[{note_id:id,patient_id:p1,session_id:sid,typed_name:'Fictional Group Clinician',attested:true}])).rows[0].id);
});
await test('independent rows remain owner/MFA/admin protected and immutable, with no public RPC access',async()=>{
 await as(secondAdmin);assert.equal((await q('select * from public.emr_group_individual_notes where id=$1',[nid])).rows.length,0);await assert.rejects(q('select public.save_emr_group_note_amendment($1)',[{note_id:nid,patient_id:p1,session_id:null,reason:'Fictional reason',amendment:'Fictional addendum',reviewed:true}]));
 for(const [id,aal]of [[p1,'aal2'],[admin,'aal1']]){await as(id,aal);assert.equal((await q('select * from public.emr_group_individual_notes')).rows.length,0);await assert.rejects(q('select public.save_independent_group_note($1)',[independent]),/MFA required/);}
 await as(admin);await assert.rejects(q('update public.emr_group_individual_notes set session_id=null'),/permission denied/);await assert.rejects(q('delete from public.emr_group_individual_notes'),/permission denied/);
 await db.exec('reset role;set role anon');await assert.rejects(q('select public.save_independent_group_note($1)',[independent]),/permission denied/);
});
await db.close();
