import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
const db=new PGlite();
const admin='00000000-0000-0000-0000-000000000101';
const otherAdmin='00000000-0000-0000-0000-000000000102';
const patient='00000000-0000-0000-0000-000000000103';
await db.exec("create role anon;create role authenticated;create schema auth;create schema private;"+
 "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.user',true),'')::uuid $$;"+
 "create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('request.aal',true)) $$;"+
 "create table auth.users(id uuid primary key);"+
 "create table public.profiles(id uuid primary key references auth.users(id),account_type text not null);"+
 "grant usage on schema public,auth,private to authenticated,anon;"+
 "grant select on public.profiles to authenticated;");
for(const [id,role] of [[admin,'admin'],[otherAdmin,'admin'],[patient,'patient']]){
 await db.query('insert into auth.users(id) values($1)',[id]);
 await db.query('insert into public.profiles(id,account_type) values($1,$2)',[id,role]);
}
const migration=readFileSync(new URL('../supabase/migrations/20261013090000_asq_qa_persistence.sql',import.meta.url),'utf8');
assert.equal(/(?:alter|drop|update|delete|truncate)\s+table\s+(?:public\.)?patient_intakes\b/i.test(migration),false);
await db.exec(migration);
async function as(id,aal='aal2'){
 await db.exec('reset role');
 await db.query("select set_config('request.user',$1,false),set_config('request.aal',$2,false)",[id,aal]);
 await db.exec('set role authenticated');
}
async function q(sql,args=[]){return db.query(sql,args);}
let caseId;
await test('verified admin can create persistent synthetic ASQ record',async()=>{
 await as(admin);
 const created=await q('insert into asq_cases(label) values($1) returning id,revision',['Synthetic Student A']);
 caseId=created.rows[0].id;
 assert.equal(created.rows[0].revision,1);
 assert.equal((await q('select id from asq_cases')).rows.length,1);
});
await test('all 179 answers and supporting records persist',async()=>{
 await as(admin);
 const answers=Object.fromEntries(Array.from({length:179},(_,i)=>['S'+String(i+1).padStart(3,'0'),i%5]));
 await q('insert into asq_documents(case_id,document_kind,responses,scores,narrative) values($1,$2,$3,$4,$5)',[caseId,'student',answers,{domain:'synthetic'},'Demo narrative']);
 await q('insert into asq_documents(case_id,document_kind,responses) values($1,$2,$3)',[caseId,'support_incidents',{children:[{incidents:[{id:'QA-1'}]}]}]);
 await q('insert into asq_snapshots(case_id,payload) values($1,$2)',[caseId,{asq_self_responses_v1:JSON.stringify(answers)}]);
 const doc=await q("select responses->>'S179' last_answer,narrative from asq_documents where case_id=$1 and document_kind='student'",[caseId]);
 assert.equal(doc.rows[0].last_answer,String(178%5));
 assert.equal(doc.rows[0].narrative,'Demo narrative');
 const snapshot=await q("select payload->>'asq_self_responses_v1' as json from asq_snapshots where case_id=$1",[caseId]);
 assert.equal(Object.keys(JSON.parse(snapshot.rows[0].json)).length,179);
});
await test('snapshot revision increments and non-PHI audit metadata is logged',async()=>{
 await as(admin);
 const updated=await q('update asq_snapshots set payload=$2 where case_id=$1 and revision=1 returning revision',[caseId,{asq_self_responses_v1:'{"S001":1}'}]);
 assert.equal(updated.rows[0].revision,2);
 const events=await q('select entity,action from asq_audit_events where case_id=$1 order by id',[caseId]);
 assert.ok(events.rows.length>=4);
 assert.equal(events.rows.some(r=>r.entity==='snapshot'&&r.action==='UPDATE'),true);
});
await test('patient and AAL1 users cannot read or create records; admins isolated',async()=>{
 await as(patient);
 assert.equal((await q('select * from asq_cases')).rows.length,0);
 await assert.rejects(q("insert into asq_cases(label) values('Unauthorized')"),/row.level security/i);
 await as(admin,'aal1');
 assert.equal((await q('select * from asq_cases')).rows.length,0);
 await as(otherAdmin);
 assert.equal((await q('select * from asq_cases')).rows.length,0);
});
await test('anonymous database clients cannot read ASQ cases',async()=>{
 await db.exec('reset role; set role anon');
 await assert.rejects(q('select * from asq_cases'),/permission denied/i);
});
await db.close();
