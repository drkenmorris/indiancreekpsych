import {beforeEach,expect,test,vi} from 'vitest';
import {GET} from '@/app/api/emr/patients/route';

const mocks=vi.hoisted(()=>({access:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({
  emrAccess:mocks.access,
  sameOrigin:()=>true,
  privateHeaders:{'Cache-Control':'private, no-store'},
}));

const patientId='00000000-0000-0000-0000-000000000401';
const accountId='00000000-0000-0000-0000-000000000402';
let account_id:string|null;
let intakeAnswers:Record<string,string>;
const makeRequest=(id=patientId)=>new Request('https://www.indiancreekpsych.com/api/emr/patients?id='+id);

beforeEach(()=>{
  vi.clearAllMocks();
  account_id=accountId;
  intakeAnswers={
    full_name:'Fictional Patient',email:'fictional@example.invalid',
    medication_entries:'[{"medication":"Example"}]',
    medication_allergy_status:'Medication allergies reported',
    medication_allergy_notes:'Fictional reaction',
    medical_substance_history:'{"example":"patient report"}',
    secret_token:'do not disclose',private_clinician_note:'not an allowed intake field',
  };
  mocks.from.mockImplementation((table:string)=>{
    if(table==='clinical_patients'){
      const chain={
        select:()=>chain,order:()=>chain,limit:()=>chain,eq:()=>chain,
        then:(resolve:(result:unknown)=>unknown,reject?:(reason:unknown)=>unknown)=>Promise.resolve({
          data:[{id:patientId,account_id,demographics:{first_name:'Fictional'},revision:3}],error:null,
        }).then(resolve,reject),
      };
      return chain;
    }
    if(table==='patient_intakes'){
      const chain={
        select:()=>chain,
        eq:vi.fn((_key:string,_id:string)=>chain),
        maybeSingle:async()=>({data:{status:'submitted',updated_at:'2026-11-09T00:00:00Z',answers:intakeAnswers},error:null}),
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
  });
  expect(json.intake.answers).not.toHaveProperty('secret_token');
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
