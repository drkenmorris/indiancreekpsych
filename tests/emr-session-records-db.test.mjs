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
await db.exec(`alter table auth.users add column email_confirmed_at timestamptz;
 alter table public.profiles add column full_name text;
 update auth.users set email_confirmed_at=now();
 update public.profiles set full_name=case when id='00000000-0000-0000-0000-000000000101'::uuid then 'Fictional Clinician' else 'Other Clinician' end;`);
await db.exec(readFileSync('supabase/migrations/20261110071500_emr_individual_progress_note_attestations.sql','utf8'));
const q=(sql,args=[])=>db.query(sql,args);
const as=async(id,aal='aal2')=>{
 await db.exec('reset role');
 await q("select set_config('request.user',$1,false),set_config('request.aal',$2,false)",[id,aal]);
 await db.exec('set role authenticated');
};
await db.exec(readFileSync('supabase/migrations/20261119183317_emr_session_note_revisions.sql','utf8'));

const entry={patient_id:patient,encounter_at:'2026-11-19T12:00:00Z',encounter_type:'Individual therapy',template:'DAP',sections:{data:'Fictional old wording',assessment:'Fictional assessment',plan:'Fictional plan'},reviewed:true};
let noteId,firstRevision;
const revise=(extra={})=>({patient_id:patient,note_id:noteId,expected_prior_id:null,reason:'Fictional corrected wording',sections:{...entry.sections,data:'Fictional new wording'},reviewed:true,...extra});
await test('server timing boundary is inclusive through 72h and late only afterward',async()=>{
 const base='2026-11-01T12:00:00Z';for(const [end,expected] of [['2026-11-04T11:59:59.999999Z',false],['2026-11-04T12:00:00Z',false],['2026-11-04T12:00:00.000001Z',true]])assert.equal((await q('select private.session_note_revision_is_late($1,$2) late',[base,end])).rows[0].late,expected);
});
await test('within-window revision is separate, attributed and retains original note and author attestation',async()=>{
 await as(admin);noteId=(await q('select public.save_emr_individual_progress_note($1) id',[entry])).rows[0].id;
 await q('select public.attest_emr_individual_progress_note($1)',[{patient_id:patient,note_id:noteId,typed_name:'Fictional Clinician',attested:true}]);
 firstRevision=(await q('select public.revise_emr_session_note($1) id',[revise()])).rows[0].id;
 const saved=(await q('select * from public.emr_individual_progress_note_revisions where id=$1',[firstRevision])).rows[0];assert.equal(saved.after_window,false);assert.equal(saved.revision,1);assert.equal(saved.owner_id,admin);assert.deepEqual(saved.before_sections,entry.sections);assert.equal(saved.sections.data,'Fictional new wording');
 assert.deepEqual((await q('select sections from public.emr_individual_progress_notes where id=$1',[noteId])).rows[0].sections,entry.sections);
 assert.deepEqual((await q('select signed_content from public.emr_individual_progress_note_attestations where note_id=$1',[noteId])).rows[0].signed_content.sections,entry.sections);
});
await test('stale and cross-note prior revisions, invalid sections and forged timing are rejected',async()=>{
 await as(admin);for(const bad of [revise(),revise({expected_prior_id:otherPatient}),revise({expected_prior_id:firstRevision,after_window:false}),revise({expected_prior_id:firstRevision,sections:{data:'x'}}),revise({expected_prior_id:firstRevision,sections:{data:'',assessment:'',plan:''}}),revise({expected_prior_id:firstRevision,sections:{...entry.sections,data:'x'.repeat(4001)}}),revise({expected_prior_id:firstRevision,reviewed:false}),revise({expected_prior_id:firstRevision,patient_id:otherPatient})])await assert.rejects(q('select public.revise_emr_session_note($1)',[bad]));
 assert.equal((await q('select count(*)::int n from public.emr_individual_progress_note_revisions')).rows[0].n,1);
});
await test('after-window revisions use original recorded time, preserve chain and allow explicit removal of a section',async()=>{
 await db.exec('reset role');await q("update public.emr_individual_progress_notes set created_at=clock_timestamp()-interval '73 hours' where id=$1",[noteId]);await as(admin);
 const data=revise({expected_prior_id:firstRevision,sections:{...entry.sections,data:'Fictional later addition',assessment:''}});const id=(await q('select public.revise_emr_session_note($1) id',[data])).rows[0].id;
 const saved=(await q('select * from public.emr_individual_progress_note_revisions where id=$1',[id])).rows[0];assert.equal(saved.after_window,true);assert.equal(saved.prior_id,firstRevision);assert.equal(saved.revision,2);assert.equal(saved.before_sections.data,'Fictional new wording');assert.equal(saved.sections.assessment,'');
 await assert.rejects(q('select public.revise_emr_session_note($1)',[data]),/Reload/);
});
await test('different owner, patient, anonymous and no-MFA sessions cannot read or create revisions; direct mutation unavailable',async()=>{
 await as(otherAdmin);assert.equal((await q('select * from public.emr_individual_progress_note_revisions')).rows.length,0);await assert.rejects(q('select public.revise_emr_session_note($1)',[revise()]));
 for(const [id,aal]of [[patient,'aal2'],[admin,'aal1']]){await as(id,aal);assert.equal((await q('select * from public.emr_individual_progress_note_revisions')).rows.length,0);await assert.rejects(q('select public.revise_emr_session_note($1)',[revise()]),/MFA required/);}
 await as(admin);for(const sql of ["update public.emr_individual_progress_note_revisions set after_window=false","delete from public.emr_individual_progress_note_revisions","insert into public.emr_individual_progress_note_revisions(note_id) values('"+noteId+"')"])await assert.rejects(q(sql),/permission denied/);
 await db.exec('reset role;set role anon');await assert.rejects(q('select public.revise_emr_session_note($1)',[revise()]),/permission denied/);
});
await db.close();
