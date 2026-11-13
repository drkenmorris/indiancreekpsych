import {beforeEach,test,expect,vi} from 'vitest';import {GET} from '@/app/api/emr/risk-assessment/route';
const m=vi.hoisted(()=>({access:vi.fn()}));vi.mock('@/lib/emr/access',()=>({emrAccess:m.access,privateHeaders:{'Cache-Control':'private, no-store'}}));
const id='00000000-0000-0000-0000-000000000123',account='00000000-0000-0000-0000-000000000124';let patient:any,intake:any,queries:any[],readError:any;
const request=(patient=id)=>new Request('https://www.indiancreekpsych.com/api/emr/risk-assessment?patient='+patient);
beforeEach(()=>{queries=[];patient={id,account_id:account,directory_deleted_at:null};intake={patient_id:account,answers:{suicidal_thoughts_current:'No',suicidal_plan_current:'Yes',homicidal_thoughts_current:'No',abuse_neglect_current:'Unsure',weapons_access:'',violence_risk_details:'Fictional source detail',protective_factors:'Fictional support',insurance_member:'PRIVATE COVERAGE',roi_signature:'PRIVATE LEGAL'},status:'submitted',version:3,updated_at:'2026-11-11T10:00:00Z',submitted_at:'2026-11-11T10:00:00Z'};readError=null;m.access.mockResolvedValue({supabase:{from:(table:string)=>{const q={select:()=>q,eq:(...filter:any[])=>{queries.push([table,...filter]);return q;},is:()=>q,maybeSingle:async()=>({data:table==='clinical_patients'?patient:intake,error:readError})};return q;}}});});
test('MFA/admin and valid-patient gates deny before any intake read',async()=>{m.access.mockResolvedValueOnce(null);expect((await GET(request())).status).toBe(403);expect(queries).toHaveLength(0);expect((await GET(request('invalid'))).status).toBe(400);});
test('submitted risk answers transfer by explicit linked account, only seven fields and provenance leave the API',async()=>{const r=await GET(request()),data=await r.json();expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('private, no-store');expect(queries).toContainEqual(['patient_intakes','patient_id',account]);expect(data.patientId).toBe(id);expect(data.source.version).toBe(3);expect(data.fields).toHaveLength(7);expect(JSON.stringify(data)).not.toMatch(/PRIVATE COVERAGE|PRIVATE LEGAL/);expect(data.fields.find((f:any)=>f.key==='abuse_neglect_current').value).toBe('Unsure');expect(data.fields.find((f:any)=>f.key==='weapons_access').value).toBe('');});
test('missing, unlinked and draft sources never become negative risk findings',async()=>{patient=null;expect((await GET(request())).status).toBe(404);patient={id,account_id:null,directory_deleted_at:null};const unlinked=await (await GET(request())).json();expect(unlinked.source).toBeNull();expect(unlinked.fields.every((field:any)=>field.value==='')).toBe(true);patient={id,account_id:account,directory_deleted_at:null};intake=null;expect((await (await GET(request())).json()).source).toBeNull();intake={patient_id:account,status:'draft',version:4,updated_at:'2026-11-11T10:00:00Z',submitted_at:null,answers:{suicidal_plan_current:'Yes'}};const draft=await (await GET(request())).json();expect(draft.source.status).toBe('draft');expect(draft.fields[1].value).toBe('Yes');});
test('source errors do not return empty or stale findings as a success',async()=>{readError={message:'unavailable'};const r=await GET(request());expect(r.status).toBe(503);expect((await r.json()).fields).toBeUndefined();});

test('a mismatched central patient or unverified account cannot disclose reported risk details',async()=>{
 patient={id:'00000000-0000-0000-0000-000000000999',account_id:account,directory_deleted_at:null};
 let r=await GET(request());expect(r.status).toBe(409);expect((await r.json()).fields).toBeUndefined();
 patient={id,account_id:'invalid-account',directory_deleted_at:null};
 r=await GET(request());expect(r.status).toBe(409);expect((await r.json()).fields).toBeUndefined();
});
test('archived central charts fail closed before risk-screening source access',async()=>{
 patient={id,account_id:account,directory_deleted_at:'2026-11-13T01:00:00Z'};
 const response=await GET(request());
 expect(response.status).toBe(409);
 expect((await response.json()).fields).toBeUndefined();
 expect(queries).not.toContainEqual(['patient_intakes','patient_id',account]);
});
test('returned intake patient ID must match linked account even after a scoped query',async()=>{
 intake.patient_id='00000000-0000-0000-0000-000000000999';
 const r=await GET(request());expect(r.status).toBe(409);
 expect((await r.json()).fields).toBeUndefined();
 expect(queries).toContainEqual(['patient_intakes','patient_id',account]);
});
test('malformed source version, status and timestamps never become apparent safety findings',async()=>{
 for(const bad of [
  {version:0},{version:1.2},{version:'3'},{version:Number.MAX_SAFE_INTEGER+1},
  {status:'unknown'},{updated_at:'2026-02-30T10:00:00Z'},
  {updated_at:'November 11'},{submitted_at:'2026-02-30T10:00:00Z'}
 ]){
  const original=intake;intake={...original,...bad};
  const response=await GET(request());
  expect(response.status).toBe(409);
  expect((await response.json()).fields).toBeUndefined();
  intake=original;
 }
});
test('missing or non-object safety source payload is withheld, not translated to seven blank answers',async()=>{
 for(const answers of [null,[], 'unsafe', false]){
  const original=intake;intake={...original,answers};
  const response=await GET(request());
  expect(response.status).toBe(409);
  expect((await response.json()).fields).toBeUndefined();
  intake=original;
 }
});
