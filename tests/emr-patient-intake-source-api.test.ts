import {beforeEach,expect,test,vi} from 'vitest';
import {GET,PATCH} from '@/app/api/emr/patients/route';

const mocks=vi.hoisted(()=>({access:vi.fn(),from:vi.fn(),sameOrigin:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({
  emrAccess:mocks.access,
  sameOrigin:mocks.sameOrigin,
  privateHeaders:{'Cache-Control':'private, no-store'},
}));

const patientId='00000000-0000-0000-0000-000000000401';
const accountId='00000000-0000-0000-0000-000000000402';
let account_id:string|null;
let intakeAnswers:Record<string,string>;
let returnedPatientId:string;
let returnedIntakeAccountId:string;
let returnedIntakeVersion:number;
let returnedIntakeStatus:string;
let returnedIntakeUpdatedAt:string;
let returnedIntakeSubmittedAt:string|null;
let returnedArchivedAt:string|null;
let verifiedPatientId:string;
let verifiedAccountId:string|null;
let verifiedArchivedAt:string|null;
let verifiedRevision:number;
const makeRequest=(id=patientId)=>new Request('https://www.indiancreekpsych.com/api/emr/patients?id='+id);

beforeEach(()=>{
  vi.clearAllMocks();
  mocks.sameOrigin.mockReturnValue(true);
  account_id=accountId;
  returnedPatientId=patientId;
  returnedIntakeAccountId=accountId;
  returnedIntakeVersion=1;
  returnedIntakeStatus='submitted';
  returnedIntakeUpdatedAt='2026-11-09T00:00:00Z';
  returnedIntakeSubmittedAt='2026-11-09T00:00:00Z';
  returnedArchivedAt=null;
  verifiedPatientId=patientId;
  verifiedAccountId=accountId;
  verifiedArchivedAt=null;
  verifiedRevision=3;
  intakeAnswers={
    legal_packet_version:'2026-11-02-directory-1',
    full_name:'Fictional Patient',email:'fictional@example.invalid',
    medication_entries:'[{"medication":"Example"}]',
    medication_allergy_status:'Medication allergies reported',
    medication_allergy_notes:'Fictional reaction',
    medical_substance_history:'{"example":"patient report"}',
    treatment_history_entries:'[{"setting":"Outpatient","provider_facility":"Fictional practice"}]',
    roi_signature:'Fictional protected legal signature',
    trauma_history_checklist:'{"definition_version":"1.1.0","selections":{}}',
    trauma_history:'Fictional optional context',
    secret_token:'do not disclose',private_clinician_note:'not an allowed intake field',
  };
  mocks.from.mockImplementation((table:string)=>{
    if(table==='clinical_patients'){
      const chain={
        select:()=>chain,order:()=>chain,limit:()=>chain,eq:()=>chain,is:()=>chain,
        maybeSingle:async()=>({data:{
          id:verifiedPatientId,account_id:verifiedAccountId,revision:verifiedRevision,
          directory_deleted_at:verifiedArchivedAt
        },error:null}),
        then:(resolve:(result:unknown)=>unknown,reject?:(reason:unknown)=>unknown)=>Promise.resolve({
          data:[{id:returnedPatientId,account_id,directory_deleted_at:returnedArchivedAt,demographics:{first_name:'Fictional'},revision:3}],error:null,
        }).then(resolve,reject),
      };
      return chain;
    }
    if(table==='patient_intakes'){
      const chain={
        select:()=>chain,
        eq:vi.fn((_key:string,_id:string)=>chain),
        maybeSingle:async()=>({data:{patient_id:returnedIntakeAccountId,status:returnedIntakeStatus,version:returnedIntakeVersion,updated_at:returnedIntakeUpdatedAt,submitted_at:returnedIntakeSubmittedAt,answers:intakeAnswers},error:null}),
      };
      return chain;
    }
    throw Error('Unexpected table '+table);
  });
  mocks.access.mockResolvedValue({supabase:{from:mocks.from}});
});

test('central intake medical sources require the existing clinic access gate',async()=>{
  mocks.access.mockResolvedValue(null);
  const result=await GET(makeRequest());
  expect(result.status).toBe(403);
  expect(mocks.from).not.toHaveBeenCalled();
});

test('medical sources are limited to allowlisted fields of the explicitly linked patient account',async()=>{
  const result=await GET(makeRequest());
  expect(result.status).toBe(200);
  const json=await result.json();
  expect(json.intake.answers).toMatchObject({
    medication_entries:intakeAnswers.medication_entries,
    medication_allergy_status:intakeAnswers.medication_allergy_status,
    medication_allergy_notes:intakeAnswers.medication_allergy_notes,
    medical_substance_history:intakeAnswers.medical_substance_history,
    treatment_history_entries:intakeAnswers.treatment_history_entries,
    trauma_history_checklist:intakeAnswers.trauma_history_checklist,
    trauma_history:intakeAnswers.trauma_history,
  });
  expect(json.intake.version).toBe(1);
  expect(json.intake.submitted_at).toBe('2026-11-09T00:00:00Z');
  expect(json.intake.questionnaire_packet_version).toBe('2026-11-02-directory-1');
  expect(json.intake.answers).not.toHaveProperty('secret_token');
  expect(json.intake.answers).not.toHaveProperty('roi_signature');
  expect(json.intake.answers).not.toHaveProperty('private_clinician_note');
  expect(mocks.from).toHaveBeenCalledWith('patient_intakes');
});

test('directory withholds fetched intake if its chart was relinked during the source read',async()=>{
  verifiedAccountId='00000000-0000-0000-0000-000000000498';
  const response=await GET(makeRequest());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('Fictional reaction');
  expect(mocks.from).toHaveBeenCalledWith('patient_intakes');
});

test('directory withholds fetched intake if the chart was archived during the source read',async()=>{
  verifiedArchivedAt='2026-11-09T01:00:00Z';
  const response=await GET(makeRequest());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('Fictional reaction');
});

test('directory withholds fetched intake when the chart revision changes during its read',async()=>{
  verifiedRevision=4;
  const response=await GET(makeRequest());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('Fictional reaction');
});

test('directory withholds fetched intake when the rechecked chart identity is not the requested patient',async()=>{
  verifiedPatientId='00000000-0000-0000-0000-000000000499';
  const response=await GET(makeRequest());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('Fictional reaction');
});

test('unlinked clinical patients cannot receive intake information by matching names',async()=>{
  account_id=null;
  const result=await GET(makeRequest());
  expect(result.status).toBe(200);
  const json=await result.json();
  expect(json.intake).toBeNull();
  expect(mocks.from).not.toHaveBeenCalledWith('patient_intakes');
});

test('directory refuses a different central chart even when a stale patient filter returns it',async()=>{
  returnedPatientId='00000000-0000-0000-0000-000000000499';
  const result=await GET(makeRequest());
  expect(result.status).toBe(409);
  expect(await result.json()).not.toHaveProperty('intake');
  expect(mocks.from).not.toHaveBeenCalledWith('patient_intakes');
});

test('directory refuses archived chart data even when the active-chart filter is ignored',async()=>{
  returnedArchivedAt='2026-11-09T05:00:00Z';
  const result=await GET(makeRequest());
  expect(result.status).toBe(409);
  expect(mocks.from).not.toHaveBeenCalledWith('patient_intakes');
});

test('directory fails closed when linked intake query returns a different account',async()=>{
  returnedIntakeAccountId='00000000-0000-0000-0000-000000000498';
  const result=await GET(makeRequest());
  expect(result.status).toBe(409);
  const json=await result.json();
  expect(json).not.toHaveProperty('intake');
  expect(JSON.stringify(json)).not.toContain('Fictional reaction');
  expect(mocks.from).toHaveBeenCalledWith('patient_intakes');
});

test.each([0,1.5,-1])('directory rejects invalid intake version %s without disclosing answers',async version=>{
  returnedIntakeVersion=version;
  const result=await GET(makeRequest());
  expect(result.status).toBe(409);
  expect(JSON.stringify(await result.json())).not.toContain('Fictional reaction');
});

test.each([
  ['submitted',null,'2026-11-09T00:00:00Z'],
  ['submitted','2026-11-09T00:00:00Z',null],
  ['submitted','2026-11-09T00:00:00.000002Z','2026-11-09T00:00:00.000001Z'],
  ['draft','2026-11-09T00:00:00Z','2026-11-09T00:00:00Z'],
  ['submitted','2026-02-30T00:00:00Z','2026-11-09T00:00:00Z'],
])('directory rejects contradictory source chronology: %s, updated %s, submitted %s',async(status,updated,submitted)=>{
  returnedIntakeStatus=status;
  returnedIntakeUpdatedAt=updated as string;
  returnedIntakeSubmittedAt=submitted;
  const response=await GET(makeRequest());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('Fictional reaction');
});

test('directory refuses unknown questionnaire packet version before disclosing any linked clinical answers',async()=>{
  intakeAnswers.legal_packet_version='2040-unknown-packet';
  const response=await GET(makeRequest());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('Fictional reaction');
});

test('a legitimate draft carries no submission receipt and never implies a reviewed final source',async()=>{
  returnedIntakeStatus='draft';returnedIntakeSubmittedAt=null;
  const response=await GET(makeRequest());
  expect(response.status).toBe(200);
  const json=await response.json();
  expect(json.intake).toMatchObject({status:'draft',version:1,submitted_at:null,questionnaire_packet_version:'2026-11-02-directory-1'});
});

test('directory rejects structured or otherwise malformed clinical answer values',async()=>{
  intakeAnswers.medication_entries={raw:'PRIVATE FICTIONAL MEDICATION'} as unknown as string;
  const result=await GET(makeRequest());
  expect(result.status).toBe(409);
  expect(JSON.stringify(await result.json())).not.toContain('PRIVATE FICTIONAL MEDICATION');
});

test('directory does not treat an invalid central account ID as a website intake link',async()=>{
  account_id='not-a-uuid';
  const result=await GET(makeRequest());
  expect(result.status).toBe(409);
  expect(mocks.from).not.toHaveBeenCalledWith('patient_intakes');
});

const change = (action = 'delete', revision = 3) => new Request(makeRequest().url, {
  method: 'PATCH',
  body: JSON.stringify({ id: patientId, action, expectedRevision: revision }),
});

test('directory deletion and restoration target one patient at the expected revision', async () => {
  const query = {
    update: vi.fn(() => query), eq: vi.fn(() => query),
    is: vi.fn(() => query), not: vi.fn(() => query),
    select: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: { id: patientId }, error: null })),
  };
  mocks.from.mockReturnValue(query);
  expect((await PATCH(change())).status).toBe(200);
  expect(query.eq).toHaveBeenCalledWith('id', patientId);
  expect(query.eq).toHaveBeenCalledWith('revision', 3);
  expect(query.is).toHaveBeenCalledWith('directory_deleted_at', null);
  expect(query.update).toHaveBeenCalledWith({ directory_deleted_at: expect.any(String) });
  expect((await PATCH(change('restore'))).status).toBe(200);
  expect(query.not).toHaveBeenCalledWith('directory_deleted_at', 'is', null);
  expect(query.update).toHaveBeenCalledWith({ directory_deleted_at: null });
});

test('directory mutation rejects cross-origin and invalid actions before accessing data', async () => {
  mocks.sameOrigin.mockReturnValue(false);
  expect((await PATCH(change())).status).toBe(403);
  mocks.sameOrigin.mockReturnValue(true);
  expect((await PATCH(change('archive'))).status).toBe(400);
  expect((await PATCH(change('delete', 0))).status).toBe(400);
  expect(mocks.from).not.toHaveBeenCalled();
});
