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
const doc={type:'doc',content:[{type:'paragraph',attrs:{indent:2,textAlign:'justify'},content:[{type:'text',text:'Fictional original statement',marks:[{type:'strike'},{type:'bold'},{type:'textStyle',attrs:{fontFamily:'Georgia',fontSize:'14pt'}}]}]}]};
const response={schema:'treatment-response/1',planReference:'Fictional plan version 1',participants:[{id:id(10),role:'patient',name:'',approval:'yes'},{id:id(11),role:'guardian',name:'Fictional Guardian',approval:'no'}],narratives:{patient:doc,significantOther:{type:'doc',content:[{type:'paragraph'}]},family:doc}};
const save=(value)=>db.query('update emr_treatment_modalities set treatment_response=$1,revision=revision+1 where patient_id=$2 returning revision',[JSON.stringify(value),chart]);
await test('assigned clinician saves formatted response, mixed approvals and attributed immutable history',async()=>{
 await signIn(therapist);
 const first=await save(response);assert.equal(first.rows[0].revision,2);
 const next=structuredClone(response);next.participants[1].approval='yes';next.narratives.patient.content[0].content[0].text='Fictional amended wording';
 await save(next);
 const history=await db.query('select response,recorded_by from emr_treatment_response_versions order by revision');
 assert.equal(history.rows.length,2);assert.deepEqual(history.rows[0].response,response);assert.equal(history.rows[0].recorded_by,therapist);
 assert.equal(history.rows[0].response.narratives.patient.content[0].content[0].marks[0].type,'strike');
 await assert.rejects(db.query('update emr_treatment_response_versions set response=$1',[JSON.stringify(next)]),/permission denied/);
 await assert.rejects(db.query('delete from emr_treatment_response_versions'),/permission denied/);
 await assert.rejects(db.query('insert into emr_treatment_response_versions(patient_id,revision,response,recorded_by) values($1,99,$2,$3)',[chart,JSON.stringify(next),therapist]),/permission denied/);
 await assert.rejects(db.query('update emr_treatment_modalities set treatment_response=null,revision=revision+1 where patient_id=$1',[chart]),/blank response revision/);
});
await test('database enforces valid participants and a safe bounded rich-text schema',async()=>{
 for(const mutate of [r=>r.participants[0].approval='both',r=>r.participants[1].name='',r=>r.participants.push({...r.participants[0]}),r=>r.narratives.patient={type:'doc',content:[{type:'script'}]},r=>r.narratives.patient.content[0].content[0].marks=[{type:'link',attrs:{href:'javascript:alert(1)'}}],r=>r.narratives.patient.content[0].content[0].text='x'.repeat(20001)]){
  const invalid=structuredClone(response);mutate(invalid);await assert.rejects(save(invalid),/approval|participant|identified patient|formatting|too long/);
 }
 await assert.rejects(db.query('update emr_treatment_modalities set revision=revision,treatment_response=$1 where patient_id=$2',[JSON.stringify(response),chart]),/revision conflict/);
});
await test('unassigned staff, patient accounts and sessions without MFA cannot see or save responses or history',async()=>{
 for(const [user,aal] of [[otherStaff,'aal2'],[patientAccount,'aal2'],[therapist,'aal1']]){
  await signIn(user,aal);
  assert.equal((await db.query('select * from emr_treatment_response_versions')).rows.length,0);
  assert.equal((await save(response)).rows.length,0);
 }
 await signIn(admin);
 await db.query('update emr_treatment_modalities set assigned_provider_id=$1,revision=revision+1 where patient_id=$2',[admin,chart]);
 await signIn(therapist);assert.equal((await db.query('select * from emr_treatment_response_versions')).rows.length,0);
});
await db.close();
