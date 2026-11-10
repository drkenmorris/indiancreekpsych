import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';

const db=new PGlite();
const admin='00000000-0000-0000-0000-000000000101';
const other='00000000-0000-0000-0000-000000000102';
const patient='00000000-0000-0000-0000-000000000103';
const patient2='00000000-0000-0000-0000-000000000104';
await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.user',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.aal',true))$$;
create table auth.users(id uuid primary key);
create table public.profiles(id uuid primary key,account_type text);
create table public.clinical_patients(id uuid primary key,demographics jsonb);
create function private.current_user_is_admin() returns boolean language sql security definer stable set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and account_type='admin')$$;
grant usage on schema auth,private,public to anon,authenticated;
grant select on public.profiles,public.clinical_patients to authenticated;`);
for(const [id,role] of [[admin,'admin'],[other,'admin'],[patient,'patient']]){
  await db.query('insert into auth.users values($1)',[id]);
  await db.query('insert into public.profiles values($1,$2)',[id,role]);
}
for(const id of [patient,patient2])await db.query('insert into public.clinical_patients values($1,$2)',[id,{first_name:'Fictional',last_name:'Group Member'}]);
await db.exec(readFileSync('supabase/migrations/20261109190000_emr_group_sessions.sql','utf8'));
const q=(sql,args=[])=>db.query(sql,args);
const as=async(id,aal='aal2')=>{await db.exec('reset role');await q("select set_config('request.user',$1,false),set_config('request.aal',$2,false)",[id,aal]);await db.exec('set role authenticated');};
const body={group_name:'Fictional skills group',facilitators:'Example clinician',scheduled_start:'2026-11-09T20:00:00Z',duration_minutes:60,shared_topic:'Communication skills',shared_content:'Reviewed shared psychoeducation, not individual clinical notes.',reviewed:true,participants:[{patient_id:patient,attendance:'Present'},{patient_id:patient2,attendance:'Excused'}]};

await test('administrator with MFA can atomically save two real central patient IDs',async()=>{
  await as(admin);
  const res=await q('select public.save_emr_group_session($1) id',[body]);assert.ok(res.rows[0].id);
  const group=await q('select owner_id,group_name,shared_content from public.emr_group_sessions');
  assert.equal(group.rows.length,1);assert.equal(group.rows[0].owner_id,admin);
  const members=await q('select patient_id,attendance from public.emr_group_participation order by patient_id');
  assert.equal(members.rows.length,2);assert.equal(members.rows[0].patient_id,patient);
});
await test('patients, other admins, missing MFA and anonymous visitors cannot read or save shared clinical records',async()=>{
  await as(other);assert.equal((await q('select * from public.emr_group_sessions')).rows.length,0);
  assert.equal((await q('select * from public.emr_group_participation')).rows.length,0);
  await as(patient);assert.equal((await q('select * from public.emr_group_sessions')).rows.length,0);
  await assert.rejects(q('select public.save_emr_group_session($1)',[body]),/MFA required/);
  await as(admin,'aal1');assert.equal((await q('select * from public.emr_group_sessions')).rows.length,0);
  await assert.rejects(q('select public.save_emr_group_session($1)',[body]),/MFA required/);
  await db.exec('reset role;set role anon');
  await assert.rejects(q('select * from public.emr_group_sessions'),/permission denied/);
  await assert.rejects(q('select public.save_emr_group_session($1)',[body]),/permission denied/);
});
await test('shared group sessions and roster cannot be changed directly',async()=>{
  await as(admin);
  await assert.rejects(q("update public.emr_group_sessions set shared_content='altered'"),/permission denied/);
  await assert.rejects(q('delete from public.emr_group_participation'),/permission denied/);
  await assert.rejects(q('insert into public.emr_group_sessions(group_name) values($1)',['forged']),/permission denied/);
});
await test('bad roster, missing review and invalid lengths roll back without partial inserts',async()=>{
  await as(admin);
  for(const bad of [
    {...body,reviewed:false},
    {...body,duration_minutes:5},
    {...body,participants:[body.participants[0]]},
    {...body,participants:[body.participants[0],body.participants[0]]},
    {...body,participants:[body.participants[0],{patient_id:'00000000-0000-0000-0000-000000000999',attendance:'Present'}]},
    {...body,participants:[body.participants[0],{patient_id:patient2,attendance:'Unknown'}]},
  ])await assert.rejects(q('select public.save_emr_group_session($1)',[bad]));
  assert.equal((await q('select count(*)::int n from public.emr_group_sessions')).rows[0].n,1);
  assert.equal((await q('select count(*)::int n from public.emr_group_participation')).rows[0].n,2);
});
await db.close();
