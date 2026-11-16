import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
const db=new PGlite(),admin='00000000-0000-0000-0000-000000000101',other='00000000-0000-0000-0000-000000000102',patient='00000000-0000-0000-0000-000000000103';
await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.user',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.aal',true))$$;
create table auth.users(id uuid primary key);create table public.profiles(id uuid primary key,account_type text,full_name text);
create table public.clinical_patients(id uuid primary key,demographics jsonb);
create function private.current_user_is_admin() returns boolean language sql security definer stable set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and account_type='admin')$$;
create function private.patient_secure_session() returns boolean language sql stable as $$select auth.uid() is not null and auth.jwt()->>'aal'='aal2'$$;
grant usage on schema auth,private,public to authenticated,anon;grant select on profiles,clinical_patients to authenticated;`);
for(const [id,role] of [[admin,'admin'],[other,'admin'],[patient,'patient']]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into profiles values($1,$2,$3)',[id,role,'Fictional Clinician']);}
await db.query('insert into clinical_patients values($1,$2)',[patient,{first_name:'Fictional',last_name:'Planner Verification',dob:'1990-01-02'}]);
await db.exec(readFileSync('supabase/migrations/20261104194959_treatment_planner_library.sql','utf8'));
const seed=JSON.parse(readFileSync('lib/emr/treatment-planner-seed.json','utf8'));const q=(s,a=[])=>db.query(s,a);
async function as(id,aal='aal2'){await db.exec('reset role');await q("select set_config('request.user',$1,false),set_config('request.aal',$2,false)",[id,aal]);await db.exec('set role authenticated');}
await db.exec(readFileSync('supabase/migrations/20261113092344_treatment_planner_problem_level.sql','utf8'));
let migrated;
const input=()=>({title:'Fictional treatment plan',notes:'Artificial workflow check',status:'finalized',reviewed:true,review_date:'2026-12-01',problems:[branch(migrated[0])]});
function branch(problem){
 const children=migrated.filter(n=>n.parent===problem.id);
 const choice=n=>({id:n.id,agreed:true,children:[]});
 const objective=children.find(n=>n.kind==='objective');
 return {id:problem.id,primary:true,children:[
  ...children.filter(n=>n.kind==='definition').map(choice),
  choice(children.find(n=>n.kind==='goal')),
  {...choice(objective),children:[choice(migrated.find(n=>n.parent===objective.id))]},
 ]};
}
const save=(id,expected,value=input(),lib=2)=>q('select save_emr_treatment_plan($1,$2,$3,$4,$5) result',[id,patient,expected,lib,value]);let plan;

await db.exec('alter table public.clinical_patients add column directory_deleted_at timestamptz');
const responseMigration=readFileSync('supabase/migrations/20261116165714_treatment_plan_responses.sql','utf8');
await db.exec(responseMigration.slice(responseMigration.indexOf('create function private.valid_response_richtext'),responseMigration.indexOf('create function private.guard_emr_treatment_response')));
await db.exec('grant execute on function private.valid_response_richtext(jsonb,integer) to authenticated');
await db.exec(readFileSync('supabase/migrations/20261116193218_patient_homework_assignments.sql','utf8'));
await as(admin);migrated=(await q('select nodes from emr_treatment_library_versions where revision=2')).rows[0].nodes;
const value=input();value.problems=migrated.filter(n=>n.kind==='problem').slice(0,2).map(branch);value.problems[1].primary=false;
plan=(await save(null,0,value)).rows[0].result;
const version=(await q('select id from emr_treatment_plan_versions where plan_id=$1',[plan.id])).rows[0].id;
const [p1,p2]=plan.snapshot.problems;
const o1=p1.children.find(n=>n.kind==='objective'),o2=p2.children.find(n=>n.kind==='objective');
const narrative={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Fictional home practice',marks:[{type:'bold'}]}]}]};
let counter=200;const newId=()=> '00000000-0000-4000-8000-'+String(counter++).padStart(12,'0');
const insert=(overrides={})=>{const b={id:newId(),patient_id:patient,plan_version_id:version,problem_id:p1.id,objective_id:o1.id,intervention_id:o1.children[0].id,narrative,...overrides};return q('insert into emr_homework_assignments(id,patient_id,plan_version_id,problem_id,objective_id,intervention_id,narrative) values($1,$2,$3,$4,$5,$6,$7) returning *',[b.id,b.patient_id,b.plan_version_id,b.problem_id,b.objective_id,b.intervention_id,JSON.stringify(b.narrative)]);};
let saved;
await test('homework snapshot binds canonical patient plan wording and rich narrative without client-supplied labels',async()=>{
 await as(admin);saved=(await insert()).rows[0];
 assert.deepEqual(saved.snapshot.problem,{id:p1.id,text:p1.text});assert.deepEqual(saved.snapshot.objective,{id:o1.id,text:o1.text});assert.deepEqual(saved.snapshot.intervention,{id:o1.children[0].id,text:o1.children[0].text});assert.deepEqual(saved.snapshot.assignment,narrative);
 assert.equal(saved.snapshot.patient_name,'Fictional Planner Verification');
});
await test('cross-problem objectives, cross-objective interventions, wrong patient and unsafe or blank text are rejected',async()=>{
 await assert.rejects(insert({objective_id:o2.id}),/linked to the selected problem/);
 await assert.rejects(insert({intervention_id:o2.children[0].id}),/linked to the selected objective/);
 await assert.rejects(insert({patient_id:other}),/saved treatment plan/);
 await assert.rejects(insert({narrative:{type:'doc',content:[{type:'paragraph'}]}}),/Enter a homework assignment/);
 await assert.rejects(insert({narrative:{type:'doc',content:[{type:'script'}]}}),/formatting/);
 await assert.rejects(q('insert into emr_homework_assignments(id,patient_id,plan_version_id,problem_id,objective_id,intervention_id,narrative,snapshot) values($1,$2,$3,$4,$5,$6,$7,$8)',[newId(),patient,version,p1.id,o1.id,o1.children[0].id,JSON.stringify(narrative),'{}']),/permission denied/);
});
await test('later plan edits do not rewrite saved homework and assignments cannot be overwritten or deleted',async()=>{
 const changed=structuredClone(value);changed.problems[0].text='Changed fictional problem wording';await save(plan.id,1,changed);
 const earlier=(await q('select snapshot from emr_homework_assignments where id=$1',[saved.id])).rows[0].snapshot;
 assert.equal(earlier.problem.text,p1.text);
 await assert.rejects(q('update emr_homework_assignments set narrative=$1',[JSON.stringify(narrative)]),/permission denied/);
 await assert.rejects(q('delete from emr_homework_assignments'),/permission denied/);
});
await test('plan ownership, patient roles and missing MFA cannot read or add another clinician homework',async()=>{
 for(const [who,aal] of [[other,'aal2'],[patient,'aal2'],[admin,'aal1']]){await as(who,aal);assert.equal((await q('select * from emr_homework_assignments')).rows.length,0);await assert.rejects(insert(),/saved treatment plan|sign-in|row-level security/);}
 await db.exec('reset role;set role anon');await assert.rejects(q('select * from emr_homework_assignments'),/permission denied/);
});
await db.close();
