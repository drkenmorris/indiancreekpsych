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
create table public.clinical_patients(id uuid primary key,account_id uuid references public.profiles(id));
create table public.patient_intakes(patient_id uuid primary key references public.profiles(id),answers jsonb not null,status text not null,version integer not null,updated_at timestamptz not null);
create function private.current_user_is_admin() returns boolean language sql security definer stable set search_path='' as $$
select exists(select 1 from public.profiles where id=auth.uid() and account_type='admin')$$;
grant usage on schema auth,private,public to authenticated,anon;`);
for(const [id,role] of [[admin,'admin'],[other,'admin'],[account,'patient']]){
 await db.query('insert into auth.users values($1)',[id]);await db.query('insert into public.profiles values($1,$2)',[id,role]);
}
await db.query('insert into public.clinical_patients values($1,$2)',[patient,account]);
await db.query('insert into public.clinical_patients values($1,$2)',[unlinked,null]);
await db.query('insert into public.patient_intakes values($1,$2,$3,$4,$5)',[account,{
 counseling_reason:'Patient-reported sadness',suicidal_thoughts_current:'Yes',medication_entries:'structured original',
 roi_authorize:'Yes',treatment_signature:'Patient Signature',insurance_member:'protected identifier'},'submitted',1,stamp]);
await db.exec(readFileSync('supabase/migrations/20261110103000_emr_bps_intake_reviews.sql','utf8'));
const q=(s,args=[])=>db.query(s,args);
const as=async(id,aal='aal2')=>{await db.exec('reset role');await q("select set_config('request.user',$1,false),set_config('request.aal',$2,false)",[id,aal]);await db.exec('set role authenticated');};
const payload={patient_id:patient,source_version:1,source_status:'submitted',source_updated_at:stamp,
 reviewed:true,clinician_notes:{presenting:'Clinician reviewed patient account; not a diagnosis.'}};
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
await db.close();
