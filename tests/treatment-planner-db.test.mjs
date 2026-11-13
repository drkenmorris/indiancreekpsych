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
await db.exec(readFileSync('supabase/migrations/20261113091827_treatment_planner_problem_level.sql','utf8'));
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
await test('migration keeps all IDs and objective-to-intervention links in a new library revision',async()=>{
 await as(admin);
 migrated=(await q('select nodes from emr_treatment_library_versions where revision=2')).rows[0].nodes;
 assert.deepEqual(migrated.map(n=>n.id),seed.map(n=>n.id));
 assert.deepEqual(migrated.filter(n=>n.kind==='intervention'),seed.filter(n=>n.kind==='intervention'));
 assert.equal(migrated.filter(n=>n.kind==='goal'&&n.parent===seed[0].id).length,4);
 assert.equal(migrated.filter(n=>n.kind==='objective'&&n.parent===seed[0].id).length,4);
});
await test('seed preserves a complete linked library with 24 problem areas',async()=>{await as(admin);const r=(await q('select * from emr_treatment_library_versions where revision=1')).rows[0];assert.equal(r.nodes.filter(n=>n.kind==='problem').length,24);assert.equal(r.nodes.length,456);});
await test('final plan saves source-linked wording, primary and agreement, and patient identity',async()=>{await as(admin);const value=input();value.problems[0].children[2].text='Individualized fictional goal wording';plan=(await save(null,0,value)).rows[0].result;assert.equal(plan.revision,1);assert.equal(plan.snapshot.patient_name,'Fictional Planner Verification');assert.equal(plan.snapshot.problems[0].children.length,4);const goal=plan.snapshot.problems[0].children[2];assert.equal(goal.text,'Individualized fictional goal wording');assert.notEqual(goal.source_text,goal.text);});
await test('five problems and two definitions are enforced at the database boundary',async()=>{await as(admin);const value=input();value.problems=seed.filter(n=>n.kind==='problem').slice(0,6).map(n=>branch(n));await assert.rejects(save(null,0,value),/one and five/);const p=input();const expanded=[...migrated,{id:'extra-definition',kind:'definition',parent:migrated[0].id,text:'Extra definition',active:true}];
p.problems[0].children.push({id:'extra-definition'});
await assert.rejects(q('select private.resolve_planner_node($1,$2,null,$3,true)',[p.problems[0],'problem',expanded]),/two definitions/);});
await test('wrong-parent choices, incomplete branches, and missing goal agreement cannot finalize',async()=>{await as(admin);const wrong=input();wrong.problems[0].children[2].id='original-p02-d1-g1';await assert.rejects(save(null,0,wrong),/active library parent/);const incomplete=input();incomplete.problems[0].children=[];await assert.rejects(save(null,0,incomplete),/requires a definition, goal, and objective/);const intervention=input();intervention.problems[0].children[3].children=[{id:'original-p02-d1-g1-o1-i1'}];await assert.rejects(save(null,0,intervention),/active library parent/);const agreement=input();agreement.problems[0].children[2].agreed=false;await assert.rejects(save(null,0,agreement),/patient agreement/);const primary=input();primary.problems[0].primary=false;await assert.rejects(save(null,0,primary),/one primary/);});
await test('drafts can be incomplete, stale saves are rejected, and history is append-only',async()=>{await as(admin);const draft=input();draft.status='draft';draft.problems[0].children=[];const saved=(await save(plan.id,1,draft)).rows[0].result;assert.equal(saved.revision,2);await assert.rejects(save(plan.id,1,draft),/another session/);await assert.rejects(save(plan.id,null,draft),/another session/);assert.equal((await q('select count(*)::int n from emr_treatment_plan_versions where plan_id=$1',[plan.id])).rows[0].n,2);await assert.rejects(q('delete from emr_treatment_plan_versions'),/permission denied/);await assert.rejects(q("update emr_treatment_plan_versions set snapshot='{}'"),/permission denied/);});
await test('library updates are versioned, retain IDs and parent links, and do not rewrite patient plans',async()=>{await as(admin);const next=structuredClone(migrated);next[0].text='Edited shared problem label';assert.equal((await q('select save_emr_treatment_library(2,$1) n',[next])).rows[0].n,3);await assert.rejects(q('select save_emr_treatment_library(2,$1)',[next]),/another session/);await assert.rejects(save(plan.id,2,input(),1),/Library changed/);assert.notEqual((await q('select snapshot from emr_treatment_plan_versions where plan_id=$1 and revision=1',[plan.id])).rows[0].snapshot.problems[0].text,next[0].text);const removed=next.slice(1);await assert.rejects(q('select save_emr_treatment_library(3,$1)',[removed]),/parent relationship|Retain existing/);});
await test('inactive choices reject new plan selections while original history remains readable',async()=>{await as(admin);const next=structuredClone(migrated);next[0].active=false;await q('select save_emr_treatment_library(3,$1)',[next]);await assert.rejects(save(plan.id,2,input(),4),/active library parent/);assert.equal((await q('select count(*)::int n from emr_treatment_plan_versions where plan_id=$1',[plan.id])).rows[0].n,2);});
await test('plan ownership, MFA, and patient-account restrictions are enforced independently of the UI',async()=>{await as(other);assert.equal((await q('select * from emr_treatment_plans')).rows.length,0);assert.equal((await q('select * from emr_treatment_plan_versions')).rows.length,0);assert.equal((await q('select * from emr_treatment_library_versions')).rows.length,4);await assert.rejects(save(plan.id,2,input(),4),/active library parent|Plan unavailable/);for(const [who,aal] of [[patient,'aal2'],[admin,'aal1']]){await as(who,aal);assert.equal((await q('select * from emr_treatment_library_versions')).rows.length,0);await assert.rejects(save(null,0,input(),3),/Library unavailable/);}await db.exec('reset role;set role anon');await assert.rejects(q('select * from emr_treatment_plan_versions'),/permission denied/);});
await db.close();
