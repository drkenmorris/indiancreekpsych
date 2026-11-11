import {beforeEach,expect,test,vi} from 'vitest';
import {GET} from '@/app/api/emr/legal-packet/route';
import {LEGAL_PACKET_VERSION,formsForVersion} from '@/lib/patient/legal-documents';

const mocks=vi.hoisted(()=>({access:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({
 emrAccess:mocks.access,privateHeaders:{'Cache-Control':'private, no-store'},
}));

const patient='00000000-0000-0000-0000-000000000101';
const linked='00000000-0000-0000-0000-000000000102';
const request=(id=patient)=>new Request('https://www.indiancreekpsych.com/api/emr/legal-packet?patient='+id);
let account:string|null,exists:boolean,intakeStatus:string,submittedAt:string|null,intakeError:boolean;
let answers:Record<string,string>;
const checked:Array<[string,string,string]>=[];
beforeEach(()=>{
 vi.clearAllMocks();checked.length=0;
 account=linked;exists=true;intakeStatus='submitted';submittedAt='2026-11-10T02:00:00Z';intakeError=false;
 const f=formsForVersion(LEGAL_PACKET_VERSION)[0];
 answers={legal_packet_version:LEGAL_PACKET_VERSION,full_name:'Fictional Test Patient',date_of_birth:'2000-01-01',
  legal_routing_answers:'{"version":"demo"}',
  [f.choice]:f.positive,[f.signature]:'Fictional Signature',[f.date]:'2026-11-10',
  clinical_trauma_history:'NEVER INCLUDE CLINICAL ANSWERS',secret_token:'NEVER LEAK'};
 mocks.from.mockImplementation((table:string)=>{
  if(table==='clinical_patients'){
   const chain={select:()=>chain,eq:(k:string,v:string)=>{checked.push([table,k,v]);return chain;},
    maybeSingle:async()=>({data:exists?{id:patient,account_id:account}:null,error:null})};
   return chain;
  }
  if(table==='patient_intakes'){
   const chain={select:()=>chain,eq:(k:string,v:string)=>{checked.push([table,k,v]);return chain;},
    maybeSingle:async()=>({data:intakeStatus==='submitted'?{status:intakeStatus,submitted_at:submittedAt,answers}:null,
      error:intakeError?{message:'Unavailable'}:null})};
   return chain;
  }
  throw Error('Unexpected table '+table);
 });
 mocks.access.mockResolvedValue({supabase:{from:mocks.from}});
});
test('legal packet is denied without admin MFA and no patient data queried',async()=>{
 mocks.access.mockResolvedValue(null);
 const response=await GET(request());expect(response.status).toBe(403);
 expect(response.headers.get('Cache-Control')).toBe('private, no-store');
 expect(mocks.from).not.toHaveBeenCalled();
});
test('rejects unknown patient IDs, missing patient, and cross-account name matching',async()=>{
 expect((await GET(request('invalid'))).status).toBe(400);
 expect(mocks.from).not.toHaveBeenCalled();
 exists=false;
 expect((await GET(request())).status).toBe(404);
 exists=true;account=null;
 const response=await GET(request());
 expect(response.status).toBe(200);
 expect((await response.json()).reason).toBe('unlinked');
 expect(mocks.from).not.toHaveBeenCalledWith('patient_intakes');
});
test('only linked submitted legal packet is read, with allowlisted form fields and no clinical intake data',async()=>{
 const response=await GET(request());expect(response.status).toBe(200);
 const output=await response.json();
 expect(output.patientId).toBe(patient);
 expect(output.packet.knownRevision).toBe(true);
 expect(output.packet.answers.full_name).toBe('Fictional Test Patient');
 const f=formsForVersion(LEGAL_PACKET_VERSION)[0];
 expect(output.packet.answers[f.signature]).toBe('Fictional Signature');
 expect(JSON.stringify(output)).not.toContain('NEVER INCLUDE CLINICAL ANSWERS');
 expect(JSON.stringify(output)).not.toContain('NEVER LEAK');
 expect(checked).toContainEqual(['clinical_patients','id',patient]);
 expect(checked).toContainEqual(['patient_intakes','patient_id',linked]);
 expect(checked).toContainEqual(['patient_intakes','status','submitted']);
});
test('drafts, unsubmitted, and invalid source data never become signed legal records',async()=>{
 intakeStatus='draft';
 let r=await GET(request());expect((await r.json()).packet).toBeNull();
 intakeStatus='submitted';submittedAt=null;
 r=await GET(request());expect((await r.json()).packet).toBeNull();
 submittedAt='2026-11-10T02:00:00Z';intakeError=true;
 r=await GET(request());expect(r.status).toBe(503);
});
test('unknown historical revision does not attach present-day document text or claims of signature',async()=>{
 answers.legal_packet_version='unknown-legacy-packet';
 const r=await GET(request());expect(r.status).toBe(200);
 const {packet}=await r.json();
 expect(packet.knownRevision).toBe(false);
 expect(packet.answers).toBeUndefined();
 expect(packet.version).toBe('unknown-legacy-packet');
});
