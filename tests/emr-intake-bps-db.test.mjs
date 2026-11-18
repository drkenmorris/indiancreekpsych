import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const admin='00000000-0000-0000-0000-000000000101',other='00000000-0000-0000-0000-000000000102',
 account='00000000-0000-0000-0000-000000000103',patient='00000000-0000-0000-0000-000000000104',unlinked='00000000-0000-0000-0000-000000000105';
const stamp='2026-11-10T09:00:00Z';
await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.user',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.aal',true))$$;
create table auth.users(id uuid primary key);
create table public.profiles(id uuid primary key references auth.users(id),account_type text);
create table public.clinical_patients(id uuid primary key,account_id uuid references public.profiles(id),directory_deleted_at timestamptz);
create table public.patient_intakes(patient_id uuid primary key references public.profiles(id),answers jsonb not null,status text not null,version integer not null,updated_at timestamptz not null,submitted_at timestamptz);
create function private.current_user_is_admin() returns boolean language sql security definer stable set search_path='' as $$
select exists(select 1 from public.profiles where id=auth.uid() and account_type='admin')$$;
grant usage on schema auth,private,public to authenticated,anon;`);
for(const [id,role] of [[admin,'admin'],[other,'admin'],[account,'patient']]){
 await db.query('insert into auth.users values($1)',[id]);await db.query('insert into public.profiles values($1,$2)',[id,role]);
}
await db.query('insert into public.clinical_patients values($1,$2)',[patient,account]);
await db.query('insert into public.clinical_patients values($1,$2)',[unlinked,null]);
await db.query('insert into public.patient_intakes values($1,$2,$3,$4,$5,$6)',[account,{
 counseling_reason:'Patient-reported sadness',suicidal_thoughts_current:'Yes',medication_entries:'structured original',
 roi_authorize:'Yes',treatment_signature:'Patient Signature',insurance_member:'protected identifier'},'submitted',1,stamp,stamp]);
await db.exec(readFileSync('supabase/migrations/20261110103000_emr_bps_intake_reviews.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261111101500_emr_bps_review_account_provenance.sql','utf8'));
for(const migration of [
 '20261113110400_emr_bps_active_chart_boundary.sql',
 '20261113165500_emr_bps_submitted_receipt_boundary.sql',
 '20261114050000_emr_bps_submitted_chronology_boundary.sql',
 '20261114121500_emr_bps_review_after_patient_submission.sql',
 '20261115071500_emr_bps_draft_attestation_boundary.sql',
 '20261117181000_require_documented_bps_review.sql',
 '20261117185800_bps_review_visible_note_guard.sql',
 '20261118120500_bps_review_variation_selector_guard.sql',\n '20261118210600_bps_supplementary_variation_selector_guard.sql',
 '20261118184500_bps_atomic_submission_receipt.sql',
 '20261118204000_bps_atomic_answer_identity.sql'
])await db.exec(readFileSync('supabase/migrations/'+migration,'utf8'));
const q=(s,args=[])=>db.query(s,args);
const as=async(id,aal='aal2')=>{await db.exec('reset role');await q("select set_config('request.user',$1,false),set_config('request.aal',$2,false)",[id,aal]);await db.exec('set role authenticated');};
const payload={patient_id:patient,source_account_id:account,source_version:1,source_status:'submitted',source_updated_at:stamp,source_submitted_at:stamp,
 reviewed:true,source_answers:{
 counseling_reason:'Patient-reported sadness',suicidal_thoughts_current:'Yes',
 medication_entries:'structured original',roi_authorize:'Yes',
 treatment_signature:'Patient Signature',insurance_member:'protected identifier'
},clinician_notes:{presenting:'Clinician reviewed patient account; not a diagnosis.'}};
await test('contradictory draft patient submission receipt cannot create an attested clinician review',async()=>{
 // Protect this boundary in the database as well as the HTTP API: even a
 // legitimate MFA administrator must not save contradictory patient provenance.
 await db.exec('reset role');
 await q("update public.patient_intakes set status='draft' where patient_id=$1",[account]);
 await as(admin);
 await assert.rejects(
  q('select public.save_emr_bps_intake_review($1)',[{...payload,source_status:'draft'}]),
  /Draft BPS source cannot retain a final patient submission attestation/
 );
 assert.equal((await q('select count(*)::integer n from public.emr_bps_intake_reviews')).rows[0].n,0);
 await db.exec('reset role');
 await q("update public.patient_intakes set status='submitted' where patient_id=$1",[account]);
});
await test('direct authorized BPS RPC atomically validates exact submission receipt',async()=>{
 await db.exec('reset role');
 await q("update public.patient_intakes set submitted_at=$1 where patient_id=$2",['2026-11-10T09:00:05Z',account]);
 await as(admin);
 await assert.rejects(q('select public.save_emr_bps_intake_review($1)',[payload]),/Patient submission receipt changed/);
 await assert.rejects(q('select public.save_emr_bps_intake_review($1)',[{...payload,source_submitted_at:null}]),/Patient submission receipt changed/);
 await assert.rejects(q('select public.save_emr_bps_intake_review($1)',[{...payload,source_submitted_at:'not-a-timestamp'}]),/Invalid BPS patient or intake provenance/);
 await db.exec('reset role');
 await q("update public.patient_intakes set submitted_at=$1 where patient_id=$2",[stamp,account]);
 assert.equal((await q('select count(*)::integer n from public.emr_bps_intake_reviews')).rows[0].n,0);
});
await test('atomic review refuses changed patient answers even when receipt and version are unchanged',async()=>{
 await db.exec('reset role');
 // Simulates an out-of-band source edit that failed to advance version or time.
 // It must never be silently treated as the patient source the clinician reviewed.
 await q("update public.patient_intakes set answers=jsonb_set(answers,'{counseling_reason}',to_jsonb('Altered fictional report'::text)) where patient_id=$1",[account]);
 await as(admin);
 await assert.rejects(
  q('select public.save_emr_bps_intake_review($1)',[payload]),
  /Patient answers changed during clinical review/
 );
 await assert.rejects(
  q('select public.save_emr_bps_intake_review($1)',[{...payload,source_answers:null}]),
  /Patient answers changed during clinical review/
 );
 await assert.rejects(
  q('select public.save_emr_bps_intake_review($1)',[{...payload,source_answers:{}}]),
  /Patient answers changed during clinical review/
 );
 assert.equal((await q('select count(*)::integer n from public.emr_bps_intake_reviews')).rows[0].n,0);
 await db.exec('reset role');
 await q("update public.patient_intakes set answers=jsonb_set(answers,'{counseling_reason}',to_jsonb('Patient-reported sadness'::text)) where patient_id=$1",[account]);
});
await test('direct authorized BPS RPC cannot create checkbox-only, whitespace-only review history',async()=>{
 await as(admin);
 for(const notes of [{},{presenting:'   '},{presenting:'\n\t',goals:''},
  {presenting:'\u200B\u2060\u200E'},{goals:'\u202E\u2066\u2069'},
  {limitations:' \u00AD\u034F\u061C\u180E\uFEFF\n'},{presenting:'\uFE0F'},{goals:'\uFE00\uFE0E\uFE0F'},{limitations:'\uFE0E\uFE0F \n'},{goals:'\u{E0100}'},{limitations:'\u{E0100}\u{E01EF} \n'}]){
  await assert.rejects(
   q('select public.save_emr_bps_intake_review($1)',[{...payload,clinician_notes:notes}]),
   /Document an independent clinician observation or follow-up need/
  );
 }
 assert.equal((await q('select count(*)::integer n from public.emr_bps_intake_reviews')).rows[0].n,0);
});
await test('MFA clinician saves an append-only BPS review using DB-owned clinical source fields',async()=>{
 await as(admin);
 const saved=await q('select public.save_emr_bps_intake_review($1) id',[payload]);assert.ok(saved.rows[0].id);
 const row=(await q('select patient_id,source_account_id,source_version,clinical_answers,clinician_notes from public.emr_bps_intake_reviews')).rows[0];
 assert.equal(row.patient_id,patient);assert.equal(row.source_account_id,account);assert.equal(row.source_version,1);
 assert.equal(row.clinical_answers.counseling_reason,'Patient-reported sadness');
 assert.equal(row.clinical_answers.suicidal_thoughts_current,'Yes');
 for(const key of ['roi_authorize','treatment_signature','insurance_member','medication_entries'])assert.equal(row.clinical_answers[key],undefined);
 assert.match(row.clinician_notes.presenting,/not a diagnosis/);
});
await test('no-MFA and other-admin cannot see chart review; direct writes denied',async()=>{
 await as(other);assert.equal((await q('select * from public.emr_bps_intake_reviews')).rows.length,0);
 await as(account);assert.equal((await q('select * from public.emr_bps_intake_reviews')).rows.length,0);
 await assert.rejects(q('select public.save_emr_bps_intake_review($1)',[payload]));
 await as(admin,'aal1');assert.equal((await q('select * from public.emr_bps_intake_reviews')).rows.length,0);
 await assert.rejects(q('select public.save_emr_bps_intake_review($1)',[payload]));
 await as(admin);
 await assert.rejects(q("delete from public.emr_bps_intake_reviews"),/permission denied/);
 await assert.rejects(q("update public.emr_bps_intake_reviews set source_status='draft'"),/permission denied/);
});
await test('duplicate source review and unlinked patients are rejected without altering prior snapshot',async()=>{
 await as(admin);
 await assert.rejects(q('select public.save_emr_bps_intake_review($1)',[payload]));
 await assert.rejects(q('select public.save_emr_bps_intake_review($1)',[{...payload,patient_id:unlinked}]));
 assert.equal((await q('select count(*)::integer n from public.emr_bps_intake_reviews')).rows[0].n,1);
});
await test('source version/status/timestamp tampering and unreviewed notes fail closed',async()=>{
 await as(admin);
 for(const bad of [{...payload,source_version:2},{...payload,source_status:'draft'},
  {...payload,source_updated_at:'2026-11-10T09:00:01Z'},{...payload,reviewed:false},
  {...payload,clinician_notes:{forged:'injection'}},{...payload,clinician_notes:{safety:'x'.repeat(4001)}}]){
  await assert.rejects(q('select public.save_emr_bps_intake_review($1)',[bad]));
 }
 await db.exec('reset role');
 await q('update public.patient_intakes set version=version+1 where patient_id=$1',[account]);
 await as(admin);
 await assert.rejects(q('select public.save_emr_bps_intake_review($1)',[payload]));
});
await test('relinking a central chart to a different account preserves original BPS evidence and permits its own source version',async()=>{
 const newlyLinked='00000000-0000-0000-0000-000000000106';
 // Only privileged chart administration can explicitly link an account.
 // Never match by patient name, email or a synthetic provider identity.
 await db.exec('reset role');
 await q('insert into auth.users values($1)',[newlyLinked]);
 await q('insert into public.profiles values($1,$2)',[newlyLinked,'patient']);
 await q('insert into public.patient_intakes values($1,$2,$3,$4,$5,$6)',[
  newlyLinked,{counseling_reason:'New linked account patient report',
   suicidal_thoughts_current:'No response',roi_authorize:'Protected new legal decision'},
  'submitted',1,stamp,stamp
 ]);
 await q('update public.clinical_patients set account_id=$1 where id=$2',[newlyLinked,patient]);
 await as(admin);
 await assert.rejects(q('select public.save_emr_bps_intake_review($1)',[payload]),/account link changed/);
 const currentPayload={...payload,source_account_id:newlyLinked,source_answers:{
  counseling_reason:'New linked account patient report',
  suicidal_thoughts_current:'No response',
  roi_authorize:'Protected new legal decision'
 }};
 const saved=await q('select public.save_emr_bps_intake_review($1) id',[currentPayload]);
 assert.ok(saved.rows[0].id);
 const snapshots=(await q('select source_account_id,source_version,clinical_answers from public.emr_bps_intake_reviews where patient_id=$1',[patient])).rows;
 assert.equal(snapshots.length,2);
 const old=snapshots.find(row=>row.source_account_id===account);
 const current=snapshots.find(row=>row.source_account_id===newlyLinked);
 assert.equal(old?.source_version,1);
 assert.equal(old?.clinical_answers.counseling_reason,'Patient-reported sadness');
 assert.equal(current?.source_version,1);
 assert.equal(current?.clinical_answers.counseling_reason,'New linked account patient report');
 assert.equal(current?.clinical_answers.roi_authorize,undefined);
 // One immutable review per clinician/chart/account/version remains enforced.
 await assert.rejects(q('select public.save_emr_bps_intake_review($1)',[currentPayload]),/duplicate key/);
 await as(other);
 assert.equal((await q('select * from public.emr_bps_intake_reviews')).rows.length,0);
});
await db.close();
