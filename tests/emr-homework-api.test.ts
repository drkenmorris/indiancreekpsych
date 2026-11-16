import {beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/emr/homework/route';
const m=vi.hoisted(()=>({access:vi.fn()}));vi.mock('@/lib/emr/access',async importOriginal=>({...await importOriginal<any>(),emrAccess:m.access}));
const patientId='00000000-0000-4000-8000-000000000005';
const body={id:'00000000-0000-4000-8000-000000000030',patientId,planVersionId:'00000000-0000-4000-8000-000000000020',problemId:'p1',objectiveId:'o1',interventionId:'i1',narrative:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Fictional home practice'}]}]}};
let patient:any,writes:any[],saved:any,saveError:any;
const post=(value:any,origin='https://clinic.test')=>new Request('https://clinic.test/api/emr/homework',{method:'POST',headers:{origin},body:JSON.stringify(value)});
beforeEach(()=>{patient={id:patientId,demographics:{}};writes=[];saved={id:body.id,patient_id:patientId,plan_version_id:body.planVersionId,problem_id:'p1',objective_id:'o1',intervention_id:'i1',narrative:body.narrative};saveError=null;
 m.access.mockResolvedValue({user:{id:'fictional-clinician'},supabase:{from:(table:string)=>{const q:any={select:()=>q,eq:()=>q,is:()=>q,order:()=>q,insert:(patch:any)=>{writes.push(patch);return q;},range:async()=>({data:[],error:null}),single:async()=>({data:saveError?null:saved,error:saveError}),maybeSingle:async()=>({data:table==='clinical_patients'?patient:saved,error:null})};return q;}}});});
test('MFA and same-origin protection precede writes; invalid or inactive patients cannot load homework',async()=>{
 m.access.mockResolvedValueOnce(null);expect((await GET(new Request('https://clinic.test/api/emr/homework?patient='+patientId))).status).toBe(403);
 expect((await POST(post(body,'https://external.test'))).status).toBe(403);expect(writes).toHaveLength(0);
 patient.demographics.active=false;expect((await GET(new Request('https://clinic.test/api/emr/homework?patient='+patientId))).status).toBe(404);
});
test('client submits IDs and narrative only; authoritative labels are derived by database',async()=>{
 const response=await POST(post({...body,snapshot:{problem:{text:'Forged label'}},owner_id:'other'}));expect(response.status).toBe(200);
 expect(writes).toEqual([{id:body.id,patient_id:patientId,plan_version_id:body.planVersionId,problem_id:'p1',objective_id:'o1',intervention_id:'i1',narrative:body.narrative}]);
 expect(response.headers.get('cache-control')).toBe('private, no-store');
});
test('retried confirmed save is idempotent and changed content with the same ID is rejected',async()=>{
 saveError={code:'23505'};expect((await POST(post(body))).status).toBe(200);
 expect((await POST(post({...body,objectiveId:'o2'}))).status).toBe(409);
});
test('empty or malformed assignments and invalid history pagination are rejected',async()=>{
 expect((await POST(post({...body,narrative:{type:'doc',content:[{type:'paragraph'}]}}))).status).toBe(400);
 expect((await POST(post({...body,id:'invalid'}))).status).toBe(400);
 expect((await GET(new Request('https://clinic.test/api/emr/homework?patient='+patientId+'&offset=-1'))).status).toBe(400);expect(writes).toHaveLength(0);
});
