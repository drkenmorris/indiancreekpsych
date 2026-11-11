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
await as(admin);
const group={group_name:'Fictional psychotherapy group',facilitators:'Sample clinician',scheduled_start:'2026-11-09T20:00:00Z',
 duration_minutes:60,shared_topic:'Communication',shared_content:'Shared educational group notes.',reviewed:true,
 participants:[{patient_id:p1,attendance:'Present'},{patient_id:p2,attendance:'Absent'}]};
const sid=(await q('select public.save_emr_group_session($1) id',[group])).rows[0].id;
const note={session_id:sid,patient_id:p1,template:'DAP',sections:{data:'Observed participation',assessment:'Engagement documented',plan:'Discuss coping skills'},reviewed:true};
await test('authorized MFA clinician appends a patient-bound unsigned individual note',async()=>{
 await as(admin);
 const saved=await q('select public.save_emr_group_individual_note($1) id',[note]);
 assert.ok(saved.rows[0].id);
 const rows=await q('select owner_id,patient_id,template,sections from public.emr_group_individual_notes');
 assert.equal(rows.rows.length,1);assert.equal(rows.rows[0].patient_id,p1);assert.equal(rows.rows[0].owner_id,admin);
});
await test('absent patient, wrong session, incomplete note and unreviewed content cannot be saved',async()=>{
 await as(admin);
 for(const invalid of [
 {...note,patient_id:p2},
 {...note,session_id:'00000000-0000-0000-0000-000000000999'},
 {...note,reviewed:false},
 {...note,sections:{data:'',assessment:'yes',plan:'later'}},
 {...note,sections:{...note.sections,extra:'unsafe'}},
 {...note,template:'SOAP'},
 ])await assert.rejects(q('select public.save_emr_group_individual_note($1)',[invalid]));
 assert.equal((await q('select count(*)::int n from public.emr_group_individual_notes')).rows[0].n,1);
});
await test('other administrators, patients and MFA-less clinicians cannot see or write protected individual notes',async()=>{
 await as(secondAdmin);
 assert.equal((await q('select * from public.emr_group_individual_notes')).rows.length,0);
 await assert.rejects(q('select public.save_emr_group_individual_note($1)',[note]),/Group session unavailable/);
 await as(p1);assert.equal((await q('select * from public.emr_group_individual_notes')).rows.length,0);
 await as(admin,'aal1');assert.equal((await q('select * from public.emr_group_individual_notes')).rows.length,0);
 await assert.rejects(q('select public.save_emr_group_individual_note($1)',[note]),/MFA required/);
});
await test('signed note and clinical data cannot be changed directly by authenticated account',async()=>{
 await as(admin);
 await assert.rejects(q("update public.emr_group_individual_notes set template='Narrative'"),/permission denied/);
 await assert.rejects(q('delete from public.emr_group_individual_notes'),/permission denied/);
 await assert.rejects(q('insert into public.emr_group_individual_notes(patient_id) values($1)',[p1]),/permission denied/);
});

await test('authorized clinician can add an immutable correction without modifying the original note',async()=>{
 await as(admin);
 const original=(await q('select id,sections from public.emr_group_individual_notes limit 1')).rows[0];
 const details={note_id:original.id,patient_id:p1,session_id:sid,reason:'Clarify timing',amendment:'Patient described an additional coping skill after the group.',reviewed:true};
 const result=await q('select public.save_emr_group_note_amendment($1) id',[details]);
 assert.ok(result.rows[0].id);
 const noteAfter=(await q('select sections from public.emr_group_individual_notes where id=$1',[original.id])).rows[0];
 assert.deepEqual(noteAfter.sections,original.sections);
 const rows=await q('select note_id,reason,amendment from public.emr_group_note_amendments');
 assert.equal(rows.rows.length,1);assert.equal(rows.rows[0].note_id,original.id);
});
await test('addendum rejects wrong patient/session, missing review, and incomplete text; immutable history cannot be overwritten',async()=>{
 await as(admin);
 const id=(await q('select id from public.emr_group_individual_notes limit 1')).rows[0].id;
 const payload={note_id:id,patient_id:p1,session_id:sid,reason:'Correct details',amendment:'New details reviewed with patient.',reviewed:true};
 for(const bad of [
  {...payload,patient_id:p2},{...payload,session_id:'00000000-0000-0000-0000-000000000999'},
  {...payload,reviewed:false},{...payload,reason:'no'},{...payload,amendment:'x'},
  {...payload,note_id:'00000000-0000-0000-0000-000000000999'},
 ])await assert.rejects(q('select public.save_emr_group_note_amendment($1)',[bad]));
 assert.equal((await q('select count(*)::int n from public.emr_group_note_amendments')).rows[0].n,1);
 await assert.rejects(q("update public.emr_group_note_amendments set reason='Edited existing addendum'"),/permission denied/);
 await assert.rejects(q('delete from public.emr_group_note_amendments'),/permission denied/);
});
await test('other administrators, patients and missing MFA cannot read or append the original clinician addendum',async()=>{
 await as(admin);
 const id=(await q('select id from public.emr_group_individual_notes limit 1')).rows[0].id;
 const payload={note_id:id,patient_id:p1,session_id:sid,reason:'Correction needed',amendment:'Additional clinical information.',reviewed:true};
 await as(secondAdmin);
 assert.equal((await q('select * from public.emr_group_note_amendments')).rows.length,0);
 await assert.rejects(q('select public.save_emr_group_note_amendment($1)',[payload]),/note unavailable/);
 await as(p1);
 assert.equal((await q('select * from public.emr_group_note_amendments')).rows.length,0);
 await as(admin,'aal1');
 assert.equal((await q('select * from public.emr_group_note_amendments')).rows.length,0);
 await assert.rejects(q('select public.save_emr_group_note_amendment($1)',[payload]),/MFA required/);
});


let signedGroupNoteId;
await test('MFA note author may permanently attest a real attended group note with signed clinical snapshot',async()=>{
 await as(admin);
 const source=(await q('select id,sections from public.emr_group_individual_notes limit 1')).rows[0];
 const signature=await q('select public.attest_emr_group_individual_note($1) id',[{
  note_id:source.id,patient_id:p1,session_id:sid,typed_name:'Fictional Group Clinician',attested:true
 }]);
 signedGroupNoteId=signature.rows[0].id;
 assert.ok(signedGroupNoteId);
 const saved=(await q('select note_id,owner_id,signer_name,signed_content from public.emr_group_note_attestations')).rows[0];
 assert.equal(saved.note_id,source.id);
 assert.equal(saved.owner_id,admin);
 assert.equal(saved.signer_name,'Fictional Group Clinician');
 assert.equal(saved.signed_content.patient_id,p1);
 assert.equal(saved.signed_content.session_id,sid);
 assert.deepEqual(saved.signed_content.sections,source.sections);
});
await test('attestation cannot be forged, repeated, edited, or removed by an authenticated user',async()=>{
 await as(admin);
 const source=(await q('select id from public.emr_group_individual_notes limit 1')).rows[0].id;
 const payload={note_id:source,patient_id:p1,session_id:sid,typed_name:'Fictional Group Clinician',attested:true};
 await assert.rejects(q('select public.attest_emr_group_individual_note($1)',[payload]),/already attested/);
 for(const bad of [
  {...payload,typed_name:'Fake Clinician'}, {...payload,attested:false},
  {...payload,patient_id:p2},{...payload,session_id:'00000000-0000-0000-0000-000000000999'},
  {...payload,note_id:'00000000-0000-0000-0000-000000000999'}
 ])await assert.rejects(q('select public.attest_emr_group_individual_note($1)',[bad]));
 await assert.rejects(q("update public.emr_group_note_attestations set signer_name='Forged Clinician'"),/permission denied/);
 await assert.rejects(q('delete from public.emr_group_note_attestations'),/permission denied/);
 await assert.rejects(q('insert into public.emr_group_note_attestations(note_id) values($1)',[source]),/permission denied/);
 assert.equal((await q('select count(*)::int n from public.emr_group_note_attestations')).rows[0].n,1);
});
await test('RLS blocks other admins, patients, and sessions without MFA; unsigned addenda remain independent',async()=>{
 const source=(await q('select id from public.emr_group_individual_notes limit 1')).rows[0].id;
 const payload={note_id:source,patient_id:p1,session_id:sid,typed_name:'Fictional Group Clinician',attested:true};
 await as(secondAdmin);
 assert.equal((await q('select * from public.emr_group_note_attestations')).rows.length,0);
 await assert.rejects(q('select public.attest_emr_group_individual_note($1)',[payload]));
 await as(p1);
 assert.equal((await q('select * from public.emr_group_note_attestations')).rows.length,0);
 await assert.rejects(q('select public.attest_emr_group_individual_note($1)',[payload]),/MFA required/);
 await as(admin,'aal1');
 assert.equal((await q('select * from public.emr_group_note_attestations')).rows.length,0);
 await assert.rejects(q('select public.attest_emr_group_individual_note($1)',[payload]),/MFA required/);
 await as(admin);
 assert.equal((await q('select * from public.emr_group_note_amendments')).rows.length,1);
 assert.equal((await q('select * from public.emr_group_note_attestations')).rows[0].id,signedGroupNoteId);
});
await test('unverified clinician email cannot create a clinical attestation',async()=>{
 await db.exec('reset role');
 await q('update auth.users set email_confirmed_at=null where id=$1',[admin]);
 await as(admin);
 const source=(await q('select id from public.emr_group_individual_notes limit 1')).rows[0].id;
 await assert.rejects(q('select public.attest_emr_group_individual_note($1)',[{
  note_id:source,patient_id:p1,session_id:sid,typed_name:'Fictional Group Clinician',attested:true
 }]),/MFA required/);
 await db.exec('reset role');
 await q('update auth.users set email_confirmed_at=now() where id=$1',[admin]);
});

await db.close();
