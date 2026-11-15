import {beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/emr/diagnoses/route';
const mock=vi.hoisted(()=>({access:vi.fn()}));
vi.mock('@/lib/emr/modality-access',()=>({modalityAccess:mock.access}));
const patientId='00000000-0000-4000-8000-000000000005';
const diagnosis={code:'F41.1',label:'Generalized anxiety disorder',version:'ICD-10-CM FY2027',priority:'primary',status:'provisional',notes:'Fictional verification'};
let patient:any,record:any,writeError:any,writeData:any,writes:any[];
const get=()=>new Request('https://clinic.test/api/emr/diagnoses?patient='+patientId);
const post=(body:any,origin='https://clinic.test')=>new Request('https://clinic.test/api/emr/diagnoses',{method:'POST',headers:{origin},body:JSON.stringify(body)});
beforeEach(()=>{
 patient={id:patientId,demographics:{}};record={revision:2,diagnoses:[]};writeError=null;writeData={revision:3};writes=[];
 mock.access.mockResolvedValue({admin:true,supabase:{from:(table:string)=>{
  let write=false;const query:any={select:()=>query,eq:()=>query,is:()=>query,order:()=>query,
   limit:async()=>({data:[],error:null}),
   insert:(patch:any)=>{write=true;writes.push(patch);return query;},update:(patch:any)=>{write=true;writes.push(patch);return query;},
   maybeSingle:async()=>write?{data:writeData,error:writeError}:{data:table==='clinical_patients'?patient:record,error:null}};
  return query;
 }}});
});
test('denies missing MFA and cross-origin writes before mutation',async()=>{
 mock.access.mockResolvedValueOnce(null);expect((await GET(get())).status).toBe(403);
 expect((await POST(post({patientId,revision:2,diagnoses:[diagnosis]},'https://elsewhere.test'))).status).toBe(403);
 expect(writes).toHaveLength(0);
});
test('loads a patient without assessment prerequisites and rejects deleted/inactive or unavailable patients',async()=>{
 const result=await GET(get());expect(result.status).toBe(200);
 const data=await result.json();expect(data.patientId).toBe(patientId);expect(data.catalog.rows.some((r:any)=>r.code==='F41.1')).toBe(true);
 patient=null;expect((await GET(get())).status).toBe(404);
 patient={demographics:{active:false}};expect((await GET(get())).status).toBe(404);
});
test('validates code-label pairing, limits and duplicate/primary choices before mutation',async()=>{
 for(const diagnoses of [[{...diagnosis,label:'Substituted diagnosis'}],[{...diagnosis,code:'INVALID'}],[diagnosis,diagnosis],[{...diagnosis,notes:'x'.repeat(1001)}]])
  expect((await POST(post({patientId,revision:2,diagnoses}))).status).toBe(400);
 expect(writes).toHaveLength(0);
});
test('updates only diagnoses with revision check and returns conflicts without overwriting concurrent edits',async()=>{
 expect((await POST(post({patientId,revision:2,diagnoses:[diagnosis]}))).status).toBe(200);
 expect(writes).toEqual([{revision:3,diagnoses:[diagnosis]}]);
 writeData=null;writeError={code:'40001'};
 expect((await POST(post({patientId,revision:2,diagnoses:[]}))).status).toBe(409);
});
