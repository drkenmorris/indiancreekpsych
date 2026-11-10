import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const admin='00000000-0000-0000-0000-000000000101',otherAdmin='00000000-0000-0000-0000-000000000102';
const patient='00000000-0000-0000-0000-000000000103',otherPatient='00000000-0000-0000-0000-000000000104';
await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.user',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.aal',true))$$;
create table auth.users(id uuid primary key);
create table public.profiles(id uuid primary key,account_type text);
create table public.clinical_patients(id uuid primary key,demographics jsonb);
create function private.current_user_is_admin() returns boolean language sql security definer stable set search_path='' as $$
select exists(select 1 from public.profiles where id=auth.uid() and account_type='admin')$$;
grant usage on schema public,private,auth to anon,authenticated;
grant select on public.clinical_patients,public.profiles to authenticated;`);
for(const [id,role] of [[admin,'admin'],[otherAdmin,'admin'],[patient,'patient']]){
 await db.query('insert into auth.users values($1)',[id]);
 await db.query('insert into public.profiles values($1,$2)',[id,role]);
}
for(const id of [patient,otherPatient])await db.query('insert into public.clinical_patients values($1,$2)',[id,{first_name:'Fictional'}]);
await db.exec(readFileSync('supabase/migrations/20261110061000_emr_individual_progress_notes.sql','utf8'));
const q=(sql,args=[])=>db.query(sql,args);
const as=async(id,aal='aal2')=>{
 await db.exec('reset role');
 await q("select set_config('request.user',$1,false),set_config('request.aal',$2,false)",[id,aal]);
 await db.exec('set role authenticated');
};
const entry={patient_id:patient,encounter_at:'2026-11-09T20:00:00Z',encounter_type:'Individual therapy',template:'DAP',
 sections:{data:'Patient discussed progress',assessment:'Observed positive response',plan:'Continue care'},reviewed:true};
let noteId;
await test('MFA clinician can append unsigned outpatient note with correct central patient',async()=>{
 await as(admin);
 const result=await q('select public.save_emr_individual_progress_note($1) id',[entry]);
 noteId=result.rows[0].id;assert.ok(noteId);
 const saved=(await q('select patient_id,owner_id,sections,reviewed from public.emr_individual_progress_notes')).rows;
 assert.equal(saved.length,1);assert.equal(saved[0].patient_id,patient);assert.equal(saved[0].owner_id,admin);
 assert.equal(saved[0].sections.data,entry.sections.data);assert.equal(saved[0].reviewed,true);
});
await test('unreviewed content, invalid encounter, missing patient, extra sections and fake template fail',async()=>{
 await as(admin);
 for(const bad of [
  {...entry,reviewed:false},{...entry,patient_id:'00000000-0000-0000-0000-000000000999'},
  {...entry,encounter_type:'unsupported'}, {...entry,template:'Unknown'},
  {...entry,sections:{...entry.sections,extra:'forged'}},
  {...entry,sections:{data:'',assessment:'valid text',plan:'valid text'}},
  {...entry,template:'SOAP'},
 ])await assert.rejects(q('select public.save_emr_individual_progress_note($1)',[bad]));
 assert.equal((await q('select count(*)::int n from public.emr_individual_progress_notes')).rows[0].n,1);
});
await test('different admin cannot read first admin notes; patients and no-MFA users cannot read or write',async()=>{
 await as(otherAdmin);
 assert.equal((await q('select * from public.emr_individual_progress_notes')).rows.length,0);
 await as(patient);
 assert.equal((await q('select * from public.emr_individual_progress_notes')).rows.length,0);
 await assert.rejects(q('select public.save_emr_individual_progress_note($1)',[entry]),/MFA required/);
 await as(admin,'aal1');
 assert.equal((await q('select * from public.emr_individual_progress_notes')).rows.length,0);
 await assert.rejects(q('select public.save_emr_individual_progress_note($1)',[entry]),/MFA required/);
});
await test('saved progress notes cannot be directly inserted, altered or deleted',async()=>{
 await as(admin);
 await assert.rejects(q("update public.emr_individual_progress_notes set encounter_type='Follow-up'"),/permission denied/);
 await assert.rejects(q('delete from public.emr_individual_progress_notes'),/permission denied/);
 await assert.rejects(q('insert into public.emr_individual_progress_notes(patient_id) values($1)',[patient]),/permission denied/);
});
await test('reviewed addendum saved with unchanged original and immutable provenance',async()=>{
 await as(admin);
 const original=(await q('select sections from public.emr_individual_progress_notes where id=$1',[noteId])).rows[0].sections;
 const add={note_id:noteId,patient_id:patient,reason:'Correct encounter details',amendment:'Additional context documented after review.',reviewed:true};
 const result=await q('select public.save_emr_individual_progress_note_addendum($1) id',[add]);
 assert.ok(result.rows[0].id);
 assert.deepEqual((await q('select sections from public.emr_individual_progress_notes where id=$1',[noteId])).rows[0].sections,original);
 const saved=(await q('select note_id,owner_id from public.emr_individual_progress_note_addenda')).rows;
 assert.equal(saved.length,1);assert.equal(saved[0].note_id,noteId);assert.equal(saved[0].owner_id,admin);
 await assert.rejects(q("update public.emr_individual_progress_note_addenda set reason='forged'"),/permission denied/);
 await assert.rejects(q('delete from public.emr_individual_progress_note_addenda'),/permission denied/);
});
await test('amendment denies wrong patient, wrong note, no review, short reason and missing MFA',async()=>{
 await as(admin);
 const add={note_id:noteId,patient_id:patient,reason:'Clarification needed',amendment:'Additional reviewed information.',reviewed:true};
 for(const bad of [
  {...add,patient_id:otherPatient},{...add,note_id:'00000000-0000-0000-0000-000000000999'},
  {...add,reason:'no'}, {...add,amendment:'x'}, {...add,reviewed:false},
 ])await assert.rejects(q('select public.save_emr_individual_progress_note_addendum($1)',[bad]));
 await as(admin,'aal1');
 assert.equal((await q('select * from public.emr_individual_progress_note_addenda')).rows.length,0);
 await assert.rejects(q('select public.save_emr_individual_progress_note_addendum($1)',[add]),/MFA required/);
 await as(otherAdmin);
 assert.equal((await q('select * from public.emr_individual_progress_note_addenda')).rows.length,0);
 await assert.rejects(q('select public.save_emr_individual_progress_note_addendum($1)',[add]),/unavailable/);
});
await db.close();
