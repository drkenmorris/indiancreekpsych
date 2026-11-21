import {afterEach,expect,test,vi} from 'vitest';
const auth=vi.hoisted(()=>({value:null as null|{user:{id:string};supabase:any}}));
vi.mock('@/lib/emr/access',()=>({emrAccess:async()=>auth.value,sameOrigin:(r:Request)=>r.headers.get('origin')===new URL(r.url).origin,privateHeaders:{'Cache-Control':'private, no-store'}}));
import {GET,POST} from '@/app/api/emr/dsm-records/route';
import {TIER_ONE as D,HANDOFF_KEY,createHandoff,type Answers} from '@/lib/clinical-tests/dsm/tier-one';
const record='00000000-0000-0000-0000-000000000001',patient='00000000-0000-0000-0000-000000000002',owner='00000000-0000-0000-0000-000000000003';
const request=(body:unknown,origin='https://clinic.test')=>new Request('https://clinic.test/api/emr/dsm-records',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
function table(data:unknown){const q:any={select:vi.fn(()=>q),eq:vi.fn(()=>q),order:vi.fn(()=>q),limit:vi.fn(()=>q),insert:vi.fn(()=>q),single:async()=>({data,error:null}),maybeSingle:async()=>({data,error:null}),then:(resolve:(r:unknown)=>void)=>resolve({data,error:null})};return q;}
afterEach(()=>{auth.value=null;vi.restoreAllMocks();});
test('no signed-in MFA-authorized context or cross-origin callers cannot reach patient-record operations',async()=>{expect((await GET(new Request('https://clinic.test/api/emr/dsm-records'))).status).toBe(403);expect((await POST(request({action:'create'}))).status).toBe(403);auth.value={user:{id:owner},supabase:{from:vi.fn(),rpc:vi.fn()}};expect((await POST(request({action:'save'},'https://other.test'))).status).toBe(403);expect(auth.value.supabase.rpc).not.toHaveBeenCalled();});
test('create verifies clinician and central chart receipt without exposing owner identity',async()=>{
 const q=table({id:record,patient_id:patient,owner_id:owner,label:'Fictional record',revision:0}),from=vi.fn(()=>q);
 auth.value={user:{id:owner},supabase:{from}};
 const response=await POST(request({action:'create',patientId:patient,label:'Fictional record',owner_id:'forged'}));
 expect(response.status).toBe(201);
 expect(q.insert).toHaveBeenCalledWith({patient_id:patient,label:'Fictional record'});
 expect(q.select).toHaveBeenCalledWith('id,patient_id,owner_id,label,revision');
 const body=await response.json();
 expect(body.record.id).toBe(record);
 expect(body.record.patient_id).toBe(patient);
 expect(body.record.owner_id).toBeUndefined();
});
test.each([
 ['cross-chart return', {patient_id:'00000000-0000-0000-0000-000000000004'}],
 ['different clinician return', {owner_id:'00000000-0000-0000-0000-000000000005'}],
 ['unverifiable record identity', {id:'not-a-uuid'}],
 ['different clinical label', {label:'Another patient assessment'}],
 ['noninitial revision', {revision:2}],
 ['missing owner receipt', {owner_id:undefined}],
])('create refuses %s even if the database insert query reports success',async(_name,changes)=>{
 const q=table({...{id:record,patient_id:patient,owner_id:owner,label:'Fictional record',revision:0},...changes});
 auth.value={user:{id:owner},supabase:{from:vi.fn(()=>q)}};
 const response=await POST(request({action:'create',patientId:patient,label:'Fictional record'}));
 expect(response.status).toBe(409);
 const body=await response.json();
 expect(body.record).toBeUndefined();
 expect(JSON.stringify(body)).not.toContain('Another patient assessment');
 expect(body.error).toContain('Check the existing record list');
});
test('save derives the patient from the authorized record and maps stale revisions to409',async()=>{const target=table({patient_id:patient}),person=table({demographics:{},account_id:null}),rpc=vi.fn(async(..._args:unknown[])=>({data:null,error:{code:'40001'}})),from=vi.fn().mockReturnValueOnce(target).mockReturnValueOnce(person);auth.value={user:{id:owner},supabase:{from,rpc}};const response=await POST(request({action:'save',id:record,patientId:'forged-patient',expectedRevision:1,state:{}}));expect(response.status).toBe(409);expect(target.eq).toHaveBeenCalledWith('owner_id',owner);expect(person.eq).toHaveBeenCalledWith('id',patient);expect((rpc.mock.calls[0][1] as Record<string,unknown>).p_expected_revision).toBe(1);expect((rpc.mock.calls[0][1] as Record<string,unknown>).p_report).toHaveProperty('status','Tier 1 in progress');});
test('a known child birthdate cannot receive an adult response report',async()=>{const target=table({patient_id:patient}),person=table({demographics:{dob:'2020-01-01'},account_id:null}),rpc=vi.fn(),from=vi.fn().mockReturnValueOnce(target).mockReturnValueOnce(person);auth.value={user:{id:owner},supabase:{from,rpc}};const answers:Answers=Object.fromEntries([...D.safety,...D.domains.flatMap(d=>d.questions)].map(q=>[q.id,'No']));const response=await POST(request({action:'save',id:record,expectedRevision:0,state:{[HANDOFF_KEY]:JSON.stringify(createHandoff(answers,true))}}));expect(response.status).toBe(409);expect(rpc).not.toHaveBeenCalled();});


/** Fictional adapter receipts only. Passing these tests is not clinical browser acceptance. */
test('DSM save receipt: only verified durable owner, patient, revision and content hash may announce success',async()=>{
 const hash=(await import('@/lib/emr/dsm-snapshot')).buildDsmSnapshot({}).contentHash;
 const from=vi.fn()
  .mockReturnValueOnce(table({patient_id:patient}))
  .mockReturnValueOnce(table({demographics:{},account_id:null}))
  .mockReturnValueOnce(table({id:record,patient_id:patient,owner_id:owner,revision:1}))
  .mockReturnValueOnce(table({record_id:record,owner_id:owner,revision:1,content_hash:hash}));
 const rpc=vi.fn(async()=>({data:1,error:null}));
 auth.value={user:{id:owner},supabase:{from,rpc}};
 const response=await POST(request({action:'save',id:record,expectedRevision:0,state:{}}));
 expect(response.status).toBe(200);
 const body=await response.json();
 expect(body.saved).toBe(true);
 expect(body.revision).toBe(1);
 expect(body.contentHash).toBe(hash);
 expect(from).toHaveBeenCalledTimes(4);
});

test.each([
 ['wrong patient', {patient_id:'00000000-0000-0000-0000-000000000004'},{}],
 ['wrong clinician', {owner_id:'00000000-0000-0000-0000-000000000005'},{}],
 ['wrong current revision', {revision:3},{}],
 ['wrong version record', {},{record_id:'00000000-0000-0000-0000-000000000004'}],
 ['wrong version owner', {},{owner_id:'00000000-0000-0000-0000-000000000005'}],
 ['wrong version hash', {},{content_hash:'incorrect'}],
 ['wrong version revision', {},{revision:2}],
] as const)('DSM save receipt: %s cannot claim committed verified clinical state',async(_description,recordChange,versionChange)=>{
 const hash=(await import('@/lib/emr/dsm-snapshot')).buildDsmSnapshot({}).contentHash;
 const from=vi.fn()
  .mockReturnValueOnce(table({patient_id:patient}))
  .mockReturnValueOnce(table({demographics:{},account_id:null}))
  .mockReturnValueOnce(table({...{id:record,patient_id:patient,owner_id:owner,revision:1},...recordChange}))
  .mockReturnValueOnce(table({...{record_id:record,owner_id:owner,revision:1,content_hash:hash},...versionChange}));
 auth.value={user:{id:owner},supabase:{from,rpc:vi.fn(async()=>({data:1,error:null}))}};
 const response=await POST(request({action:'save',id:record,expectedRevision:0,state:{}}));
 expect(response.status).toBe(503);
 const body=await response.json();
 expect(body.saved).toBeUndefined();
 expect(body.code).toBe('save_unconfirmed');
 expect(body.error).toMatch(/reopen the existing record/);
});

test('DSM save receipt: contradictory RPC revision cannot claim success or query chart history',async()=>{
 const from=vi.fn()
  .mockReturnValueOnce(table({patient_id:patient}))
  .mockReturnValueOnce(table({demographics:{},account_id:null}));
 auth.value={user:{id:owner},supabase:{from,rpc:vi.fn(async()=>({data:7,error:null}))}};
 const response=await POST(request({action:'save',id:record,expectedRevision:0,state:{}}));
 expect(response.status).toBe(503);
 expect((await response.json()).saved).toBeUndefined();
 expect(from).toHaveBeenCalledTimes(2);
});

test('DSM save receipt: network loss after an RPC attempt never implies rollback',async()=>{
 const from=vi.fn()
  .mockReturnValueOnce(table({patient_id:patient}))
  .mockReturnValueOnce(table({demographics:{},account_id:null}));
 auth.value={user:{id:owner},supabase:{from,rpc:vi.fn(async()=>{throw Error('fictional network interruption');})}};
 const response=await POST(request({action:'save',id:record,expectedRevision:0,state:{}}));
 expect(response.status).toBe(503);
 expect((await response.json()).error).toMatch(/before retrying/);
 expect(from).toHaveBeenCalledTimes(2);
});

test('DSM save receipt: malformed pre-save chart binding stops before RPC',async()=>{
 const from=vi.fn().mockReturnValueOnce(table({patient_id:'wrong-chart'}));
 const rpc=vi.fn();
 auth.value={user:{id:owner},supabase:{from,rpc}};
 const response=await POST(request({action:'save',id:record,expectedRevision:0,state:{}}));
 expect(response.status).toBe(404);
 expect(rpc).not.toHaveBeenCalled();
 expect(from).toHaveBeenCalledTimes(1);
});
