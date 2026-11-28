import {beforeEach,expect,test,vi} from 'vitest';
import {GET,PATCH,POST} from '@/app/api/emr/patients/route';

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
let intakeReads:number;
let rereadIntake:Record<string,unknown>|null;
let rereadMissing:boolean;
let rereadError:boolean;
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
  intakeReads=0;
  rereadIntake=null;
  rereadMissing=false;
  rereadError=false;
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
        maybeSingle:async()=>{
          intakeReads+=1;
          return {
            data:intakeReads===2&&rereadMissing?null:{
              patient_id:returnedIntakeAccountId,status:returnedIntakeStatus,
              version:returnedIntakeVersion,updated_at:returnedIntakeUpdatedAt,
              submitted_at:returnedIntakeSubmittedAt,answers:{...intakeAnswers},
              ...(intakeReads===2?rereadIntake??{}:{}),
            },
            error:intakeReads===2&&rereadError?{message:'Readback unavailable'}:null,
          };
        },
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
  expect(intakeReads).toBe(2);
});

test.each([
  ['version', {version:2}],
  ['status', {status:'draft'}],
  ['submission receipt', {submitted_at:'2026-11-09T00:00:01Z'}],
  ['source account', {patient_id:'00000000-0000-0000-0000-000000000498'}],
])('directory rejects a concurrent intake %s change before releasing clinical answers',async(_label,changed)=>{
  rereadIntake=changed;
  const response=await GET(makeRequest());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('Fictional reaction');
  expect(intakeReads).toBe(2);
});

test('directory refuses same-version out-of-band changes to hidden or visible patient answers',async()=>{
  rereadIntake={answers:{...intakeAnswers,roi_signature:'Changed private signature'}};
  let response=await GET(makeRequest());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('Fictional reaction');

  intakeReads=0;
  rereadIntake={answers:{...intakeAnswers,medication_allergy_notes:'Changed clinical reaction'}};
  response=await GET(makeRequest());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('Changed clinical reaction');
});

test.each(['missing','error'] as const)('directory refuses %s intake source during final receipt check',async kind=>{
  rereadMissing=kind==='missing';rereadError=kind==='error';
  const response=await GET(makeRequest());
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('Fictional reaction');
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

test('uppercase UUID directory links resolve the same central BPS chart and protected intake',async()=>{
  const canonical='abcdef01-1234-4000-8000-abcdef012345';
  returnedPatientId=canonical;
  verifiedPatientId=canonical;
  const response=await GET(makeRequest(canonical.toUpperCase()));
  expect(response.status).toBe(200);
  const json=await response.json();
  expect(json.patients[0].id).toBe(canonical);
  expect(json.intake.answers.medication_allergy_notes).toBe('Fictional reaction');
  expect(intakeReads).toBe(2);
});

test('uppercase central chart link still fails closed when database returns another patient',async()=>{
  const canonical='abcdef01-1234-4000-8000-abcdef012345';
  returnedPatientId='abcdef01-1234-4000-8000-abcdef012346';
  const response=await GET(makeRequest(canonical.toUpperCase()));
  expect(response.status).toBe(409);
  expect((await response.json()).intake).toBeUndefined();
  expect(mocks.from).not.toHaveBeenCalledWith('patient_intakes');
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

const demographicsSave=(id?:unknown,revision?:unknown)=>new Request(
  'https://www.indiancreekpsych.com/api/emr/patients',{
    method:'POST',headers:{Origin:'https://www.indiancreekpsych.com'},
    body:JSON.stringify({
      ...(id!==undefined?{id}:{}),
      expectedRevision:revision,
      demographics:{first_name:'Fictional',last_name:'Patient'},
    }),
  },
);

test.each([null,'','not-a-chart-id',42,{},[]])(
  'explicit malformed patient chart ID %j cannot silently create another patient',
  async id=>{
    const response=await POST(demographicsSave(id,3));
    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(await response.json()).not.toHaveProperty('saved',true);
    expect(mocks.from).not.toHaveBeenCalled();
  },
);

test('demographics update targets only active selected chart and verifies its returned identity',async()=>{
  const chain={
    update:vi.fn(()=>chain),eq:vi.fn(()=>chain),is:vi.fn(()=>chain),
    select:vi.fn(()=>chain),
    single:vi.fn(async()=>({data:{id:patientId,directory_deleted_at:null},error:null})),
  };
  mocks.from.mockReturnValue(chain);
  const response=await POST(demographicsSave(patientId,3));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({id:patientId,saved:true});
  expect(chain.update).toHaveBeenCalledWith({demographics:{first_name:'Fictional',last_name:'Patient'}});
  expect(chain.eq).toHaveBeenCalledWith('id',patientId);
  expect(chain.eq).toHaveBeenCalledWith('revision',3);
  expect(chain.is).toHaveBeenCalledWith('directory_deleted_at',null);
  expect(chain.select).toHaveBeenCalledWith('id,directory_deleted_at');
});

test.each([
  ['wrong central patient', {id:'00000000-0000-0000-0000-000000000499',directory_deleted_at:null}],
  ['archived chart', {id:patientId,directory_deleted_at:'2026-11-12T00:00:00Z'}],
  ['missing receipt', null],
  ['invalid receipt identity', {id:'bad-id',directory_deleted_at:null}],
])('demographics write never acknowledges an unverified %s receipt',async(_reason,receipt)=>{
  const chain={
    update:vi.fn(()=>chain),eq:vi.fn(()=>chain),is:vi.fn(()=>chain),
    select:vi.fn(()=>chain),single:vi.fn(async()=>({data:receipt,error:null})),
  };
  mocks.from.mockReturnValue(chain);
  const response=await POST(demographicsSave(patientId,3));
  expect(response.status).toBe(409);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  const returned=await response.json();
  expect(returned).not.toHaveProperty('saved',true);
  expect(returned.error).toContain('Reopen the chart');
  expect(chain.is).toHaveBeenCalledWith('directory_deleted_at',null);
});

test('new patient creation requires a valid returned central ID and no archived receipt',async()=>{
  const chain={
    insert:vi.fn(()=>chain),select:vi.fn(()=>chain),
    single:vi.fn(async()=>({data:{id:patientId,directory_deleted_at:null},error:null})),
  };
  mocks.from.mockReturnValue(chain);
  const response=await POST(demographicsSave());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({id:patientId,saved:true});
  expect(chain.insert).toHaveBeenCalledOnce();
  expect(chain.select).toHaveBeenCalledWith('id,directory_deleted_at');
});


test.each([
  ['archived insert receipt', {id:patientId,directory_deleted_at:'2026-11-21T00:00:00Z'}],
  ['missing active-status receipt', {id:patientId}],
])('new clinical chart creation does not acknowledge an %s',async(_reason,receipt)=>{
  const chain={
    insert:vi.fn(()=>chain),select:vi.fn(()=>chain),
    single:vi.fn(async()=>({data:receipt,error:null})),
  };
  mocks.from.mockReturnValue(chain);
  const response=await POST(demographicsSave());
  expect(response.status).toBe(409);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(await response.json()).not.toHaveProperty('saved',true);
  expect(chain.insert).toHaveBeenCalledOnce();
});

test.each([
  ['different central chart', {id:'00000000-0000-0000-0000-000000000499'}],
  ['malformed directory receipt', {id:'not-a-chart'}],
  ['missing directory receipt', null],
])('directory mutation cannot claim a completed patient change from %s',async(_reason,receipt)=>{
  // Fictional mocked mutation receipt. Never issue a live delete/restore.
  const chain={
    update:vi.fn(()=>chain),eq:vi.fn(()=>chain),
    is:vi.fn(()=>chain),not:vi.fn(()=>chain),
    select:vi.fn(()=>chain),
    maybeSingle:vi.fn(async()=>({data:receipt,error:null})),
  };
  mocks.from.mockReturnValue(chain);
  const response=await PATCH(change());
  expect(response.status).toBe(409);
  const body=await response.json();
  expect(body).not.toHaveProperty('status','deleted');
  expect(body).not.toHaveProperty('status','restored');
  expect(chain.update).toHaveBeenCalledOnce();
});

test('case-variant central-chart UUID is canonicalized for a verified directory mutation',async()=>{
  const canonical='abcdef01-1234-4000-8000-abcdef012345';
  const chain={
    update:vi.fn(()=>chain),eq:vi.fn(()=>chain),
    is:vi.fn(()=>chain),not:vi.fn(()=>chain),
    select:vi.fn(()=>chain),
    maybeSingle:vi.fn(async()=>({data:{id:canonical},error:null})),
  };
  mocks.from.mockReturnValue(chain);
  const request=new Request('https://www.indiancreekpsych.com/api/emr/patients',{
    method:'PATCH',
    body:JSON.stringify({id:canonical.toUpperCase(),action:'restore',expectedRevision:3}),
  });
  const response=await PATCH(request);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({id:canonical,status:'restored'});
  expect(chain.eq).toHaveBeenCalledWith('id',canonical);
});
