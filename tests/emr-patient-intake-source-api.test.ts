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
let returnedArchivedAt:string|null;
const makeRequest=(id=patientId)=>new Request('https://www.indiancreekpsych.com/api/emr/patients?id='+id);

beforeEach(()=>{
  vi.clearAllMocks();
  mocks.sameOrigin.mockReturnValue(true);
  account_id=accountId;
  returnedPatientId=patientId;
  returnedIntakeAccountId=accountId;
  returnedIntakeVersion=1;
  returnedIntakeStatus='submitted';
  returnedArchivedAt=null;
  intakeAnswers={
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
        maybeSingle:async()=>({data:{patient_id:returnedIntakeAccountId,status:returnedIntakeStatus,version:returnedIntakeVersion,updated_at:'2026-11-09T00:00:00Z',answers:intakeAnswers},error:null}),
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
  expect(json.intake.answers).not.toHaveProperty('secret_token');
  expect(json.intake.answers).not.toHaveProperty('roi_signature');
  expect(json.intake.answers).not.toHaveProperty('private_clinician_note');
  expect(mocks.from).toHaveBeenCalledWith('patient_intakes');
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
