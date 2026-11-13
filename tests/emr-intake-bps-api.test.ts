import {beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/emr/bps-intake/route';
const m=vi.hoisted(()=>({access:vi.fn(),sameOrigin:vi.fn(),from:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({emrAccess:m.access,sameOrigin:m.sameOrigin,privateHeaders:{'Cache-Control':'private, no-store'}}));
const patient='00000000-0000-0000-0000-000000000123',account='00000000-0000-0000-0000-000000000124';
const stamp='2026-11-10T09:00:00Z';
const request=()=>new Request('https://www.indiancreekpsych.com/api/emr/bps-intake?patient='+patient);
const submit=(details:Record<string,unknown>)=>new Request('https://www.indiancreekpsych.com/api/emr/bps-intake',{method:'POST',headers:{Origin:'https://www.indiancreekpsych.com'},
 body:JSON.stringify(details)});
const payload={patientId:patient,sourceAccountId:account,sourceVersion:2,sourceStatus:'submitted',sourceUpdatedAt:stamp,reviewed:true,notes:{presenting:'Reported changes'}};
let linked:string|null;
let directoryDeletedAt:string|null;
let returnedPatientId:string;
let returnedIntakeAccountId:string;
let reviewRows:Record<string,unknown>[];
let historyResultOverride:unknown;
let version:number;
let intakeStatus:string;
let intakeUpdatedAt:string;
let intakeSubmittedAt:string|null;
let data:Record<string,string>;
beforeEach(()=>{
 vi.clearAllMocks();linked=account;directoryDeletedAt=null;returnedPatientId=patient;returnedIntakeAccountId=account;version=2;intakeStatus='submitted';intakeUpdatedAt=stamp;intakeSubmittedAt=stamp;reviewRows=[];historyResultOverride=undefined;
 data={counseling_reason:'Reports sadness',suicidal_thoughts_current:'Yes',roi_authorize:'Yes',medication_entries:'structured original'};
 m.sameOrigin.mockReturnValue(true);m.rpc.mockResolvedValue({data:'00000000-0000-0000-0000-000000000500',error:null});
 m.from.mockImplementation((table:string)=>{
  if(table==='clinical_patients'){const q={select:()=>q,eq:vi.fn(()=>q),is:vi.fn(()=>q),maybeSingle:async()=>({data:{id:returnedPatientId,account_id:linked,directory_deleted_at:directoryDeletedAt},error:null})};return q;}
  if(table==='patient_intakes'){const q={select:()=>q,eq:vi.fn(()=>q),maybeSingle:async()=>({data:{patient_id:returnedIntakeAccountId,answers:data,status:intakeStatus,version,updated_at:intakeUpdatedAt,submitted_at:intakeSubmittedAt},error:null})};return q;}
  if(table==='emr_bps_intake_reviews'){const q={select:()=>q,eq:vi.fn(()=>q),order:()=>q,limit:async()=>({data:historyResultOverride===undefined?reviewRows:historyResultOverride,error:null})};return q;}
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
test('cross-chart central-row or intake-account mismatches fail closed without exposing another patient source',async()=>{
 returnedPatientId='00000000-0000-0000-0000-000000000998';
 const wrongCentral=await GET(request());
 expect(wrongCentral.status).toBe(409);
 expect(JSON.stringify(await wrongCentral.json())).not.toContain('Reports sadness');
 expect(m.from).not.toHaveBeenCalledWith('patient_intakes');
 returnedPatientId=patient;
 returnedIntakeAccountId='00000000-0000-0000-0000-000000000999';
 const wrongIntake=await GET(request());
 expect(wrongIntake.status).toBe(409);
 expect(JSON.stringify(await wrongIntake.json())).not.toContain('Reports sadness');
 expect(m.from).not.toHaveBeenCalledWith('emr_bps_intake_reviews');
});

test('archived charts never disclose BPS answers or existing review history',async()=>{
 directoryDeletedAt=stamp;
 data={counseling_reason:'PRIVATE_ARCHIVED_FICTIONAL_PATIENT_STATEMENT'};
 const response=await GET(request());
 expect(response.status).toBe(409);
 expect(JSON.stringify(await response.json())).not.toContain('PRIVATE_ARCHIVED_FICTIONAL_PATIENT_STATEMENT');
 expect(m.from).not.toHaveBeenCalledWith('patient_intakes');
 expect(m.from).not.toHaveBeenCalledWith('emr_bps_intake_reviews');
 const q=m.from.mock.results.find((entry:any)=>entry.value?.is)?.value;
 expect(q?.is).toHaveBeenCalledWith('directory_deleted_at',null);
});

test('protected BPS API fails closed on malformed linked source before any questionnaire or history disclosure',async()=>{
 data={counseling_reason:'PRIVATE_FICTIONAL_PATIENT_STATEMENT'};
 const invalidSources=[
  {status:'revoked',version:2,updatedAt:stamp},
  {status:'submitted',version:0,updatedAt:stamp},
  {status:'submitted',version:1.5,updatedAt:stamp},
  {status:'submitted',version:Number.MAX_SAFE_INTEGER+1,updatedAt:stamp},
  {status:'submitted',version:2,updatedAt:'not-a-date'},
   {status:'submitted',version:2,updatedAt:'1'},
   {status:'submitted',version:2,updatedAt:'2026-11-10'},
   {status:'submitted',version:2,updatedAt:'2026-02-30T09:00:00Z'}
 ];
 for(const entry of invalidSources){
  m.from.mockClear();
  intakeStatus=entry.status;version=entry.version;intakeUpdatedAt=entry.updatedAt;
  const response=await GET(request());
  expect(response.status).toBe(409);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(JSON.stringify(await response.json())).not.toContain('PRIVATE_FICTIONAL_PATIENT_STATEMENT');
  expect(m.from).not.toHaveBeenCalledWith('emr_bps_intake_reviews');
 }
 intakeStatus='submitted';version=2;intakeUpdatedAt=stamp;
 linked='not-a-valid-account-uuid';
 m.from.mockClear();
 const unlinked=await GET(request());
 expect(unlinked.status).toBe(409);
 expect(JSON.stringify(await unlinked.json())).not.toContain('PRIVATE_FICTIONAL_PATIENT_STATEMENT');
 expect(m.from).not.toHaveBeenCalledWith('patient_intakes');
});

test('a submitted linked BPS intake requires a verified source submission receipt, but unsent drafts remain reviewable',async()=>{
 const protectedSource='PRIVATE_FICTIONAL_SOURCE_REPORT';
 data={counseling_reason:protectedSource};
 intakeSubmittedAt=null;
 let response=await GET(request());
 expect(response.status).toBe(409);
 expect(JSON.stringify(await response.json())).not.toContain(protectedSource);
 expect(m.from).not.toHaveBeenCalledWith('emr_bps_intake_reviews');
 intakeSubmittedAt='2026-02-30T09:00:00Z';
 response=await GET(request());
 expect(response.status).toBe(409);
 expect(JSON.stringify(await response.json())).not.toContain(protectedSource);
 intakeStatus='draft';intakeSubmittedAt=null;
 response=await GET(request());
 expect(response.status).toBe(200);
 const draft=await response.json();
 expect(draft.source.status).toBe('draft');
 expect(draft.source.submittedAt).toBeNull();
 intakeStatus='submitted';intakeSubmittedAt=stamp;
 response=await GET(request());
 expect(response.status).toBe(200);
 const submitted=await response.json();
 expect(submitted.source.submittedAt).toBe(stamp);
 expect(submitted.source.updatedAt).toBe(stamp);
});

test('malformed linked JSONB answers cannot impersonate an empty but valid 21-section clinical intake',async()=>{
 const safe={...data,counseling_reason:'PRIVATE_FICTIONAL_STATEMENT'};
 const invalidSources:unknown[]=[
  null,[], 'incorrect-shape', 42,
  {...safe,counseling_reason:null},
  {...safe,counseling_reason:['PRIVATE_FICTIONAL_STATEMENT']},
  {...safe,counseling_reason:{text:'PRIVATE_FICTIONAL_STATEMENT'}},
  {...safe,suicidal_thoughts_current:false}
 ];
 for(const malformed of invalidSources){
  data=malformed as Record<string,string>;
  m.from.mockClear();
  const response=await GET(request());
  expect(response.status).toBe(409);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  const wire=JSON.stringify(await response.json());
  expect(wire).not.toContain('PRIVATE_FICTIONAL_STATEMENT');
  expect(wire).not.toContain('"sections"');
  expect(m.from).not.toHaveBeenCalledWith('emr_bps_intake_reviews');
 }
 data=safe;
 expect((await GET(request())).status).toBe(200);
});

test('21-section review distinguishes risk, legal references and structured reconciliation',async()=>{
 const response=await GET(request());expect(response.status).toBe(200);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 const body=await response.json();expect(body.sections).toHaveLength(21);
 expect(body.source).toEqual({accountId:account,version:2,status:'submitted',updatedAt:stamp});
 expect(body.sections.find((s:any)=>s.title==='Safety and risk screening').fields.find((f:any)=>f.key==='suicidal_thoughts_current').value).toBe('Yes');
 expect(body.sections.find((s:any)=>s.title==='Authorization to share health information').disposition).toBe('reference');
 expect(body.sections.find((s:any)=>s.title==='Medications').disposition).toBe('separate-review');
});
test('save accepts only explicit reviewed provenance and clinician notes, never client-fabricated fields',async()=>{
 const response=await POST(submit({...payload,clinical_answers:{forged:'diagnosis'},signature:'FAKE',billing:{charge:500}}));
 expect(response.status).toBe(201);
 expect(await response.json()).toEqual({id:'00000000-0000-0000-0000-000000000500',saved:true,unsigned:true,diagnosisCreated:false});
 expect(m.rpc).toHaveBeenCalledWith('save_emr_bps_intake_review',{p_payload:{
  patient_id:patient,source_account_id:account,source_version:2,source_status:'submitted',source_updated_at:stamp,
  reviewed:true,clinician_notes:{presenting:'Reported changes',treatment:'',medical:'',safety:'',family:'',goals:'',limitations:''}}});
});
test('invalid identity, review, timestamps, source version or arbitrary note keys cannot reach save RPC',async()=>{
 for(const bad of [{...payload,reviewed:false},{...payload,patientId:'wrong'},{...payload,sourceAccountId:null},{...payload,sourceVersion:-1},{...payload,sourceVersion:Number.MAX_SAFE_INTEGER+1},
  {...payload,sourceUpdatedAt:'invalid'}, {...payload,sourceUpdatedAt:'2026-02-30T09:00:00Z'},
   {...payload,sourceUpdatedAt:'2026-11-10'}, {...payload,sourceUpdatedAt:'1'}, {...payload,notes:{diagnosis:'fabricated'}},
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
   source_version:2,source_status:'submitted',source_updated_at:stamp,created_at:stamp,reviewed:true,
   clinical_answers:{counseling_reason:'Patient-reported history'},clinician_notes:{presenting:'Reviewed'}}];
 const response=await GET(request());expect(response.status).toBe(200);
 const body=await response.json();expect(body.reviews).toHaveLength(1);
 expect(body.reviews[0].clinical_answers.counseling_reason).toBe('Patient-reported history');
 expect(body.reviews[0]).not.toHaveProperty('source_account_id');
 expect(body.reviews[0]).not.toHaveProperty('patient_id');
 expect(body.reviews[0].excluded_clinical_fields).toBe(0);
 expect(body.reviews[0].reviewed).toBe(true);
 reviewRows=[{...reviewRows[0],clinical_answers:{
   counseling_reason:'Patient-reported history',medication_entries:'Do not disclose medications',
   trauma_history_checklist:'Do not disclose structured trauma',roi_signature:'Do not disclose signature',
   insurance_member:'Do not disclose policy'
 }}];
 const filtered=await GET(request());expect(filtered.status).toBe(200);
 const safe=(await filtered.json()).reviews[0];
 expect(safe.clinical_answers).toEqual({counseling_reason:'Patient-reported history'});
 expect(safe.excluded_clinical_fields).toBe(4);
 expect(JSON.stringify(safe)).not.toContain('Do not disclose');
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

test('historical review rows with invalid identity, version, status or dates never disclose protected clinical answers',async()=>{
 const row={id:'00000000-0000-0000-0000-000000000600',patient_id:patient,source_account_id:account,
  source_version:2,source_status:'submitted',source_updated_at:stamp,created_at:stamp,
  reviewed:true,clinical_answers:{counseling_reason:'PRIVATE_FICTIONAL_HISTORICAL_NOTE'},
  clinician_notes:{presenting:'PRIVATE_FICTIONAL_CLINICIAN_NOTE'}};
 const malformed=[
  {...row,id:'wrong-id'},
  {...row,source_version:0},
  {...row,source_version:Number.MAX_SAFE_INTEGER+1},
  {...row,source_status:'unknown'},
  {...row,source_updated_at:'not-a-date'},
  {...row,created_at:'not-a-date'},
   {...row,source_updated_at:'2026-02-30T09:00:00Z'},
   {...row,created_at:'1'}
 ];
 for(const value of malformed){
  reviewRows=[value];
  const response=await GET(request());
  expect(response.status).toBe(409);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  const body=JSON.stringify(await response.json());
  expect(body).not.toContain('PRIVATE_FICTIONAL_HISTORICAL_NOTE');
  expect(body).not.toContain('PRIVATE_FICTIONAL_CLINICIAN_NOTE');
 }
});

test('historical clinician-note columns are filtered before the protected chart API responds',async()=>{
 const allowed='Independent fictional clinician context';
 const secret='PRIVATE_INSURANCE_OR_LEGAL_NOTE_MUST_NOT_LEAK';
 reviewRows=[{id:'00000000-0000-0000-0000-000000000600',patient_id:patient,source_account_id:account,
   source_version:2,source_status:'submitted',source_updated_at:stamp,created_at:stamp,reviewed:true,
   clinical_answers:{counseling_reason:'Patient-reported concern'},
   clinician_notes:{presenting:allowed,insurance_member:secret,
    legal_decision:'PRIVATE_LEGAL_NOTE',medical:12345,safety:'S'.repeat(4001)}}];
 const response=await GET(request());
 expect(response.status).toBe(200);
 const body=await response.json();
 const saved=body.reviews[0];
 expect(saved.clinician_notes.presenting).toBe(allowed);
 expect(saved.clinician_notes.safety).toBe('');
 expect(saved.excluded_clinician_notes).toBe(4);
 for(const unsafe of [secret,'PRIVATE_LEGAL_NOTE','S'.repeat(4001),'insurance_member','legal_decision'])
  expect(JSON.stringify(saved)).not.toContain(unsafe);
 reviewRows=[{...reviewRows[0],clinician_notes:null}];
 const invalid=await GET(request());
 expect(invalid.status).toBe(200);
 const malformed=(await invalid.json()).reviews[0];
 expect(malformed.clinician_notes).toEqual({
   presenting:'',treatment:'',medical:'',safety:'',family:'',goals:'',limitations:''
 });
 expect(malformed.excluded_clinician_notes).toBe(1);
});


test('protected BPS source API never returns unapproved raw emergency-contact PII from clinical-classified intake fields',async()=>{
 const privateName='PRIVATE_EMERGENCY_CONTACT_NAME';
 const privatePhone='PRIVATE_EMERGENCY_CONTACT_PHONE';
 data={...data,emergency_contact_name:privateName,emergency_contact_phone:privatePhone,
  counseling_reason:'Fictional safe presenting reason'};
 const response=await GET(request());
 expect(response.status).toBe(200);
 const body=await response.json();
 const section=body.sections.find((s:{title:string})=>s.title==='Emergency contact, guardian, and responsible party');
 for(const key of ['emergency_contact_name','emergency_contact_phone']){
  const field=section.fields.find((f:{key:string})=>f.key===key);
  expect(field.reported).toBe(true);
  expect(field.sourceOnly).toBe(true);
  expect(field.value).toContain('protected source');
 }
 expect(JSON.stringify(body)).not.toContain(privateName);
 expect(JSON.stringify(body)).not.toContain(privatePhone);
 expect(JSON.stringify(body)).toContain('Fictional safe presenting reason');
});


test('stored BPS row without true clinician-review attestation is never represented as verified',async()=>{
 reviewRows=[{id:'00000000-0000-0000-0000-000000000600',patient_id:patient,source_account_id:account,
  source_version:2,source_status:'submitted',source_updated_at:stamp,created_at:stamp,
  reviewed:false,clinical_answers:{counseling_reason:'Fictional report'},clinician_notes:{}}];
 const response=await GET(request());expect(response.status).toBe(200);
 const payload=await response.json();expect(payload.reviews).toHaveLength(1);
 expect(payload.reviews[0].reviewed).toBe(false);
 reviewRows=[{...reviewRows[0],reviewed:null}];
 const missing=await GET(request());expect(missing.status).toBe(200);
 expect((await missing.json()).reviews[0].reviewed).toBe(false);
});


test('missing or malformed review-history results cannot masquerade as an empty clinical history',async()=>{
 data={counseling_reason:'PRIVATE_FICTIONAL_PATIENT_STATEMENT'};
 for(const invalid of [null,{},'unverified-history']){
  historyResultOverride=invalid;
  const response=await GET(request());
  expect(response.status).toBe(503);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  const wire=JSON.stringify(await response.json());
  expect(wire).not.toContain('PRIVATE_FICTIONAL_PATIENT_STATEMENT');
  expect(wire).not.toContain('"reviews":[]');
 }
});

test('active medication history and structured medication records never leak through the clinical BPS review API',async()=>{
 data={counseling_reason:'Fictional presenting concern',
  medication_entries:'PRIVATE_FICTIONAL_MEDICATION_LIST',
  prior_psychiatric_medications:'PRIVATE_FICTIONAL_HELPFUL_PAST_MEDICATIONS'};
 const response=await GET(request());expect(response.status).toBe(200);
 const body=await response.json();
 // Raw medication details stay in dedicated reconciliation, not the BPS notes API.
 expect(body).not.toHaveProperty('medicationEntries');
 expect(body).not.toHaveProperty('helpfulPastMedications');
 const wire=JSON.stringify(body);
 expect(wire).not.toContain('PRIVATE_FICTIONAL_MEDICATION_LIST');
 expect(wire).not.toContain('PRIVATE_FICTIONAL_HELPFUL_PAST_MEDICATIONS');
 const medication=body.sections.find((section:{title:string})=>section.title==='Medications');
 for(const key of ['medication_entries','prior_psychiatric_medications']){
  const field=medication.fields.find((item:{key:string})=>item.key===key);
  expect(field?.reported).toBe(true);
  expect(field?.sourceOnly).toBe(true);
  expect(field?.value).toContain('protected source');
 }
});


test('malformed BPS review JSON and unexpected save failures never echo confidential clinical payloads',async()=>{
 const privateValue='PRIVATE_FICTIONAL_CLINICAL_STATEMENT_NOT_FOR_RESPONSE';
 const malformed=new Request('https://www.indiancreekpsych.com/api/emr/bps-intake',{
  method:'POST',headers:{Origin:'https://www.indiancreekpsych.com','Content-Type':'application/json'},
  body:'{"patientId":"'+patient+'","notes":{"presenting":"'+privateValue+'"},BROKEN}'
 });
 const invalid=await POST(malformed);
 expect(invalid.status).toBe(400);
 expect(invalid.headers.get('Cache-Control')).toContain('no-store');
 expect(JSON.stringify(await invalid.json())).not.toContain(privateValue);
 expect(m.rpc).not.toHaveBeenCalled();
 m.rpc.mockRejectedValueOnce(new Error('PRIVATE_FICTIONAL_DATABASE_SECRET'));
 const failure=await POST(submit(payload));
 expect(failure.status).toBe(503);
 expect(failure.headers.get('Cache-Control')).toContain('no-store');
 expect(JSON.stringify(await failure.json())).not.toContain('PRIVATE_FICTIONAL_DATABASE_SECRET');
});

test('protected BPS read exceptions never reflect internal clinical data in HTTP responses',async()=>{
 const confidential='PRIVATE_FICTIONAL_PATIENT_INFORMATION_FROM_BACKEND_ERROR';
 m.from.mockImplementationOnce(()=>{throw new Error(confidential);});
 const response=await GET(request());
 expect(response.status).toBe(503);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 const wire=JSON.stringify(await response.json());
 expect(wire).not.toContain(confidential);
 expect(wire).not.toContain('stack');
});
