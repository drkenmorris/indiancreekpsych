import {beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/emr/bps-intake/route';
import {bpsSnapshotClinicalKeys} from '@/lib/emr/intake-bps';
const m=vi.hoisted(()=>({access:vi.fn(),sameOrigin:vi.fn(),from:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({emrAccess:m.access,sameOrigin:m.sameOrigin,privateHeaders:{'Cache-Control':'private, no-store'}}));
const patient='00000000-0000-0000-0000-000000000123',account='00000000-0000-0000-0000-000000000124';
const stamp='2026-11-10T09:00:00Z';
const request=()=>new Request('https://www.indiancreekpsych.com/api/emr/bps-intake?patient='+patient);
const submit=(details:Record<string,unknown>)=>new Request('https://www.indiancreekpsych.com/api/emr/bps-intake',{method:'POST',headers:{Origin:'https://www.indiancreekpsych.com'},
 body:JSON.stringify(details)});
const payload={patientId:patient,sourceAccountId:account,sourceVersion:2,sourceStatus:'submitted',sourceUpdatedAt:stamp,sourceSubmittedAt:stamp,reviewed:true,notes:{presenting:'Reported changes'}};
let linked:string|null;
let directoryDeletedAt:string|null;
let returnedPatientId:string;
let returnedIntakeAccountId:string;
let reviewRows:Record<string,unknown>[];
let postReadbackOverride:Record<string,unknown>|null|undefined;
let postReadbackError:boolean;
let postReadbackThrows:boolean;
let historyResultOverride:unknown;
let version:number;
let intakeStatus:string;
let intakeUpdatedAt:string;
let intakeSubmittedAt:string|null;
let data:Record<string,string>;
beforeEach(()=>{
 vi.clearAllMocks();linked=account;directoryDeletedAt=null;returnedPatientId=patient;returnedIntakeAccountId=account;version=2;intakeStatus='submitted';intakeUpdatedAt=stamp;intakeSubmittedAt=stamp;reviewRows=[];historyResultOverride=undefined;postReadbackOverride=undefined;postReadbackError=false;postReadbackThrows=false;
 data={counseling_reason:'Reports sadness',suicidal_thoughts_current:'Yes',roi_authorize:'Yes',medication_entries:'structured original'};
 m.sameOrigin.mockReturnValue(true);m.rpc.mockResolvedValue({data:'00000000-0000-0000-0000-000000000500',error:null});
 m.from.mockImplementation((table:string)=>{
  if(table==='clinical_patients'){const q={select:()=>q,eq:vi.fn(()=>q),is:vi.fn(()=>q),maybeSingle:async()=>({data:{id:returnedPatientId,account_id:linked,directory_deleted_at:directoryDeletedAt},error:null})};return q;}
  if(table==='patient_intakes'){const q={select:()=>q,eq:vi.fn(()=>q),maybeSingle:async()=>({data:{patient_id:returnedIntakeAccountId,answers:data,status:intakeStatus,version,updated_at:intakeUpdatedAt,submitted_at:intakeSubmittedAt},error:null})};return q;}
  if(table==='emr_bps_intake_reviews'){const q={select:()=>q,eq:vi.fn(()=>q),order:()=>q,
    range:vi.fn(async(start:number,end:number)=>({data:historyResultOverride===undefined?
      reviewRows.slice(start,end+1):typeof historyResultOverride==='function'?
      historyResultOverride(start,end):historyResultOverride,count:reviewRows.length,error:null})),
    maybeSingle:async()=>{
     if(postReadbackThrows)throw Error('FICTIONAL_PRIVATE_DB_PROVIDER_ERROR');
     const payload=m.rpc.mock.calls.at(-1)?.[1]?.p_payload as Record<string,any>|undefined;
     const source=payload?.source_answers as Record<string,string>|undefined;
     const projected=Object.fromEntries(Object.entries(source??{}).filter(([key,value])=>
      bpsSnapshotClinicalKeys.has(key)&&typeof value==='string'&&value.replace(/^ +| +$/g,'')!==''));
     const row=payload?{
      id:'00000000-0000-0000-0000-000000000500',patient_id:payload.patient_id,
      source_account_id:payload.source_account_id,source_version:payload.source_version,
      source_status:payload.source_status,source_updated_at:payload.source_updated_at,
      clinical_answers:projected,clinician_notes:payload.clinician_notes,
      reviewed:true,created_at:stamp
     }:null;
     return {data:postReadbackOverride===undefined?row:postReadbackOverride,
      error:postReadbackError?{code:'PGRST_MOCK'}:null};
    }};return q;}
  throw Error('Unexpected '+table);
 });
 m.access.mockResolvedValue({supabase:{from:m.from,rpc:m.rpc}});
});
test('blank or whitespace-only clinician notes cannot falsely attest a completed BPS review',async()=>{
 for(const notes of [{},{presenting:''},{presenting:'   ',safety:'\n\t'},{goals:'\u2003'},{presenting:'\u200B\u2060\u200E'},{limitations:'\u202E\u2066\u2069'},
  {presenting:' \u00AD\u034F\u061C\u180E\uFEFF\n'},{goals:'\u{E0100}\u{E01EF} \n'},
  {presenting:'\u0001\u001F\u007F'},{goals:'\u0085\u009F\u0002'}]){
  const result=await POST(submit({...payload,notes}));
  expect(result.status).toBe(400);
  expect(result.headers.get('Cache-Control')).toContain('no-store');
  expect(JSON.stringify(await result.json())).not.toContain('source_account_id');
 }
 expect(m.rpc).not.toHaveBeenCalled();
 const observed=await POST(submit({...payload,notes:{limitations:'Reviewed context; requires fictional follow-up.'}}));
 expect(observed.status).toBe(201);
 expect(m.rpc).toHaveBeenCalledTimes(1);
 expect(m.rpc.mock.calls[0][1].p_payload.clinician_notes.limitations).toBe('Reviewed context; requires fictional follow-up.');
 expect(m.rpc.mock.calls[0][1].p_payload.source_submitted_at).toBe(stamp);
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
 // A draft with a final-submission receipt has contradictory provenance.
 // Neither its patient statements nor clinician history can be released.
 intakeStatus='draft';intakeSubmittedAt=stamp;
 m.from.mockClear();
 response=await GET(request());
 expect(response.status).toBe(409);
 expect(JSON.stringify(await response.json())).not.toContain(protectedSource);
 expect(m.from).not.toHaveBeenCalledWith('emr_bps_intake_reviews');
 intakeSubmittedAt=null;
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

test('submitted BPS source edited after its attestation cannot be disclosed as immutable or reviewed',async()=>{
 data={counseling_reason:'PRIVATE_FICTIONAL_POST_SUBMISSION_EDIT'};
 intakeStatus='submitted';intakeUpdatedAt='2026-11-10T09:00:01Z';intakeSubmittedAt=stamp;
 const rejected=await GET(request());
 expect(rejected.status).toBe(409);
 expect(rejected.headers.get('Cache-Control')).toContain('no-store');
 expect(JSON.stringify(await rejected.json())).not.toContain('PRIVATE_FICTIONAL_POST_SUBMISSION_EDIT');
 expect(m.from).not.toHaveBeenCalledWith('emr_bps_intake_reviews');
 // Matching instants with different timezone offsets are valid receipts.
 intakeUpdatedAt='2026-11-10T03:00:00-06:00';
 const equalInstant=await GET(request());expect(equalInstant.status).toBe(200);
 // A source update followed by a later attestation is also valid.
 intakeUpdatedAt=stamp;intakeSubmittedAt='2026-11-10T09:01:00Z';
 const submittedLater=await GET(request());expect(submittedLater.status).toBe(200);
});

test('a post-attestation BPS edit one microsecond later is never exposed through the protected API',async()=>{
 const patientReport='PRIVATE_FICTIONAL_HIGH_PRECISION_SOURCE';
 data={counseling_reason:patientReport};
 intakeStatus='submitted';
 intakeUpdatedAt='2026-11-10T09:00:00.000001Z';
 intakeSubmittedAt='2026-11-10T09:00:00.000000Z';
 let response=await GET(request());
 expect(response.status).toBe(409);
 expect(JSON.stringify(await response.json())).not.toContain(patientReport);
 expect(m.from).not.toHaveBeenCalledWith('emr_bps_intake_reviews');
 // The same instant may be expressed using another timezone offset.
 intakeSubmittedAt='2026-11-10T03:00:00.000001-06:00';
 response=await GET(request());
 expect(response.status).toBe(200);
 const verified=await response.json();
 expect(verified.source.updatedAt).toBe(intakeUpdatedAt);
 expect(verified.source.submittedAt).toBe(intakeSubmittedAt);
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

test('unrecognized explicit questionnaire packet never falls back to legacy BPS and leaks protected source',async()=>{
 data={counseling_reason:'PRIVATE_FICTIONAL_CLINICAL_SOURCE',legal_packet_version:'2026-12-unknown-packet'};
 const response=await GET(request());
 expect(response.status).toBe(409);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 const wire=JSON.stringify(await response.json());
 expect(wire).not.toContain('PRIVATE_FICTIONAL_CLINICAL_SOURCE');
 expect(wire).not.toContain('sections');
 expect(m.from).not.toHaveBeenCalledWith('emr_bps_intake_reviews');
 for(const packet of ['2026-10-11','2026-11-02-directory-1']){
  data.legal_packet_version=packet;
  expect((await GET(request())).status).toBe(200);
 }
});
test('protected BPS source preserves exact questionnaire layout provenance independently from intake revision',async()=>{
 for(const [marker,expected] of [
  ['2026-10-11','2026-10-11'],
  ['2026-11-02-directory-1','2026-11-02-directory-1'],
  ['',null]
 ] as const){
  data.legal_packet_version=marker;
  const response=await GET(request());
  expect(response.status).toBe(200);
  const body=await response.json();
  expect(body.source.version).toBe(2);
  expect(body.source.questionnairePacketVersion).toBe(expected);
 }
 delete data.legal_packet_version;
 const legacy=await GET(request());
 expect(legacy.status).toBe(200);
 expect((await legacy.json()).source.questionnairePacketVersion).toBeNull();
});
test('21-section review distinguishes risk, legal references and structured reconciliation',async()=>{
 const response=await GET(request());expect(response.status).toBe(200);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 const body=await response.json();expect(body.sections).toHaveLength(21);
 expect(body.source).toEqual({accountId:account,version:2,status:'submitted',updatedAt:stamp,submittedAt:stamp,questionnairePacketVersion:null});
 expect(body.sections.find((s:any)=>s.title==='Safety and risk screening').fields.find((f:any)=>f.key==='suicidal_thoughts_current').value).toBe('Yes');
 expect(body.sections.find((s:any)=>s.title==='Authorization to share health information').disposition).toBe('reference');
 expect(body.sections.find((s:any)=>s.title==='Medications').disposition).toBe('separate-review');
});
test('PHI-minimized BPS summary verifies linked source without returning questionnaire, notes, accounts or history',async()=>{
 data.counseling_reason='FICTIONAL_PRIVATE_SOURCE_787';
 data.medication_entries='FICTIONAL_PRIVATE_MEDICATION_788';
 const response=await GET(new Request(request().url+'&summary=1'));
 expect(response.status).toBe(200);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 const body=await response.json();
 expect(body).toEqual({patientId:patient,source:{
  status:'submitted',version:2,updatedAt:stamp,submittedAt:stamp,questionnairePacketVersion:null
 },currentVersionReviewed:false});
 const serialized=JSON.stringify(body);
 expect(serialized).not.toContain('FICTIONAL_PRIVATE_SOURCE_787');
 expect(serialized).not.toContain('FICTIONAL_PRIVATE_MEDICATION_788');
 expect(serialized).not.toContain(account);
 expect(body).not.toHaveProperty('sections');
 expect(body).not.toHaveProperty('reviews');
 expect(body).not.toHaveProperty('unmappedKeys');
});

test('BPS summary records current reviewed attestation only for the same patient source revision',async()=>{
 reviewRows=[{id:'00000000-0000-0000-0000-000000000609',patient_id:patient,source_account_id:account,
  source_version:2,source_status:'submitted',source_updated_at:stamp,created_at:stamp,
  reviewed:true,clinical_answers:{counseling_reason:'Reports sadness',suicidal_thoughts_current:'Yes'},
  clinician_notes:{presenting:'PRIVATE_FICTIONAL_CLINICIAN_790'}}];
 const url=new Request(request().url+'&summary=1');
 let response=await GET(url);
 expect(response.status).toBe(200);
 expect((await response.json()).currentVersionReviewed).toBe(true);
 expect(JSON.stringify(await (await GET(url)).json())).not.toContain('PRIVATE_FICTIONAL_CLINICIAN_790');
 // Legacy reviewed=true rows can predate mandatory independent clinician notes.
 // The original seven-page BPS indicator must not certify checkbox-only history.
 for(const clinician_notes of [{},{presenting:'   '},{presenting:'\u200B\u2060'},
  {unapproved:'FICTIONAL_PRIVATE_PROTECTED_NOTE'}]){
  reviewRows=[{...reviewRows[0],reviewed:true,clinician_notes}];
  const historical=await GET(url);
  expect(historical.status).toBe(200);
  expect((await historical.json()).currentVersionReviewed).toBe(false);
 }
 // A legible approved note does NOT make an otherwise malformed or
 // unapproved historical note record a fully verified clinical review.
 reviewRows=[{...reviewRows[0],reviewed:true,clinician_notes:{
  presenting:'FICTIONAL_LEGIBLE_CLINICIAN_NOTE',
  unapproved:'FICTIONAL_PROTECTED_WITHHELD_NOTE'
 }}];
 const partial=await GET(url);
 expect(partial.status).toBe(200);
 expect((await partial.json()).currentVersionReviewed).toBe(false);
 reviewRows=[{...reviewRows[0],reviewed:false}];
 response=await GET(url);
 expect(response.status).toBe(200);
 expect((await response.json()).currentVersionReviewed).toBe(false);
 reviewRows=[];
 intakeStatus='draft';intakeSubmittedAt=null;
 response=await GET(url);
 expect(response.status).toBe(200);
 const draft=await response.json();
 expect(draft.source.status).toBe('draft');
 expect(draft.source.submittedAt).toBeNull();
 expect(draft.currentVersionReviewed).toBe(false);
});

test('malformed persisted clinician-note Unicode is withheld and cannot certify the original seven-page BPS',async()=>{
 const base={
  id:'00000000-0000-0000-0000-000000000691',
  patient_id:patient,source_account_id:account,source_version:2,
  source_status:'submitted',source_updated_at:stamp,created_at:stamp,
  reviewed:true,
  clinical_answers:{counseling_reason:'Reports sadness',suicidal_thoughts_current:'Yes'}
 };
 for(const invalidCharacter of [String.fromCharCode(0),String.fromCharCode(0xD800),String.fromCharCode(0xDC00)]){
  const corrupted='FICTIONAL_PRIVATE_CORRUPT_NOTE'+invalidCharacter;
  reviewRows=[{...base,clinician_notes:{
   presenting:corrupted,safety:'Independent fictional safety observation'
  }}];
  const summary=await GET(new Request(request().url+'&summary=1'));
  expect(summary.status).toBe(200);
  expect((await summary.json()).currentVersionReviewed).toBe(false);
  const history=await GET(request());
  expect(history.status).toBe(200);
  const result=await history.json();
  expect(result.reviews).toHaveLength(1);
  expect(result.reviews[0].reviewed).toBe(true);
  expect(result.reviews[0].current_source_snapshot_verified).toBe(true);
  expect(result.reviews[0].excluded_clinician_notes).toBe(1);
  expect(result.reviews[0].clinician_notes.presenting).toBe('');
  expect(result.reviews[0].clinician_notes.safety).toBe('Independent fictional safety observation');
  expect(JSON.stringify(result)).not.toContain('FICTIONAL_PRIVATE_CORRUPT_NOTE');
  const post=await POST(submit({...payload,notes:{presenting:corrupted}}));
  expect(post.status).toBe(400);
  expect(m.rpc).not.toHaveBeenCalled();
 }
 // Well-formed supplementary characters remain valid clinical text.
 const allowed=await POST(submit({...payload,notes:{presenting:'Fictional clinician review 🩺'}}));
 expect(allowed.status).toBe(201);
 expect(m.rpc).toHaveBeenCalledTimes(1);
});

test('a documented provisional draft review cannot clear the original seven-page BPS as a submitted reviewed intake',async()=>{
 // This is a genuine draft source with no patient submission receipt; a
 // clinician may have entered an independent preliminary note, but that is
 // not evidence that the patient submitted and completed their intake.
 intakeStatus='draft';intakeSubmittedAt=null;
 reviewRows=[{
  id:'00000000-0000-0000-0000-000000000650',
  patient_id:patient,source_account_id:account,source_version:version,
  source_status:'draft',source_updated_at:stamp,created_at:stamp,
  reviewed:true,
  clinical_answers:{counseling_reason:'Reports sadness',suicidal_thoughts_current:'Yes'},
  clinician_notes:{presenting:'FICTIONAL DRAFT CLINICIAN OBSERVATION'}
 }];
 const summary=await GET(new Request(request().url+'&summary=1'));
 expect(summary.status).toBe(200);
 const state=await summary.json();
 expect(state.source.status).toBe('draft');
 expect(state.source.submittedAt).toBeNull();
 expect(state.currentVersionReviewed).toBe(false);
 expect(JSON.stringify(state)).not.toContain('FICTIONAL DRAFT CLINICIAN OBSERVATION');
 const history=await GET(request());
 expect(history.status).toBe(200);
 const record=await history.json();
 expect(record.reviews).toHaveLength(1);
 expect(record.reviews[0].source_status).toBe('draft');
 // The provisional record remains append-only and accessible, without being
 // mislabeled as a patient-submitted final BPS review.
 expect(record.reviews[0].current_source_snapshot_verified).toBe(true);
});

test('original BPS reviewed badge rejects altered, omitted and protected history fields',async()=>{
 const baseline={
  id:'00000000-0000-0000-0000-000000000611',
  patient_id:patient,source_account_id:account,source_version:2,
  source_status:'submitted',source_updated_at:stamp,created_at:stamp,
  reviewed:true,
  clinical_answers:{counseling_reason:'Reports sadness',suicidal_thoughts_current:'Yes'},
  clinician_notes:{presenting:'Fictional independently documented clinical context'}
 };
 const url=new Request(request().url+'&summary=1');
 reviewRows=[baseline];
 expect((await (await GET(url)).json()).currentVersionReviewed).toBe(true);
 // A source answer can be appended out of band while version, status and edit
 // receipt remain unchanged. Unknown reported information must not be omitted
 // from the seven original BPS pages' independently reviewed badge.
 data.unrecognized_patient_report='PRIVATE_FICTIONAL_UNMAPPED_CLINICAL_REPORT';
 const unknownReport=await GET(url);
 expect(unknownReport.status).toBe(200);
 expect((await unknownReport.json()).currentVersionReviewed).toBe(false);
 expect(JSON.stringify(await (await GET(url)).json())).not.toContain('PRIVATE_FICTIONAL_UNMAPPED_CLINICAL_REPORT');
 delete data.unrecognized_patient_report;
 expect((await (await GET(url)).json()).currentVersionReviewed).toBe(true);
 for(const clinical_answers of [
  {counseling_reason:'Reports sadness'},
  {counseling_reason:'Changed without source version',suicidal_thoughts_current:'Yes'},
  {counseling_reason:'Reports sadness',suicidal_thoughts_current:'Yes',
   medication_entries:'PRIVATE_FICTIONAL_MEDICATION_NOT_FOR_BPS'},
  {counseling_reason:'Reports sadness',suicidal_thoughts_current:34},
  null
 ]){
  reviewRows=[{...baseline,clinical_answers}];
  const response=await GET(url);
  expect(response.status).toBe(200);
  expect((await response.json()).currentVersionReviewed).toBe(false);
  expect(JSON.stringify(await (await GET(url)).json())).not.toContain('PRIVATE_FICTIONAL_MEDICATION_NOT_FOR_BPS');
 }
 // Stored free-text trauma is allowed in the immutable protected snapshot,
 // but is checked without being disclosed by the metadata-only summary.
 data.trauma_history='PRIVATE_FICTIONAL_STRUCTURED_TRAUMA_WORKFLOW';
 reviewRows=[{...baseline,clinical_answers:{...baseline.clinical_answers,
  trauma_history:'PRIVATE_FICTIONAL_STRUCTURED_TRAUMA_WORKFLOW'}}];
 const withTrauma=await GET(url);
 expect(withTrauma.status).toBe(200);
 expect((await withTrauma.json()).currentVersionReviewed).toBe(true);
 expect(JSON.stringify(await (await GET(url)).json())).not.toContain('PRIVATE_FICTIONAL_STRUCTURED_TRAUMA_WORKFLOW');
});

test('current clinician history verifies the complete clinical source, not merely the reviewed flag',async()=>{
 const base={
  id:'00000000-0000-0000-0000-000000000600',patient_id:patient,
  source_account_id:account,source_version:2,source_status:'submitted',
  source_updated_at:stamp,created_at:stamp,reviewed:true,
  clinician_notes:{presenting:'Independent fictional clinician observation'}
 };
 const matching={counseling_reason:'Reports sadness',suicidal_thoughts_current:'Yes'};
 const variants=[
  {name:'complete',answers:matching,verified:true},
  {name:'missing safety answer',answers:{counseling_reason:'Reports sadness'},verified:false},
  {name:'altered presenting answer',answers:{...matching,counseling_reason:'Forged report'},verified:false},
  {name:'extra unauthorized medication',answers:{...matching,medication_entries:'PRIVATE_FICTIONAL_MED'},verified:false}
 ];
 for(const variant of variants){
  reviewRows=[{...base,clinical_answers:variant.answers}];
  const result=await GET(request());
  expect(result.status,variant.name).toBe(200);
  const wire=await result.json();
  expect(wire.reviews[0].current_source_snapshot_verified,variant.name).toBe(variant.verified);
  expect(JSON.stringify(wire)).not.toContain('PRIVATE_FICTIONAL_MED');
 }
 // Even a byte-for-byte approved clinical projection cannot certify a packet
 // containing an additional unrecognized patient report.
 data={...data,extra_unmapped_clinical_report:'PRIVATE_FICTIONAL_UNMAPPED'};
 reviewRows=[{...base,clinical_answers:matching}];
 const unknown=await GET(request());
 expect(unknown.status).toBe(200);
 const unknownWire=await unknown.json();
 expect(unknownWire.reviews[0].current_source_snapshot_verified).toBe(false);
 expect(JSON.stringify(unknownWire)).not.toContain('PRIVATE_FICTIONAL_UNMAPPED');
 // Historical revisions remain in immutable history, but cannot be certified
 // by comparing their old clinical snapshot against today's intake answers.
 data={counseling_reason:'Reports sadness',suicidal_thoughts_current:'Yes',
  roi_authorize:'Yes',medication_entries:'structured original'};
 reviewRows=[{...base,source_version:1,source_status:'draft',clinical_answers:{}}];
 const historical=await GET(request());
 expect(historical.status).toBe(200);
 expect((await historical.json()).reviews[0].current_source_snapshot_verified).toBeNull();
});

test('BPS provenance summary is protected by the same authorization and patient isolation as the full review',async()=>{
 const summary=new Request(request().url+'&summary=1');
 m.access.mockResolvedValue(null);
 expect((await GET(summary)).status).toBe(403);
 m.access.mockResolvedValue({supabase:{from:m.from,rpc:m.rpc}});
 returnedIntakeAccountId='00000000-0000-0000-0000-000000000999';
 const blocked=await GET(summary);
 expect(blocked.status).toBe(409);
 expect(JSON.stringify(await blocked.json())).not.toContain('Reports sadness');
});

test('BPS review receipt stays unverified if the chart link, source, or final-submission attestation changes after the RPC',async()=>{
 const id='00000000-0000-0000-0000-000000000500';
 const otherAccount='00000000-0000-0000-0000-000000000994';
 const changes=[
  {name:'patient silently edits clinical answers without incrementing source version',
   change:()=>{data={...data,counseling_reason:'PRIVATE_FICTIONAL_CHANGED_AFTER_SAVE'};}},
  {name:'central chart relinked to another website account',
   change:()=>{linked=otherAccount;returnedIntakeAccountId=otherAccount;}},
  {name:'same-version patient submission receipt changes',
   change:()=>{intakeSubmittedAt='2026-11-10T09:00:01Z';}},
  {name:'newer patient intake revision',
   change:()=>{version=3;}},
  {name:'source reverts to a draft',
   change:()=>{intakeStatus='draft';intakeSubmittedAt=null;}}
 ];
 for(const scenario of changes){
  linked=account;returnedIntakeAccountId=account;version=2;
  intakeStatus='submitted';intakeUpdatedAt=stamp;intakeSubmittedAt=stamp;
  data={counseling_reason:'Reports sadness',suicidal_thoughts_current:'Yes',
   roi_authorize:'Yes',medication_entries:'structured original'};
  m.rpc.mockImplementationOnce(async()=>{scenario.change();return {data:id,error:null};});
  const response=await POST(submit(payload));
  expect(response.status,scenario.name).toBe(503);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  const wire=JSON.stringify(await response.json());
  expect(wire,scenario.name).toContain('could not be independently verified');
  expect(wire).not.toContain('"saved":true');
  expect(wire).not.toContain('PRIVATE_FICTIONAL_CHANGED_AFTER_SAVE');
 }
});

test('equivalent timezone representations on a rechecked BPS source do not invalidate its saved review',async()=>{
 m.rpc.mockImplementationOnce(async()=>{
  intakeUpdatedAt='2026-11-10T03:00:00-06:00';
  intakeSubmittedAt='2026-11-10T03:00:00-06:00';
  return {data:'00000000-0000-0000-0000-000000000500',error:null};
 });
 const response=await POST(submit(payload));
 expect(response.status).toBe(201);
 expect((await response.json()).saved).toBe(true);
});

test('BPS POST reports no verified save when durable readback is missing, mismatched or unavailable',async()=>{
 const id='00000000-0000-0000-0000-000000000500';
 const verified={
  id,patient_id:patient,source_account_id:account,
  source_version:2,source_status:'submitted',source_updated_at:stamp,
  created_at:stamp,reviewed:true,
  clinical_answers:{counseling_reason:'Reports sadness',suicidal_thoughts_current:'Yes'},
  clinician_notes:{presenting:'Reported changes',treatment:'',medical:'',safety:'',family:'',goals:'',limitations:''}
 };
 const scenarios=[
  {name:'missing persisted row',row:null},
  {name:'incorrect saved review ID',row:{...verified,id:'00000000-0000-0000-0000-000000000501'}},
  {name:'cross-patient row',row:{...verified,patient_id:'00000000-0000-0000-0000-000000000501'}},
  {name:'different account',row:{...verified,source_account_id:'00000000-0000-0000-0000-000000000501'}},
  {name:'stale revision',row:{...verified,source_version:1}},
  {name:'unattested review',row:{...verified,reviewed:false}},
  {name:'changed source timestamp',row:{...verified,source_updated_at:'2026-11-10T09:00:01Z'}},
  {name:'review predates patient submission',row:{...verified,created_at:'2026-11-09T09:00:00Z'}},
  {name:'omitted patient answer',row:{...verified,clinical_answers:{counseling_reason:'Reports sadness'}}},
  {name:'extra restricted patient field',row:{...verified,clinical_answers:{...verified.clinical_answers,roi_authorize:'SECRET_FICTIONAL_LEGAL'}}},
  {name:'altered clinician observation',row:{...verified,clinician_notes:{...verified.clinician_notes,presenting:'UNVERIFIED_FICTIONAL_NOTE'}}},
  {name:'missing clinician note domain',row:{...verified,clinician_notes:{presenting:'Reported changes'}}}
 ];
 for(const scenario of scenarios){
  postReadbackOverride=scenario.row;
  const response=await POST(submit(payload));
  expect(response.status).toBe(503);
  const body=await response.json();
  expect(body.saved).not.toBe(true);
  expect(body.error).toMatch(/could not be independently verified/);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(JSON.stringify(body)).not.toContain('SECRET_FICTIONAL_LEGAL');
  expect(JSON.stringify(body)).not.toContain('UNVERIFIED_FICTIONAL_NOTE');
 }
 postReadbackOverride=undefined;
 postReadbackError=true;
 const errored=await POST(submit(payload));
 expect(errored.status).toBe(503);
 expect((await errored.json()).saved).not.toBe(true);
 postReadbackError=false;
 postReadbackThrows=true;
 const thrown=await POST(submit(payload));
 expect(thrown.status).toBe(503);
 expect(JSON.stringify(await thrown.json())).not.toContain('FICTIONAL_PRIVATE_DB_PROVIDER_ERROR');
});

test('save accepts only explicit reviewed provenance and clinician notes, never client-fabricated fields',async()=>{
 const response=await POST(submit({...payload,clinical_answers:{forged:'diagnosis'},signature:'FAKE',billing:{charge:500}}));
 expect(response.status).toBe(201);
 expect(await response.json()).toEqual({id:'00000000-0000-0000-0000-000000000500',saved:true,unsigned:true,diagnosisCreated:false});
 expect(m.rpc).toHaveBeenCalledWith('save_emr_bps_intake_review',{p_payload:{
  patient_id:patient,source_account_id:account,source_version:2,source_status:'submitted',source_updated_at:stamp,source_submitted_at:stamp,
  source_answers:data,
  reviewed:true,clinician_notes:{presenting:'Reported changes',treatment:'',medical:'',safety:'',family:'',goals:'',limitations:''}}});
});

test('BPS clinical save requires the exact patient submission receipt, including draft null and equivalent timezones',async()=>{
 for(const receipt of [undefined,null,'not-a-timestamp','2026-02-30T09:00:00Z']){
  const response=await POST(submit({...payload,sourceSubmittedAt:receipt}));
  expect(response.status).toBe(400);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
 }
 expect(m.rpc).not.toHaveBeenCalled();
 // Submitted-at changes can occur without a source-version or updated-at change.
 intakeSubmittedAt='2026-11-10T09:05:00Z';
 const altered=await POST(submit(payload));
 expect(altered.status).toBe(409);
 expect(m.rpc).not.toHaveBeenCalled();
 expect(JSON.stringify(await altered.json())).not.toContain('Reported changes');
 intakeSubmittedAt=stamp;
 const mismatched=await POST(submit({...payload,sourceSubmittedAt:'2026-11-10T09:00:01Z'}));
 expect(mismatched.status).toBe(409);
 expect(m.rpc).not.toHaveBeenCalled();
 const equivalent=await POST(submit({...payload,sourceSubmittedAt:'2026-11-10T03:00:00-06:00'}));
 expect(equivalent.status).toBe(201);
 expect(m.rpc).toHaveBeenCalledTimes(1);
 intakeStatus='draft';intakeSubmittedAt=null;
 const invalidDraft=await POST(submit({...payload,sourceStatus:'draft',sourceSubmittedAt:stamp}));
 expect(invalidDraft.status).toBe(400);
 const allowedDraft=await POST(submit({...payload,sourceStatus:'draft',sourceSubmittedAt:null}));
 expect(allowedDraft.status).toBe(201);
 expect(m.rpc).toHaveBeenCalledTimes(2);
});

test('invalid identity, review, timestamps, source version or arbitrary note keys cannot reach save RPC',async()=>{
 for(const bad of [{...payload,reviewed:false},{...payload,patientId:'wrong'},{...payload,sourceAccountId:null},{...payload,sourceVersion:-1},{...payload,sourceVersion:Number.MAX_SAFE_INTEGER+1},
  {...payload,sourceUpdatedAt:'invalid'}, {...payload,sourceUpdatedAt:'2026-02-30T09:00:00Z'},
   {...payload,sourceUpdatedAt:'2026-11-10'}, {...payload,sourceUpdatedAt:'1'}, {...payload,notes:{diagnosis:'fabricated'}},
  {...payload,notes:{safety:'x'.repeat(4001)}}, {...payload,notes:null}]){
  expect((await POST(submit(bad))).status).toBe(400);
 }expect(m.rpc).not.toHaveBeenCalled();
});
test('BPS review rejects NUL and unpaired UTF-16 surrogates without invoking clinical save',async()=>{
 const invalidNotes=['Fictional\u0000NUL', 'Fictional\uD800high-surrogate', 'Fictional\uDC00low-surrogate'];
 for(const note of invalidNotes){
  const response=await POST(submit({...payload,notes:{presenting:note}}));
  expect(response.status).toBe(400);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(JSON.stringify(await response.json())).not.toContain(note);
 }
 expect(m.rpc).not.toHaveBeenCalled();
 // A real surrogate pair, combining accent and multilingual text are valid.
 const faithful='Fictional observation 🤝 cafe\u0301 日本語';
 const response=await POST(submit({...payload,notes:{presenting:faithful}}));
 expect(response.status).toBe(201);
 expect(m.rpc).toHaveBeenCalledTimes(1);
 expect(m.rpc.mock.calls[0][1].p_payload.clinician_notes.presenting).toBe(faithful);
});
test('clinician BPS notes preserve exact whitespace and reject explicitly null domains',async()=>{
 const original='  Fictional clinical observation 🧪\\n  exact second line  ' .replace('\\n','\n');
 const saved=await POST(submit({...payload,notes:{presenting:original}}));
 expect(saved.status).toBe(201);
 expect(m.rpc).toHaveBeenCalledTimes(1);
 expect(m.rpc.mock.calls[0][1].p_payload.clinician_notes.presenting).toBe(original);
 // An omitted optional note is an intentional empty field, not a null data loss.
 expect(m.rpc.mock.calls[0][1].p_payload.clinician_notes.safety).toBe('');
 m.rpc.mockClear();
 const rejected=await POST(submit({...payload,notes:{presenting:original,safety:null}}));
 expect(rejected.status).toBe(400);
 expect(rejected.headers.get('Cache-Control')).toContain('no-store');
 expect(m.rpc).not.toHaveBeenCalled();
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
   trauma_history_checklist:'Do not disclose structured trauma',
   trauma_history:'Do not disclose free-text trauma narrative',roi_signature:'Do not disclose signature',
   insurance_member:'Do not disclose policy'
 }}];
 const filtered=await GET(request());expect(filtered.status).toBe(200);
 const safe=(await filtered.json()).reviews[0];
 expect(safe.clinical_answers).toEqual({counseling_reason:'Patient-reported history'});
 expect(safe.excluded_clinical_fields).toBe(5);
 expect(JSON.stringify(safe)).not.toContain('Do not disclose');
 const reviewQuery=m.from.mock.results.find((r:any)=>r.value?.range)?.value;
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
  {...row,source_version:3}, // future compared with current intake version 2
  {...row,source_status:'draft'}, // same-version patient attestation no longer matches
  {...row,source_updated_at:'2026-11-10T08:59:59Z'}, // same-version silently rewritten source
  {...row,source_updated_at:'2026-11-10T09:00:00.000001Z',created_at:'2026-11-10T09:00:00.000002Z'},
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


test('explicit false historical attestation stays unreviewed, but missing or malformed attestation blocks the entire clinical response',async()=>{
  const confidential='PRIVATE_FICTIONAL_HISTORICAL_CLINICAL_STATEMENT';
  reviewRows=[{id:'00000000-0000-0000-0000-000000000600',patient_id:patient,source_account_id:account,
   source_version:2,source_status:'submitted',source_updated_at:stamp,created_at:stamp,
   reviewed:false,clinical_answers:{counseling_reason:confidential},clinician_notes:{}}];
  const response=await GET(request());expect(response.status).toBe(200);
  const payload=await response.json();expect(payload.reviews).toHaveLength(1);
  expect(payload.reviews[0].reviewed).toBe(false);
  for(const marker of [null,undefined,'false',1]){
   reviewRows=[{...reviewRows[0],reviewed:marker}];
   const invalid=await GET(request());expect(invalid.status).toBe(409);
   expect(invalid.headers.get('Cache-Control')).toContain('no-store');
   const body=JSON.stringify(await invalid.json());
   expect(body).not.toContain(confidential);
   expect(body).not.toContain('"reviews"');
  }
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

test('complete 221-row BPS history is retrieved in patient-scoped exact-count pages',async()=>{
  version=300;
  const confidential='PRIVATE_FICTIONAL_PAGED_HISTORY';
  reviewRows=Array.from({length:221},(_,index)=>({
   id:'00000000-0000-0000-0000-'+String(600+220-index).padStart(12,'0'),
   patient_id:patient,source_account_id:account,
   source_version:index+1,source_status:'draft',source_updated_at:stamp,created_at:stamp,
   reviewed:true,clinical_answers:{counseling_reason:confidential},clinician_notes:{presenting:'Fictional note'}
  }));
  const response=await GET(request());
  expect(response.status).toBe(200);
  const packet=await response.json();
  expect(packet.reviews).toHaveLength(221);
  expect(new Set(packet.reviews.map((row:any)=>row.id)).size).toBe(221);
  expect(packet.reviews.every((row:any)=>row.reviewed===true)).toBe(true);
  const queries=m.from.mock.results.filter((r:any)=>r.value?.range).map((r:any)=>r.value);
  expect(queries).toHaveLength(4);
  expect(queries[3].range).toHaveBeenCalledWith(0,0);
  expect(queries[0].range).toHaveBeenCalledWith(0,99);
  expect(queries[1].range).toHaveBeenCalledWith(100,199);
  expect(queries[2].range).toHaveBeenCalledWith(200,299);
  for(const q of queries){
   expect(q.eq).toHaveBeenCalledWith('patient_id',patient);
   expect(q.eq).toHaveBeenCalledWith('source_account_id',account);
  }
});

test.each(['concurrent-insert','head-replacement'])('review history altered after final page cannot be returned as complete (%s)',async(mode)=>{
 const confidential='PRIVATE_FICTIONAL_CONCURRENT_BPS_REPORT';
 data={counseling_reason:confidential};
 const original={id:'00000000-0000-0000-0000-000000000810',patient_id:patient,
  source_account_id:account,source_version:2,source_status:'submitted',
  source_updated_at:stamp,created_at:stamp,reviewed:true,
  clinical_answers:{counseling_reason:confidential},clinician_notes:{presenting:'PRIVATE_FICTIONAL_CLINICIAN_NOTE'}};
 reviewRows=[original];
 let queries=0;
 historyResultOverride=(start:number,end:number)=>{
  queries++;
  // The first page completed; another clinician changes chart history before
  // the final count/head verification, while the patient source stays intact.
  if(queries===2){
   const incoming={...original,id:'00000000-0000-0000-0000-000000000811',
    source_version:1,source_status:'draft',created_at:'2026-11-10T09:00:01Z'};
   if(mode==='concurrent-insert')reviewRows.unshift(incoming);
   else reviewRows=[incoming];
  }
  return reviewRows.slice(start,end+1);
 };
 const response=await GET(request());
 expect(queries).toBe(2);
 expect(response.status).toBe(409);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 const wire=JSON.stringify(await response.json());
 expect(wire).not.toContain(confidential);
 expect(wire).not.toContain('PRIVATE_FICTIONAL_CLINICIAN_NOTE');
 expect(wire).not.toContain('"reviews"');
});

test('out-of-order BPS history fails closed even when total count and review IDs look complete',async()=>{
  version=250;
  const confidential='PRIVATE_FICTIONAL_OUT_OF_ORDER_HISTORY';
  reviewRows=Array.from({length:201},(_,index)=>({
   id:'00000000-0000-0000-0000-'+String(1000-index).padStart(12,'0'),
   patient_id:patient,source_account_id:account,
   source_version:index+1,source_status:'draft',source_updated_at:stamp,
   created_at:stamp,reviewed:true,
   clinical_answers:{counseling_reason:confidential},clinician_notes:{presenting:'PRIVATE_FICTIONAL_NOTES'}
  }));
  // A second page can contain a newer review without changing the exact count.
  // Unique IDs and full-length pages alone would otherwise accept this history.
  reviewRows[100]={...reviewRows[100],created_at:'2026-11-10T09:00:00.000001Z'};
  const outOfOrder=await GET(request());
  expect(outOfOrder.status).toBe(409);
  expect(outOfOrder.headers.get('Cache-Control')).toContain('no-store');
  expect(JSON.stringify(await outOfOrder.json())).not.toContain(confidential);
  expect(JSON.stringify(await GET(request()).then(response=>response.json()))).not.toContain('PRIVATE_FICTIONAL_NOTES');
  // Equal timestamps must also use descending UUID order, not arbitrary row order.
  reviewRows[100]={...reviewRows[100],created_at:stamp};
  const swapped=reviewRows[99];
  reviewRows[99]=reviewRows[100];
  reviewRows[100]=swapped;
  const invalidTie=await GET(request());
  expect(invalidTie.status).toBe(409);
  expect(JSON.stringify(await invalidTie.json())).not.toContain(confidential);
});

test('history above 1,000 verified records is not partially disclosed or treated as complete',async()=>{
  version=1200;
  const confidential='PRIVATE_FICTIONAL_OVERFLOW_HISTORY';
  reviewRows=Array.from({length:1001},(_,index)=>({
   id:'00000000-0000-0000-0000-'+String(600+index).padStart(12,'0'),
   patient_id:patient,source_account_id:account,
   source_version:index+1,source_status:'draft',source_updated_at:stamp,created_at:stamp,
   reviewed:true,clinical_answers:{counseling_reason:confidential},clinician_notes:{}
  }));
  const response=await GET(request());
  expect(response.status).toBe(409);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(JSON.stringify(await response.json())).not.toContain(confidential);
  expect(m.from.mock.results.filter((r:any)=>r.value?.range)).toHaveLength(1);
});

test('duplicate review identities across pages fail closed without releasing historical PHI',async()=>{
  version=300;
  const confidential='PRIVATE_FICTIONAL_DUPLICATE_HISTORY';
  reviewRows=Array.from({length:201},(_,index)=>({
   id:'00000000-0000-0000-0000-'+String(600+index).padStart(12,'0'),
   patient_id:patient,source_account_id:account,
   source_version:index+1,source_status:'draft',source_updated_at:stamp,created_at:stamp,
   reviewed:true,clinical_answers:{counseling_reason:confidential},clinician_notes:{}
  }));
  historyResultOverride=(start:number,end:number)=>{
   const rows=reviewRows.slice(start,end+1);
   if(start===100)rows[0]=reviewRows[99];
   return rows;
  };
  const response=await GET(request());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain(confidential);
});

test('case-variant duplicate review IDs across pages are rejected before any clinical history is disclosed',async()=>{
 // A malformed/stale database adapter can return the same UUID in mixed case.
 // PostgreSQL normally canonicalizes UUIDs, but the protected API must still
 // reject duplicate logical identities rather than relying on string casing.
 version=200;
 const confidential='PRIVATE_FICTIONAL_CASE_VARIANT_DUPLICATE';
 reviewRows=Array.from({length:101},(_,index)=>({
  id:'abcdefab-cdef-abcd-efab-'+String(900-index).padStart(12,'0'),
  patient_id:patient,source_account_id:account,
  source_version:index+1,source_status:'draft',
  source_updated_at:'2026-11-10T08:00:00Z',
  created_at:new Date(Date.parse(stamp)-index*1000).toISOString(),
  reviewed:true,clinical_answers:{counseling_reason:confidential},
  clinician_notes:{presenting:'PRIVATE_FICTIONAL_CLINICIAN_NOTE'}
 }));
 reviewRows[100]={...reviewRows[100],id:String(reviewRows[0].id).toUpperCase()};
 const result=await GET(request());
 expect(result.status).toBe(409);
 expect(result.headers.get('Cache-Control')).toContain('no-store');
 const wire=JSON.stringify(await result.json());
 expect(wire).not.toContain(confidential);
 expect(wire).not.toContain('PRIVATE_FICTIONAL_CLINICIAN_NOTE');
 expect(m.from.mock.results.filter((r:any)=>r.value?.range)).toHaveLength(2);
});

test('partial review page is rejected when the exact count shows missing reviews',async()=>{
  version=300;
  const confidential='PRIVATE_FICTIONAL_TRUNCATED_HISTORY';
  reviewRows=Array.from({length:120},(_,index)=>({
   id:'00000000-0000-0000-0000-'+String(600+index).padStart(12,'0'),
   patient_id:patient,source_account_id:account,
   source_version:index+1,source_status:'draft',source_updated_at:stamp,created_at:stamp,
   reviewed:true,clinical_answers:{counseling_reason:confidential},clinician_notes:{}
  }));
  historyResultOverride=(start:number,end:number)=>reviewRows.slice(start,Math.min(end+1,start+50));
  const response=await GET(request());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain(confidential);
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


test('declared oversized BPS POST is rejected before parsing or invoking clinical save',async()=>{
 const sensitive='PRIVATE_FICTIONAL_CLINICAL_VALUE';
 const request=new Request('https://www.indiancreekpsych.com/api/emr/bps-intake',{
  method:'POST',headers:{Origin:'https://www.indiancreekpsych.com','Content-Length':'35001'},
  body:JSON.stringify({notes:{presenting:sensitive}})
 });
 const response=await POST(request);
 expect(response.status).toBe(413);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 expect(JSON.stringify(await response.json())).not.toContain(sensitive);
 expect(m.rpc).not.toHaveBeenCalled();
});

test('streamed BPS POST exceeding limit fails closed even with falsely small Content-Length',async()=>{
 const sensitive='PRIVATE_FICTIONAL_STREAMED_CLINICAL_VALUE';
 const bytes=new TextEncoder().encode(sensitive.repeat(1100));
 const stream=new ReadableStream<Uint8Array>({
  start(controller){
   controller.enqueue(bytes.subarray(0,18_000));
   controller.enqueue(bytes.subarray(18_000));
   controller.close();
  }
 });
 const request=new Request('https://www.indiancreekpsych.com/api/emr/bps-intake',{
  method:'POST',headers:{Origin:'https://www.indiancreekpsych.com','Content-Length':'1'},
  body:stream,duplex:'half'
 } as RequestInit & {duplex:'half'});
 const response=await POST(request);
 expect(response.status).toBe(413);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 expect(JSON.stringify(await response.json())).not.toContain(sensitive);
 expect(m.rpc).not.toHaveBeenCalled();
});

test('malformed UTF-8 cannot silently rewrite a fictional clinician note and return a success receipt',async()=>{
 const privateValue='PRIVATE_FICTIONAL_CLINICAL_NOTE_BYTES';
 const json=JSON.stringify({...payload,notes:{presenting:privateValue}});
 const bytes=new TextEncoder().encode(json);
 const offset=json.indexOf(privateValue);
 expect(offset).toBeGreaterThan(0);
 // The former Buffer.toString('utf8') quietly replaced this illegal byte with U+FFFD
 // and allowed a clinically altered note to be saved as if it were original.
 bytes[offset]=0xff;
 const request=new Request('https://www.indiancreekpsych.com/api/emr/bps-intake',{
  method:'POST',headers:{Origin:'https://www.indiancreekpsych.com','Content-Type':'application/json'},
  body:bytes
 });
 const response=await POST(request);
 expect(response.status).toBe(400);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 expect(JSON.stringify(await response.json())).not.toContain(privateValue);
 expect(m.rpc).not.toHaveBeenCalled();
});

test('valid split multibyte UTF-8 BPS clinical notes retain exact text and an authorized save receipt',async()=>{
 const text='Fictional café 🧪 follow-up note';
 const bytes=new TextEncoder().encode(JSON.stringify({...payload,notes:{presenting:text}}));
 const split=bytes.indexOf(0xc3);
 expect(split).toBeGreaterThan(0);
 const stream=new ReadableStream<Uint8Array>({
  start(controller){
   controller.enqueue(bytes.subarray(0,split+1));
   controller.enqueue(bytes.subarray(split+1));
   controller.close();
  }
 });
 const request=new Request('https://www.indiancreekpsych.com/api/emr/bps-intake',{
  method:'POST',headers:{Origin:'https://www.indiancreekpsych.com','Content-Type':'application/json'},
  body:stream,duplex:'half'
 } as RequestInit & {duplex:'half'});
 const response=await POST(request);
 expect(response.status).toBe(201);
 expect(m.rpc).toHaveBeenCalledWith('save_emr_bps_intake_review',{
  p_payload:expect.objectContaining({clinician_notes:expect.objectContaining({presenting:text})})
 });
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

test('protected BPS API withholds every unknown key identity, including schema-shaped fictional identifiers',async()=>{
 const malformedName='FICTIONAL_PATIENT 123-45-6789 confidential source';
 const shapedName='fictional_patient_jane_doe_birthdate_19800101';
 const shapedPolicy='insurance_member_fictional_policy_1234';
 data[malformedName]='A response was recorded';
 data[shapedName]='A response was recorded';
 data[shapedPolicy]='A response was recorded';
 const response=await GET(request());
 expect(response.status).toBe(200);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 const body=JSON.stringify(await response.json());
 for(const key of [malformedName,shapedName,shapedPolicy])expect(body).not.toContain(key);
 const parsed=JSON.parse(body);
 expect(parsed.unmappedKeys).toEqual(Array(3).fill('[unrecognized source field name withheld]'));
});

test('clinician review history cannot predate its source even by one microsecond',async()=>{
 const confidential='PRIVATE_FICTIONAL_REVIEW_SOURCE';
 data={counseling_reason:confidential};
 intakeUpdatedAt='2026-11-10T09:00:00.000001Z';
 intakeSubmittedAt='2026-11-10T09:00:00.000001Z';
 reviewRows=[{
  id:'00000000-0000-4000-8000-000000000850',
  patient_id:patient,source_account_id:account,source_version:2,source_status:'submitted',
  source_updated_at:intakeUpdatedAt,created_at:'2026-11-10T09:00:00.000000Z',
  reviewed:true,clinical_answers:{counseling_reason:confidential},clinician_notes:{presenting:'FICTIONAL_CLINICIAN_NOTE'}
 }];
 const invalid=await GET(request());
 expect(invalid.status).toBe(409);
 expect(invalid.headers.get('Cache-Control')).toContain('no-store');
 const responseText=JSON.stringify(await invalid.json());
 expect(responseText).not.toContain(confidential);
 expect(responseText).not.toContain('FICTIONAL_CLINICIAN_NOTE');
 // Same instant with another timezone offset is valid provenance.
 reviewRows[0].created_at='2026-11-10T03:00:00.000001-06:00';
 const valid=await GET(request());
 expect(valid.status).toBe(200);
 const source=await valid.json();
 expect(source.reviews[0].clinical_answers.counseling_reason).toBe(confidential);
});

test('a current submitted BPS review cannot predate patient attestation, even when its source revision is older',async()=>{
 const secret='PRIVATE_FICTIONAL_PREATTESTATION_HISTORY';
 data={counseling_reason:secret};
 intakeUpdatedAt='2026-11-10T09:00:00Z';
 intakeSubmittedAt='2026-11-10T09:10:00.000001Z';
 reviewRows=[{
  id:'00000000-0000-4000-8000-000000000891',
  patient_id:patient,source_account_id:account,source_version:2,source_status:'submitted',
  source_updated_at:intakeUpdatedAt,created_at:'2026-11-10T09:10:00.000000Z',
  reviewed:true,clinical_answers:{counseling_reason:secret},
  clinician_notes:{presenting:'PRIVATE_FICTIONAL_PREATTESTATION_CLINICIAN_NOTE'}
 }];
 const preAttestation=await GET(request());
 expect(preAttestation.status).toBe(409);
 expect(preAttestation.headers.get('Cache-Control')).toContain('no-store');
 expect(JSON.stringify(await preAttestation.json())).not.toContain(secret);
 expect(JSON.stringify(await GET(request()).then(result=>result.json()))).not.toContain('PRIVATE_FICTIONAL_PREATTESTATION_CLINICIAN_NOTE');
 // A different timezone that denotes precisely the attestation instant is valid.
 reviewRows[0].created_at='2026-11-10T03:10:00.000001-06:00';
 const attested=await GET(request());
 expect(attested.status).toBe(200);
 expect((await attested.json()).reviews[0].clinical_answers.counseling_reason).toBe(secret);
 // Earlier submitted intake versions use their own historical attestation, not
 // the CURRENT source's later submission time.
 reviewRows[0].source_version=1;
 reviewRows[0].source_updated_at='2026-11-10T08:00:00Z';
 reviewRows[0].created_at='2026-11-10T08:05:00Z';
 const priorVersion=await GET(request());
 expect(priorVersion.status).toBe(200);
 expect((await priorVersion.json()).reviews[0].source_version).toBe(1);
});


test('clinician BPS history API withholds unexpected database columns even when row identity and chronology are valid',async()=>{
 const privateMarker='PRIVATE_FICTIONAL_EXTRANEOUS_PATIENT_DATA';
 reviewRows=[{
  id:'00000000-0000-0000-0000-000000000600',
  patient_id:patient,source_account_id:account,source_version:2,
  source_status:'submitted',source_updated_at:stamp,created_at:stamp,reviewed:true,
  clinical_answers:{counseling_reason:'Fictional approved patient report'},
  clinician_notes:{presenting:'Independent fictional review'},
  // Simulate future schema columns or a stale/malformed database adapter.
  // They must NOT be reflected just because the row passed RLS and provenance.
  patient_name:privateMarker,insurance_member:privateMarker,
  extra_clinical_data:{private_note:privateMarker},internal_audit:privateMarker
 }];
 const response=await GET(request());
 expect(response.status).toBe(200);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 const body=await response.json();
 expect(body.reviews).toHaveLength(1);
 const review=body.reviews[0];
 expect(Object.keys(review).sort()).toEqual([
  'id','source_version','source_status','source_updated_at','created_at','reviewed',
  'clinical_answers','clinician_notes','current_source_snapshot_verified','excluded_clinical_fields','excluded_clinician_notes'
 ].sort());
 expect(review.clinical_answers.counseling_reason).toBe('Fictional approved patient report');
 expect(review.clinician_notes.presenting).toBe('Independent fictional review');
 expect(JSON.stringify(body)).not.toContain(privateMarker);
});

test('BPS history denies disclosure when a central chart is relinked while the history query completes',async()=>{
 const privateStatement='FICTIONAL_STALE_ACCOUNT_CLINICAL_STATEMENT';
 data={counseling_reason:privateStatement};
 let historyRead=false;
 historyResultOverride=()=>{
  historyRead=true;
  linked='00000000-0000-4000-8000-000000000991';
  return [];
 };
 const result=await GET(request());
 expect(historyRead).toBe(true);
 expect(result.status).toBe(409);
 expect(result.headers.get('Cache-Control')).toContain('no-store');
 expect(JSON.stringify(await result.json())).not.toContain(privateStatement);
});

test('BPS history denies disclosure if intake revision changes during the history query',async()=>{
 const privateStatement='FICTIONAL_STALE_VERSION_CLINICAL_STATEMENT';
 data={counseling_reason:privateStatement};
 let historyRead=false;
 historyResultOverride=()=>{
  historyRead=true;
  version=3;
  return [];
 };
 const result=await GET(request());
 expect(historyRead).toBe(true);
 expect(result.status).toBe(409);
 expect(result.headers.get('Cache-Control')).toContain('no-store');
 expect(JSON.stringify(await result.json())).not.toContain(privateStatement);
});

test('BPS history refuses a linked source whose answers change without version or timestamp movement',async()=>{
 const original='FICTIONAL_ORIGINAL_PRESENTING_CONCERN';
 const changed='FICTIONAL_CHANGED_PRESENTING_CONCERN';
 data={counseling_reason:original};
 let historyRead=false;
 historyResultOverride=()=>{
  historyRead=true;
  // Simulate an out-of-band or stale-adapter write that violates the expected
  // version/timestamp discipline while the clinician history is retrieved.
  data={counseling_reason:changed};
  return [];
 };
 const response=await GET(request());
 expect(historyRead).toBe(true);
 expect(response.status).toBe(409);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 const wire=JSON.stringify(await response.json());
 expect(wire).not.toContain(original);
 expect(wire).not.toContain(changed);
});

test('BPS history accepts the same source answers in a different object-key order',async()=>{
 data={counseling_reason:'Fictional concern',safety_plan:'Fictional plan'};
 historyResultOverride=()=>{
  data={safety_plan:'Fictional plan',counseling_reason:'Fictional concern'};
  return [];
 };
 const response=await GET(request());
 expect(response.status).toBe(200);
 expect((await response.json()).patientId).toBe(patient);
});

test('clinician BPS save rechecks the live linked source and blocks unmapped reported intake before the privileged RPC',async()=>{
 const confidential='PRIVATE_FICTIONAL_UNRECOGNIZED_SOURCE';
 data={...data,unmapped_patient_report:confidential};
 const unmapped=await POST(submit(payload));
 expect(unmapped.status).toBe(409);
 expect(JSON.stringify(await unmapped.json())).not.toContain(confidential);
 expect(m.rpc).not.toHaveBeenCalled();

 delete data.unmapped_patient_report;
 linked='00000000-0000-4000-8000-000000000999';
 const relinked=await POST(submit(payload));
 expect(relinked.status).toBe(409);
 expect(m.rpc).not.toHaveBeenCalled();

 linked=account;version=3;
 const revised=await POST(submit(payload));
 expect(revised.status).toBe(409);
 expect(m.rpc).not.toHaveBeenCalled();

 version=2;intakeUpdatedAt='2026-11-10T09:00:01Z';intakeSubmittedAt=intakeUpdatedAt;
 const edited=await POST(submit(payload));
 expect(edited.status).toBe(409);
 expect(m.rpc).not.toHaveBeenCalled();

 intakeUpdatedAt=stamp;intakeSubmittedAt=stamp;
 const accepted=await POST(submit(payload));
 expect(accepted.status).toBe(201);
 expect(m.rpc).toHaveBeenCalledTimes(1);
});

test('mixed-case UUID requests preserve exact linked-chart scope on GET and clinician save',async()=>{
 // PostgreSQL UUIDs identify the same row regardless of letter casing. The
 // protected API must neither reject a valid chart nor fall back to names.
 const chart='abcdefab-cdef-4abc-8def-abcdefabcdef';
 const websiteAccount='abcdefab-cdef-4abc-8def-abcdefabcdea';
 returnedPatientId=chart;
 linked=websiteAccount;
 returnedIntakeAccountId=websiteAccount;
 const url=new Request('https://www.indiancreekpsych.com/api/emr/bps-intake?patient='+chart.toUpperCase());
 const source=await GET(url);
 expect(source.status).toBe(200);
 const response=await source.json();
 expect(response.patientId).toBe(chart);
 expect(response.source.accountId).toBe(websiteAccount);
 expect(m.from.mock.results[0].value.eq).toHaveBeenCalledWith('id',chart);
 expect(m.from.mock.results[1].value.eq).toHaveBeenCalledWith('patient_id',websiteAccount);
 const saved=await POST(submit({...payload,patientId:chart.toUpperCase(),sourceAccountId:websiteAccount.toUpperCase()}));
 expect(saved.status).toBe(201);
 expect((await saved.json()).saved).toBe(true);
 expect(m.rpc).toHaveBeenCalledTimes(1);
 const rpcPayload=m.rpc.mock.calls[0][1].p_payload;
 expect(rpcPayload.patient_id).toBe(chart);
 expect(rpcPayload.source_account_id).toBe(websiteAccount);
 // Casing normalization cannot turn an unrelated returned chart into a match.
 returnedPatientId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 const wrongChart=await GET(url);
 expect(wrongChart.status).toBe(409);
 expect(JSON.stringify(await wrongChart.json())).not.toContain('Reports sadness');
 expect(m.rpc).toHaveBeenCalledTimes(1);
});
