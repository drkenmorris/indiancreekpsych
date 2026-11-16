import {beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/emr/treatment-response/route';
import {emptyTreatmentResponse} from '@/lib/emr/treatment-response';
const mock=vi.hoisted(()=>({access:vi.fn()}));
vi.mock('@/lib/emr/modality-access',()=>({modalityAccess:mock.access}));
const patientId='00000000-0000-4000-8000-000000000005';
let record:any,patient:any,writes:any[],writeData:any,writeError:any;
const get=()=>new Request('https://clinic.test/api/emr/treatment-response?patient='+patientId);
const post=(body:any,origin='https://clinic.test')=>new Request('https://clinic.test/api/emr/treatment-response',{method:'POST',headers:{origin},body:JSON.stringify(body)});
beforeEach(()=>{
 record={revision:2,treatment_response:null};patient={id:patientId,demographics:{}};writes=[];writeData={revision:3};writeError=null;
 mock.access.mockResolvedValue({admin:true,supabase:{from:(table:string)=>{
  let write=false;const q:any={select:()=>q,eq:()=>q,is:()=>q,order:()=>q,limit:async()=>({data:[],error:null}),
   insert:(patch:any)=>{write=true;writes.push(patch);return q;},update:(patch:any)=>{write=true;writes.push(patch);return q;},
   maybeSingle:async()=>write?{data:writeData,error:writeError}:{data:table==='clinical_patients'?patient:record,error:null}};return q;
 }}});
});
test('requires MFA and same-origin writes, and hides unavailable patient charts',async()=>{
 mock.access.mockResolvedValueOnce(null);expect((await GET(get())).status).toBe(403);
 expect((await POST(post({patientId,revision:2,response:emptyTreatmentResponse()},'https://external.test'))).status).toBe(403);
 patient=null;expect((await GET(get())).status).toBe(404);expect(writes).toHaveLength(0);
});
test('returns a blank response without fabricating approval, and writes only response with optimistic revision',async()=>{
 const res=await GET(get());expect(res.headers.get('cache-control')).toBe('private, no-store');
 expect((await res.json()).response).toBeNull();
 const response=emptyTreatmentResponse();
 expect((await POST(post({patientId,revision:2,response}))).status).toBe(200);
 expect(writes).toEqual([{treatment_response:response,revision:3}]);
 writeData=null;writeError={code:'40001'};
 expect((await POST(post({patientId,revision:2,response}))).status).toBe(409);
});
test('rejects invalid approvals, oversized payloads, and executable content before mutation',async()=>{
 const response=emptyTreatmentResponse();response.participants[0].approval='both' as any;
 expect((await POST(post({patientId,revision:2,response}))).status).toBe(400);
 response.participants[0].approval='yes';response.narratives.patient={type:'doc',content:[{type:'script'}]};
 expect((await POST(post({patientId,revision:2,response}))).status).toBe(400);
 expect((await POST(post({patientId,revision:2,padding:'x'.repeat(450000)}))).status).toBe(400);
 expect(writes).toHaveLength(0);
});
