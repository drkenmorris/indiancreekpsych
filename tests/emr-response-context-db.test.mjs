import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = number => '00000000-0000-4000-8000-' + String(number).padStart(12, '0');
const [admin, therapist, otherStaff, patientAccount, chart, otherChart] = [1, 2, 3, 4, 5, 6].map(id);
const migration = readFileSync(new URL('../supabase/migrations/20261113175618_emr_treatment_modality.sql', import.meta.url), 'utf8');

await db.exec(`
 create role anon;
 create role authenticated;
 create schema auth;
 create schema private;
 create function auth.uid() returns uuid language sql stable as $$ select current_setting('test.user')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('test.aal')) $$;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz);
 create table public.profiles(id uuid primary key,account_type text,full_name text,preferred_name text);
 create table public.clinical_patients(id uuid primary key,demographics jsonb,directory_deleted_at timestamptz);
 alter table public.profiles enable row level security;
 grant select on public.profiles to authenticated;
 grant usage on schema private,auth to authenticated;
 create policy own_profile on public.profiles for select to authenticated using (id=auth.uid());
`);
for (const [user, role] of [[admin,'admin'],[therapist,'staff'],[otherStaff,'staff'],[patientAccount,'patient']]) {
 await db.query('insert into auth.users values($1,now(),null)', [user]);
 await db.query('insert into public.profiles values($1,$2,$3,null)', [user, role, 'Fictional ' + user.slice(-2)]);
}
for (const patient of [chart, otherChart]) {
 await db.query("insert into public.clinical_patients values($1,'{}',null)", [patient]);
}
await db.exec(migration);
await db.exec(readFileSync(new URL('../supabase/migrations/20261113181247_expand_modality_cpt.sql', import.meta.url), 'utf8'));

async function signIn(user, assurance = 'aal2') {
 await db.exec('reset role');
 await db.query("select set_config('test.user',$1,false),set_config('test.aal',$2,false)", [user, assurance]);
 await db.exec('set role authenticated');
}
const sessions = JSON.stringify([
 { code:'90837', count:12, frequency:'weekly', providerId:therapist },
 { code:'90853', count:6, frequency:'every_two_weeks', providerId:admin },
]);
const read = () => db.query('select * from public.emr_treatment_modalities order by patient_id');


await db.exec(readFileSync(new URL('../supabase/migrations/20261116165714_treatment_plan_responses.sql', import.meta.url), 'utf8'));
await signIn(admin);
await db.query('insert into emr_modality_providers values($1)',[therapist]);
await db.query('insert into emr_treatment_modalities(patient_id,assigned_provider_id) values($1,$2)',[chart,therapist]);
await db.query('insert into emr_treatment_modalities(patient_id,assigned_provider_id) values($1,$2)',[otherChart,admin]);

await db.exec('reset role');
const otherAdmin=id(7);
await db.query('insert into auth.users values($1,now(),null)',[otherAdmin]);
await db.query("insert into profiles values($1,'admin','Fictional Other Admin',null)",[otherAdmin]);
await db.query("update clinical_patients set demographics=$1 where id=$2",[JSON.stringify({first_name:'Fictional',last_name:'Chart Patient',ssn:'PRIVATE ID',address:'PRIVATE ADDRESS'}),chart]);
await db.exec(`
 create table emr_treatment_plans(id uuid primary key,patient_id uuid,owner_id uuid,created_at timestamptz);
 create table emr_treatment_plan_versions(id uuid primary key,plan_id uuid,revision integer,actor_id uuid,created_at timestamptz,snapshot jsonb);
 alter table emr_treatment_plans enable row level security;
 alter table emr_treatment_plan_versions enable row level security;
 grant select on emr_treatment_plans,emr_treatment_plan_versions to authenticated;
 create policy own_plans on emr_treatment_plans for select to authenticated using(owner_id=auth.uid());
 create policy own_versions on emr_treatment_plan_versions for select to authenticated using(actor_id=auth.uid());
`);
for(const [plan,pid,owner,date] of [[id(10),chart,admin,'2026-10-01'],[id(20),chart,admin,'2026-11-01'],[id(30),chart,otherAdmin,'2026-11-02'],[id(40),otherChart,admin,'2026-11-03']]){
 await db.query('insert into emr_treatment_plans values($1,$2,$3,$4)',[plan,pid,owner,date+'T00:00:00Z']);
 await db.query('insert into emr_treatment_plan_versions values($1,$2,1,$3,$4,$5)',[id(Number(plan.slice(-2))+1),plan,owner,date+'T00:00:00Z',JSON.stringify({title:'Fictional plan '+plan.slice(-2),status:'finalized',problems:[{text:'PRIVATE CLINICAL CONTENT'}]})]);
}
await db.query('insert into emr_treatment_plan_versions values($1,$2,2,$3,$4,$5)',[id(12),id(10),admin,'2026-11-15T00:00:00Z',JSON.stringify({title:'Fictional revised plan',status:'draft',notes:'PRIVATE NARRATIVE'})]);
await db.exec(readFileSync(new URL('../supabase/migrations/20261117152540_treatment_response_chart_context.sql',import.meta.url),'utf8'));
await db.exec('alter table clinical_patients add column account_id uuid;create table emr_workspaces(patient_id uuid,owner_id uuid,state jsonb)');
await db.exec(readFileSync(new URL('../supabase/migrations/20261117161211_response_active_patient_name.sql',import.meta.url),'utf8'));
const context=async(pid=chart)=>(await db.query('select emr_treatment_response_context($1) value',[pid])).rows[0].value;
await test('chart identity and dated choices retain first documentation date and exact own patient versions only',async()=>{
 await signIn(admin);const result=await context();
 assert.equal(result.patientId,chart);assert.equal(result.patientName,'Fictional Chart Patient');assert.equal(result.plans.length,3);
 assert.equal(result.plans[0].id,id(21));const revised=result.plans.find(p=>p.id===id(12));assert.equal(revised.revision,2);
 assert.equal(Date.parse(revised.firstRecordedAt),Date.parse('2026-10-01T00:00:00Z'));
 assert.equal(Date.parse(revised.recordedAt),Date.parse('2026-11-15T00:00:00Z'));
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE|000000000031|000000000041/);
 assert.deepEqual(Object.keys(result.plans[0]).sort(),['id','planId','revision','firstRecordedAt','recordedAt','title','status'].sort());
 await signIn(otherAdmin);assert.equal((await context()).plans.length,1);assert.equal((await context()).plans[0].id,id(31));
});
await test('active chart name falls back to the linked account and latest own workspace demographics',async()=>{
 await db.exec('reset role');
 await db.query('update profiles set full_name=$1 where id=$2',['Fictional Linked Patient',patientAccount]);
 await db.query('update clinical_patients set demographics=$1,account_id=$2 where id=$3',[{},patientAccount,chart]);
 await signIn(admin);assert.equal((await context()).patientName,'Fictional Linked Patient');
 await db.exec('reset role');await db.query('update clinical_patients set demographics=$1 where id=$2',[{first_name:'Chart'},chart]);
 await signIn(admin);assert.equal((await context()).patientName,'Chart Linked Patient');
 await db.exec('reset role');
 const state=(first,last)=>({records:[{kind:'demographics',body:JSON.stringify({schema:'demographics/2',first_name:first,last_name:last})}]});
 await db.query('insert into emr_workspaces values($1,$2,$3)',[chart,admin,state('Workspace','Active Patient')]);
 await db.query('insert into emr_workspaces values($1,$2,$3)',[chart,otherAdmin,state('Other','Author Must Not Be Used')]);
 await db.query('update clinical_patients set demographics=$1 where id=$2',[{last_name:'Central'},chart]);
 await signIn(admin);assert.equal((await context()).patientName,'Workspace Central');
 await db.exec('reset role');await db.query('update clinical_patients set demographics=$1 where id=$2',[{first_name:'Chart',last_name:'Current'},chart]);
 await signIn(admin);assert.equal((await context()).patientName,'Chart Current');
 await db.exec('reset role');await db.query('update clinical_patients set demographics=$1 where id=$2',[{first_name:'',last_name:''},chart]);
 await signIn(admin);assert.equal((await context()).patientName,'Fictional Linked Patient');
 await db.exec('reset role');await db.query('delete from emr_workspaces where patient_id=$1',[chart]);
 await db.query('update clinical_patients set demographics=$1,account_id=null where id=$2',[{first_name:'Fictional',last_name:'Chart Patient'},chart]);
});
await test('assigned staff receive only chart identity, with no expansion of plan visibility',async()=>{
 await signIn(therapist);const result=await context();assert.equal(result.patientName,'Fictional Chart Patient');assert.deepEqual(result.plans,[]);
 await assert.rejects(context(otherChart),/Patient unavailable/);
});
await test('other staff, patient accounts, missing MFA and anonymous sessions cannot retrieve context',async()=>{
 for(const [user,aal] of [[otherStaff,'aal2'],[patientAccount,'aal2'],[admin,'aal1'],[therapist,'aal1']]){
  await signIn(user,aal);await assert.rejects(context(),/Patient unavailable/);
 }
 await db.exec('reset role;set role anon');await assert.rejects(context(),/permission denied/);
});
await test('unverified or unenrolled providers and archived charts are denied independently of API checks',async()=>{
 await db.exec('reset role');await db.query('update auth.users set email_confirmed_at=null where id=$1',[therapist]);
 await signIn(therapist);await assert.rejects(context(),/Patient unavailable/);
 await db.exec('reset role');await db.query('update auth.users set email_confirmed_at=now() where id=$1',[therapist]);await db.query('delete from emr_modality_providers where provider_id=$1',[therapist]);
 await signIn(therapist);await assert.rejects(context(),/Patient unavailable/);
 await db.exec('reset role');await db.query("update clinical_patients set demographics=demographics||$2::jsonb where id=$1",[chart,JSON.stringify({active:false})]);
 await signIn(admin);await assert.rejects(context(),/Patient unavailable/);
});
await db.close();
