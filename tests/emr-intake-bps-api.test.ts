import {beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/emr/bps-intake/route';
const m=vi.hoisted(()=>({access:vi.fn(),sameOrigin:vi.fn(),from:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({emrAccess:m.access,sameOrigin:m.sameOrigin,privateHeaders:{'Cache-Control':'private, no-store'}}));
const patient='00000000-0000-0000-0000-000000000123',account='00000000-0000-0000-0000-000000000124';
const stamp='2026-11-10T09:00:00Z';
const request=()=>new Request('https://www.indiancreekpsych.com/api/emr/bps-intake?patient='+patient);
const submit=(details:Record<string,unknown>)=>new Request('https://www.indiancreekpsych.com/api/emr/bps-intake',{method:'POST',headers:{Origin:'https://www.indiancreekpsych.com'},
 body:JSON.stringify(details)});
const payload={patientId:patient,sourceVersion:2,sourceStatus:'submitted',sourceUpdatedAt:stamp,reviewed:true,notes:{presenting:'Reported changes'}};
let linked:string|null;
let reviewRows:Record<string,unknown>[];
let version:number;
let data:Record<string,string>;
beforeEach(()=>{
 vi.clearAllMocks();linked=account;version=2;reviewRows=[];
 data={counseling_reason:'Reports sadness',suicidal_thoughts_current:'Yes',roi_authorize:'Yes',medication_entries:'structured original'};
 m.sameOrigin.mockReturnValue(true);m.rpc.mockResolvedValue({data:'00000000-0000-0000-0000-000000000500',error:null});
 m.from.mockImplementation((table:string)=>{
  if(table==='clinical_patients'){const q={select:()=>q,eq:vi.fn(()=>q),maybeSingle:async()=>({data:{id:patient,account_id:linked},error:null})};return q;}
  if(table==='patient_intakes'){const q={select:()=>q,eq:vi.fn(()=>q),maybeSingle:async()=>({data:{answers:data,status:'submitted',version,updated_at:stamp},error:null})};return q;}
  if(table==='emr_bps_intake_reviews'){const q={select:()=>q,eq:vi.fn(()=>q),order:()=>q,limit:async()=>({data:reviewRows,error:null})};return q;}
  throw Error('Unexpected '+table);
 });
 m.access.mockResolvedValue({supabase:{from:m.from,rpc:m.rpc}});
});
test('existing MFA and same-origin gates prevent unauthorized BPS source and saves',async()=>{
 m.access.mockResolvedValue(null);
 expect((await GET(request())).status).toBe(403);expect((await POST(submit(payload))).status).toBe(403);
 m.access.mockResolvedValue({supabase:{from:m.from,rpc:m.rpc}});
 m.sameOrigin.mockReturnValue(false);expect((await POST(submit(payload))).status).toBe(403);
 expect(m.rpc).not.toHaveBeenCalled();
});
test('explicit linked account only, no name matching, no empty source fabrication',async()=>{
 linked=null;expect((await GET(request())).status).toBe(409);
 expect(m.from).not.toHaveBeenCalledWith('patient_intakes');
});
test('21-section review distinguishes risk, legal references and structured reconciliation',async()=>{
 const response=await GET(request());expect(response.status).toBe(200);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 const body=await response.json();expect(body.sections).toHaveLength(21);
 expect(body.source).toEqual({version:2,status:'submitted',updatedAt:stamp});
 expect(body.sections.find((s:any)=>s.title==='Safety and risk screening').fields.find((f:any)=>f.key==='suicidal_thoughts_current').value).toBe('Yes');
 expect(body.sections.find((s:any)=>s.title==='Authorization to share health information').disposition).toBe('reference');
 expect(body.sections.find((s:any)=>s.title==='Medications').disposition).toBe('separate-review');
});
test('save accepts only explicit reviewed provenance and clinician notes, never client-fabricated fields',async()=>{
 const response=await POST(submit({...payload,clinical_answers:{forged:'diagnosis'},signature:'FAKE',billing:{charge:500}}));
 expect(response.status).toBe(201);
 expect(await response.json()).toEqual({id:'00000000-0000-0000-0000-000000000500',saved:true,unsigned:true,diagnosisCreated:false});
 expect(m.rpc).toHaveBeenCalledWith('save_emr_bps_intake_review',{p_payload:{
  patient_id:patient,source_version:2,source_status:'submitted',source_updated_at:stamp,
  reviewed:true,clinician_notes:{presenting:'Reported changes',treatment:'',medical:'',safety:'',family:'',goals:'',limitations:''}}});
});
test('invalid identity, review, timestamps, source version or arbitrary note keys cannot reach save RPC',async()=>{
 for(const bad of [{...payload,reviewed:false},{...payload,patientId:'wrong'},{...payload,sourceVersion:-1},
  {...payload,sourceUpdatedAt:'invalid'}, {...payload,notes:{diagnosis:'fabricated'}},
  {...payload,notes:{safety:'x'.repeat(4001)}}, {...payload,notes:null}]){
  expect((await POST(submit(bad))).status).toBe(400);
 }expect(m.rpc).not.toHaveBeenCalled();
});
test('stale source and duplicate snapshots fail closed at the database validation boundary',async()=>{
 for(const [code,status] of [['22023',409],['23505',409],['42501',403]] as const){
  m.rpc.mockResolvedValueOnce({data:null,error:{code}});
  expect((await POST(submit(payload))).status).toBe(status);
 }
});

test('saved BPS history cannot follow a relinked patient account or cross into another chart',async()=>{
 reviewRows=[{id:'00000000-0000-0000-0000-000000000600',patient_id:patient,source_account_id:account,
   source_version:2,source_status:'submitted',source_updated_at:stamp,created_at:stamp,
   clinical_answers:{counseling_reason:'Patient-reported history'},clinician_notes:{presenting:'Reviewed'}}];
 const response=await GET(request());expect(response.status).toBe(200);
 const body=await response.json();expect(body.reviews).toHaveLength(1);
 expect(body.reviews[0].clinical_answers.counseling_reason).toBe('Patient-reported history');
 expect(body.reviews[0]).not.toHaveProperty('source_account_id');
 expect(body.reviews[0]).not.toHaveProperty('patient_id');
 const reviewQuery=m.from.mock.results.find((r:any)=>r.value?.limit)?.value;
 expect(reviewQuery?.eq).toHaveBeenCalledWith('patient_id',patient);
 expect(reviewQuery?.eq).toHaveBeenCalledWith('source_account_id',account);
 // Fail closed even if a downstream database response violates the intended scope.
 reviewRows=[{...reviewRows[0],source_account_id:'00000000-0000-0000-0000-000000000999'}];
 const blocked=await GET(request());expect(blocked.status).toBe(409);
 expect(JSON.stringify(await blocked.json())).not.toContain('Patient-reported history');
 reviewRows=[{...reviewRows[0],source_account_id:account,patient_id:'00000000-0000-0000-0000-000000000998'}];
 expect((await GET(request())).status).toBe(409);
});
