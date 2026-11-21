import {beforeEach,expect,test,vi} from 'vitest';
import {GET} from '@/app/api/emr/dsm-records/route';

// Fictional database-adapter fixtures. These are isolation regressions, not
// authenticated browser acceptance and do not access any production records.
const mocks=vi.hoisted(()=>({access:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({
 emrAccess:mocks.access,
 privateHeaders:{'Cache-Control':'private, no-store'},
 sameOrigin:vi.fn(),
}));
const clinician='00000000-0000-4000-8000-000000000711';
const otherClinician='00000000-0000-4000-8000-000000000712';
const patient='00000000-0000-4000-8000-000000000713';
const otherPatient='00000000-0000-4000-8000-000000000714';
const recordId='00000000-0000-4000-8000-000000000715';
let rows:Record<string,unknown>[];
let patientRow:Record<string,unknown>;
let patientReads:number;
const request=(query:string)=>new Request('https://www.indiancreekpsych.com/api/emr/dsm-records?'+query);
beforeEach(()=>{
 vi.clearAllMocks();
 rows=[{id:recordId,patient_id:patient,owner_id:clinician,
  label:'Fictional DSM working record',revision:0,created_at:'2026-11-21T15:00:00Z',
  updated_at:'2026-11-21T15:00:00Z'}];
 patientRow={id:patient,demographics:{first_name:'Fictional',last_name:'Patient'},profiles:null};
 patientReads=0;
 mocks.access.mockResolvedValue({user:{id:clinician},supabase:{from:(table:string)=>{
  if(table==='dsm_records'){
   const chain={
    select:()=>chain,eq:()=>chain,order:()=>chain,limit:()=>chain,
    then:(resolve:(value:unknown)=>unknown,reject?:(reason:unknown)=>unknown)=>
     Promise.resolve({data:rows,error:null}).then(resolve,reject)
   };
   return chain;
  }
  if(table==='clinical_patients'){
   const chain={select:()=>chain,eq:()=>chain,single:async()=>{
    patientReads++;
    return {data:patientRow,error:null};
   }};
   return chain;
  }
  throw Error('Unexpected fictional database table '+table);
 }}});
});

test('patient-scoped DSM list returns only verified owner/chart records without exposing owner receipt',async()=>{
 const response=await GET(request('patient='+patient));
 expect(response.status).toBe(200);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 const body=await response.json();
 expect(body.records).toHaveLength(1);
 expect(body.records[0].id).toBe(recordId);
 expect(body.records[0].patient_id).toBe(patient);
 expect(body.records[0].owner_id).toBeUndefined();
 expect(patientReads).toBe(0);
});

test.each([
 ['another patient',()=>{rows[0].patient_id=otherPatient;}],
 ['another clinician',()=>{rows[0].owner_id=otherClinician;}],
 ['malformed chart',()=>{rows[0].patient_id='invalid';}],
 ['duplicate record receipt',()=>{rows.push({...rows[0]});}],
] as const)('patient-scoped DSM list fails closed for %s even when query filters returned normally',async(_label,mutate)=>{
 mutate();
 const response=await GET(request('patient='+patient));
 expect(response.status).toBe(409);
 const body=await response.json();
 expect(body.records).toBeUndefined();
 expect(JSON.stringify(body)).not.toContain('Fictional DSM working record');
 expect(patientReads).toBe(0);
});

test('single DSM record refuses a different record ID before querying any patient identity',async()=>{
 rows[0].id='00000000-0000-4000-8000-000000000716';
 const response=await GET(request('id='+recordId));
 expect(response.status).toBe(409);
 expect((await response.json()).record).toBeUndefined();
 expect(patientReads).toBe(0);
});

test('single DSM record requires actual matching patient identity before displaying patient name',async()=>{
 patientRow.id=otherPatient;
 const response=await GET(request('id='+recordId));
 expect(response.status).toBe(409);
 const body=await response.json();
 expect(body.record).toBeUndefined();
 expect(JSON.stringify(body)).not.toContain('Fictional Patient');
 expect(patientReads).toBe(1);
});

test('matching DSM record and patient readback still provides the existing unsigned working record',async()=>{
 const response=await GET(request('id='+recordId+'&patient='+patient));
 expect(response.status).toBe(200);
 const body=await response.json();
 expect(body.record.patient_id).toBe(patient);
 expect(body.record.patient_name).toBe('Fictional Patient');
 expect(body.record.owner_id).toBeUndefined();
 expect(body.snapshot).toBeNull();
 expect(body.history).toEqual([]);
});

test('unauthenticated DSM requests do not query the repository',async()=>{
 mocks.access.mockResolvedValueOnce(null);
 const response=await GET(request('patient='+patient));
 expect(response.status).toBe(403);
 expect((await response.json()).records).toBeUndefined();
 expect(patientReads).toBe(0);
});
