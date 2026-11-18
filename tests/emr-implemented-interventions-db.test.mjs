import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
const db=new PGlite(),id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');const [admin,other,patient,second]=[101,102,103,104].map(id);
await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.user',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.aal',true))$$;
create table auth.users(id uuid primary key);create table public.profiles(id uuid primary key,account_type text,full_name text);
create table public.clinical_patients(id uuid primary key,demographics jsonb,directory_deleted_at timestamptz);
create function private.current_user_is_admin() returns boolean language sql security definer stable set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and account_type='admin')$$;
create function private.patient_secure_session() returns boolean language sql stable as $$select auth.uid() is not null and auth.jwt()->>'aal'='aal2'$$;
grant usage on schema auth,private,public to authenticated,anon;grant select on profiles,clinical_patients to authenticated;`);
for(const [who,role] of [[admin,'admin'],[other,'admin'],[patient,'patient']]){await db.query('insert into auth.users values($1)',[who]);await db.query('insert into profiles values($1,$2,$3)',[who,role,'Fictional Clinician']);}
for(const who of [patient,second])await db.query('insert into clinical_patients(id,demographics) values($1,$2)',[who,{first_name:'Fictional',last_name:'Implemented Test',dob:'1990-01-01'}]);
for(const file of ['20261104194959_treatment_planner_library.sql','20261113092344_treatment_planner_problem_level.sql','20261118070331_implemented_intervention_library_and_entries.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
async function as(who,aal='aal2'){await db.exec('reset role');await db.query("select set_config('request.user',$1,false),set_config('request.aal',$2,false)",[who,aal]);await db.exec('set role authenticated');}
await as(admin);const nodes=(await db.query('select nodes from emr_treatment_library_versions where revision=2')).rows[0].nodes;
const roots=nodes.filter(n=>n.kind==='problem').slice(0,2);
const planned=roots.map(root=>{const objective=nodes.find(n=>n.parent===root.id&&n.kind==='objective');return nodes.find(n=>n.parent===objective.id&&n.kind==='intervention');});
const additions=planned.map((n,i)=>({id:'fictional-implemented-'+i,kind:'implemented_intervention',parent:n.id,text:'Fictional implemented intervention '+i,active:true}));
let version,entry,lib=3;
function selection(root,i){const children=nodes.filter(n=>n.parent===root.id);return {id:root.id,primary:i===0,children:[{id:children.find(n=>n.kind==='definition').id},{id:children.find(n=>n.kind==='goal').id,agreed:true},{id:planned[i].parent,children:[{id:planned[i].id}]}]};}
const insert=(selections=[{problemId:roots[0].id,implementedId:additions[0].id}],revision=lib,plan=version,who=patient)=>db.query('insert into emr_implemented_intervention_entries(id,patient_id,plan_version_id,library_revision,session_date,selection_ids) values($1,$2,$3,$4,$5,$6) returning *',[crypto.randomUUID(),who,plan,revision,'2026-01-01',JSON.stringify(selections)]);
await test('library accepts the sixth implemented level only under a planned intervention; patient plans remain planned-only',async()=>{
 await db.query('select save_emr_treatment_library(2,$1)',[[...nodes,...additions]]);
 await assert.rejects(db.query('select save_emr_treatment_library(3,$1)',[[...nodes,...additions,{...additions[0],id:'bad',parent:roots[0].id}]]),/parent relationship/);
 const plan=(await db.query('select save_emr_treatment_plan(null,$1,0,3,$2) result',[patient,{title:'Fictional linked plan',notes:'Fictional only',status:'finalized',reviewed:true,review_date:'2026-01-01',problems:roots.map(selection)}])).rows[0].result;
 version=(await db.query('select id from emr_treatment_plan_versions where plan_id=$1',[plan.id])).rows[0].id;
 assert.equal(JSON.stringify(plan.snapshot).includes('implemented_intervention'),false);
});
await test('two problem-specific selections persist with immutable server-derived wording and exact parent context',async()=>{
 const selections=roots.map((root,i)=>({problemId:root.id,implementedId:additions[i].id}));entry=(await insert(selections)).rows[0];
 assert.equal(entry.owner_id,admin);assert.equal(entry.snapshot.selections.length,2);assert.equal(entry.snapshot.selections[0].text,additions[0].text);assert.equal(entry.snapshot.selections[0].plannedId,planned[0].id);assert.equal(entry.snapshot.selections[1].problemId,roots[1].id);
 assert.deepEqual((await db.query('select snapshot from emr_implemented_intervention_entries where id=$1',[entry.id])).rows[0].snapshot,entry.snapshot);
 await assert.rejects(db.query("update emr_implemented_intervention_entries set snapshot='{}'"),/permission denied/);await assert.rejects(db.query('delete from emr_implemented_intervention_entries'),/permission denied/);
});
await test('rejects cross-problem, cross-patient, duplicate and stale-library selections',async()=>{
 await assert.rejects(insert([{problemId:roots[1].id,implementedId:additions[0].id}]),/not linked/);
 await assert.rejects(insert(undefined,lib,version,second),/plan unavailable/);
 await assert.rejects(insert([{problemId:roots[0].id,implementedId:additions[0].id},{problemId:roots[0].id,implementedId:additions[0].id}]),/Duplicate/);
 await assert.rejects(insert(undefined,2),/Library changed/);
 const next=[...nodes,...additions.map((n,i)=>({...n,active:i!==0,text:'Edited future wording'}))];await db.query('select save_emr_treatment_library(3,$1)',[next]);lib=4;
 await assert.rejects(insert(),/active implemented/);assert.equal((await db.query('select snapshot from emr_implemented_intervention_entries where id=$1',[entry.id])).rows[0].snapshot.selections[0].text,additions[0].text);
});
await test('another clinician, patient, low-MFA session and anonymous caller cannot read or append to another account record',async()=>{
 for(const [who,aal] of [[other,'aal2'],[patient,'aal2'],[admin,'aal1']]){await as(who,aal);assert.equal((await db.query('select * from emr_implemented_intervention_entries')).rows.length,0);await assert.rejects(insert([{problemId:roots[1].id,implementedId:additions[1].id}]),/required|unavailable|permission denied|row-level security/);}
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from emr_implemented_intervention_entries'),/permission denied/);
});
await db.close();
