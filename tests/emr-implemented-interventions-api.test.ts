import {beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/emr/implemented-interventions/route';
import {validImplementedInput} from '@/lib/emr/implemented-interventions';
const mock=vi.hoisted(()=>({access:vi.fn()}));vi.mock('@/lib/emr/access',async()=>({...await vi.importActual('@/lib/emr/access'),emrAccess:mock.access}));
const pid='00000000-0000-4000-8000-000000000103',id='00000000-0000-4000-8000-000000000104',version='00000000-0000-4000-8000-000000000105';
const body=()=>({id,patientId:pid,planVersionId:version,libraryRevision:3,sessionDate:'2026-01-01',selections:[{problemId:'p',implementedId:'done'}]});
let previous:any,writeError:any,writes:any[],tables:string[];
let swappedPerson:boolean,swappedPlan:boolean,swappedVersion:boolean,swappedHistory:boolean;
const post=(value:any,origin='https://clinic.test')=>new Request('https://clinic.test/api/emr/implemented-interventions',{method:'POST',headers:{origin},body:JSON.stringify(value)});
beforeEach(()=>{previous=null;writeError=null;writes=[];tables=[];swappedPerson=false;swappedPlan=false;swappedVersion=false;swappedHistory=false;mock.access.mockResolvedValue({user:{id:'owner'},supabase:{from:(table:string)=>{tables.push(table);let write=false;const q:any={select:()=>q,eq:()=>q,is:()=>q,order:()=>q,insert:(patch:any)=>{write=true;writes.push(patch);return q;},limit:async()=>({data:table==='emr_treatment_plans'?[{id:'plan',patient_id:swappedPlan?'other':pid,owner_id:'owner'}]:table==='emr_treatment_plan_versions'?[{id:version,plan_id:swappedVersion?'other':'plan',snapshot:{}}]:table==='emr_implemented_intervention_entries'&&swappedHistory?[{id:'entry',patient_id:'other',owner_id:'owner'}]:[],error:null}),single:async()=>write?{data:writeError?null:{...writes.at(-1),snapshot:{selections:[]}},error:writeError}:{data:table==='emr_treatment_library'?{revision:3}:{nodes:[]},error:null},maybeSingle:async()=>({data:table==='clinical_patients'?{id:swappedPerson?'other':pid,directory_deleted_at:null,demographics:{first_name:'Fictional'}}:previous,error:null})};return q;}}});});
test('missing MFA and cross-origin writes are rejected before mutation',async()=>{mock.access.mockResolvedValueOnce(null);expect((await GET(new Request('https://clinic.test/api/emr/implemented-interventions?patient='+pid))).status).toBe(403);expect((await POST(post(body(),'https://other.test'))).status).toBe(403);expect(writes).toHaveLength(0);});
test('loads only selected patient plan, current library and owner history',async()=>{const result=await GET(new Request('https://clinic.test/api/emr/implemented-interventions?patient='+pid));expect(result.status).toBe(200);expect((await result.json()).patient.id).toBe(pid);expect(tables).toContain('emr_treatment_plan_versions');});
test('invalid dates, duplicates and identifiers do not reach the database insert',async()=>{for(const value of [{...body(),sessionDate:'2026-02-30'},{...body(),selections:[...body().selections,...body().selections]},{...body(),patientId:'bad'},{...body(),selections:[]}]){expect(validImplementedInput(value)).toBe(false);expect((await POST(post(value))).status).toBe(400);}expect(writes).toHaveLength(0);});
test('writes stable IDs and source references only; server-derived wording is not accepted from the client',async()=>{const result=await POST(post({...body(),snapshot:{text:'Forged label'},selections:[{...body().selections[0],text:'Forged label'}]}));expect(result.status).toBe(200);expect(writes).toEqual([{id,patient_id:pid,plan_version_id:version,library_revision:3,session_date:'2026-01-01',selection_ids:body().selections}]);});
test('identical retry returns the saved entry without another insert; changed content conflicts',async()=>{previous={id,plan_version_id:version,library_revision:3,session_date:'2026-01-01',selection_ids:body().selections};expect((await POST(post(body()))).status).toBe(200);expect(writes).toHaveLength(0);expect((await POST(post({...body(),sessionDate:'2026-01-02'}))).status).toBe(409);});
test('library conflicts and authorization failures remain actionable and unsaved',async()=>{writeError={code:'40001'};expect((await POST(post(body()))).status).toBe(409);writeError={code:'42501'};expect((await POST(post(body()))).status).toBe(403);});

test('withholds patient data when chart, plan, version or history readback has a mismatched identity',async()=>{
 for(const [flag,status] of [['swappedPerson',404],['swappedPlan',403],['swappedVersion',403],['swappedHistory',403]] as const){
  swappedPerson=swappedPlan=swappedVersion=swappedHistory=false;
  if(flag==='swappedPerson')swappedPerson=true;
  if(flag==='swappedPlan')swappedPlan=true;
  if(flag==='swappedVersion')swappedVersion=true;
  if(flag==='swappedHistory')swappedHistory=true;
  const result=await GET(new Request('https://clinic.test/api/emr/implemented-interventions?patient='+pid));
  expect(result.status).toBe(status);
  expect(JSON.stringify(await result.json())).not.toContain('Fictional');
 }
});
