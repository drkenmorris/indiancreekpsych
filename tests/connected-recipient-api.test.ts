import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/assigned-tests/connected/route';import {connectedDefinition} from '@/lib/clinical-tests/connected/definition';import {hash} from '@/lib/clinical-tests/connected/source';
const mocks=vi.hoisted(()=>({access:vi.fn()}));
vi.mock('@/lib/clinical-tests/asq/recipient-access',async()=>{const original=await vi.importActual<typeof import('@/lib/clinical-tests/asq/recipient-access')>('@/lib/clinical-tests/asq/recipient-access');return {...original,asqRecipientAccess:mocks.access};});
const id='00000000-0000-0000-0000-000000000301',source={definition:connectedDefinition('cseq'),hash:hash(connectedDefinition('cseq'))};
let email:string,assignment:Record<string,unknown>,rpc:ReturnType<typeof vi.fn>,saved:Record<string,unknown>|null;
beforeEach(()=>{vi.stubEnv('ASQ_RECIPIENT_RELEASE_APPROVED','true');email='fictional@example.invalid';assignment={id,recipient_first_name:'Fictional',recipient_last_name:'Recipient',recipient_email:email,test_key:'cseq',patient_id:'00000000-0000-0000-0000-000000000201',status:'sent',expires_at:'2099-01-01T00:00:00Z',connected_source:source.definition,connected_source_hash:source.hash};saved=null;rpc=vi.fn(async (_name:string,p:Record<string,unknown>)=>{const revision=(p.p_expected as number)+1;saved={answers:p.p_answers,page:p.p_page,revision,status:p.p_submit?'submitted':'draft',identity_confirmed:true};return {data:revision,error:null};});mocks.access.mockImplementation(async()=>({user:{id:'fictional-user',email},supabase:{rpc,from:(table:string)=>{const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:table==='psych_test_assignments'?assignment:saved?{assignment_id:id,respondent_id:'fictional-user',...saved}:null,error:null})};return chain;}}}));});afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
const request=(value:unknown,origin='https://www.indiancreekpsych.com')=>new Request('https://www.indiancreekpsych.com/api/assigned-tests/connected',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(value)});
const answers=()=>Object.fromEntries(source.definition.items.slice(0,7).map(i=>[i.id,0]));
test('missing account, email mismatch and expiry deny recipient access',async()=>{vi.stubEnv('ASQ_RECIPIENT_RELEASE_APPROVED','true');email='different@example.invalid';expect((await GET(new Request('https://www.indiancreekpsych.com/api/assigned-tests/connected?id='+id))).status).toBe(403);email='fictional@example.invalid';assignment.expires_at='2000-01-01';expect((await GET(new Request('https://www.indiancreekpsych.com/api/assigned-tests/connected?id='+id))).status).toBe(403);mocks.access.mockResolvedValue(null);expect((await POST(request({id}))).status).toBe(403);});
test('GET returns only assigned source and saved recipient state, without other informant or chart data',async()=>{saved={answers:answers(),page:1,revision:3,status:'draft',identity_confirmed:true};const response=await GET(new Request('https://www.indiancreekpsych.com/api/assigned-tests/connected?id='+id));expect(response.status).toBe(200);const json=await response.json();expect(json.response).toEqual(saved);expect(json.assignment).toEqual({id,recipientName:'Fictional Recipient',expiresAt:assignment.expires_at});expect(json.definition.items).toHaveLength(source.definition.items.length);expect(json.assignment.recipient_email).toBeUndefined();expect(json.patient).toBeUndefined();});
test('save binds to authorized assignment, preserves zero answers and uses optimistic revision',async()=>{const response=await POST(request({id,expectedRevision:0,page:1,submit:false,identityConfirmed:true,answers:answers(),patientId:'forged',asqRole:'teacher'}));expect(response.status).toBe(200);expect(rpc).toHaveBeenCalledWith('save_connected_assignment',{p_id:id,p_expected:0,p_answers:answers(),p_page:1,p_submit:false,p_confirmed:true});expect((await response.json()).revision).toBe(1);});
test('CSRF, forged answers and source mismatch fail without writing; stale revisions return409',async()=>{const body={id,expectedRevision:0,page:1,submit:false,identityConfirmed:true,answers:answers()};expect((await POST(request(body,'https://elsewhere.invalid'))).status).toBe(403);expect((await POST(request({...body,answers:{...answers(),forged:2}}))).status).toBe(400);expect(rpc).not.toHaveBeenCalled();rpc.mockResolvedValue({data:null,error:{code:'40001'}});expect((await POST(request(body))).status).toBe(409);assignment.connected_source_hash='bad';expect((await GET(new Request('https://www.indiancreekpsych.com/api/assigned-tests/connected?id='+id))).status).toBe(409);});


test('revoked CSEQ invitation cannot disclose a questionnaire or save a clinical response',async()=>{
 assignment.status='revoked';
 const read=await GET(new Request('https://www.indiancreekpsych.com/api/assigned-tests/connected?id='+id));
 expect(read.status).toBe(403);
 expect(JSON.stringify(await read.json())).not.toContain('items');
 const write=await POST(request({id,expectedRevision:0,page:1,submit:false,identityConfirmed:true,answers:answers()}));
 expect(write.status).toBe(403);
 expect(rpc).not.toHaveBeenCalled();
});


test('mis-scoped connected assessment rows, invalid chart links and malformed expiry fail closed',async()=>{
 const legitimate={...assignment};
 const forbidden=[
  {id:'00000000-0000-0000-0000-000000000399'},
  {patient_id:'invalid-central-chart-id'},
  {patient_id:null},
  {expires_at:undefined},
  {expires_at:'not-a-valid-timestamp'}
 ];
 for(const update of forbidden){
  assignment={...legitimate,...update};
  const read=await GET(new Request('https://www.indiancreekpsych.com/api/assigned-tests/connected?id='+id));
  expect(read.status).toBe(403);
  expect(JSON.stringify(await read.json())).not.toContain('items');
  const write=await POST(request({id,expectedRevision:0,page:1,submit:false,identityConfirmed:true,answers:answers()}));
  expect(write.status).toBe(403);
 }
 expect(rpc).not.toHaveBeenCalled();
});

test('GET refuses mis-scoped, malformed or forged recipient responses without disclosing saved answers',async()=>{
 const valid={answers:answers(),page:1,revision:3,status:'draft',identity_confirmed:true};
 const forbidden=[
  {assignment_id:'00000000-0000-0000-0000-000000000399'},
  {respondent_id:'another-recipient'},
  {answers:{...answers(),unassigned_question:'private'}},
  {answers:['not','an','object']},
  {page:-1},
  {page:999},
  {revision:-1},
  {revision:1.5},
  {status:'unknown'},
  {identity_confirmed:'true'}
 ];
 for(const modification of forbidden){
  saved={...valid,...modification};
  const response=await GET(new Request('https://www.indiancreekpsych.com/api/assigned-tests/connected?id='+id));
  expect(response.status).toBe(409);
  const json=await response.json();
  expect(json.response).toBeUndefined();
  expect(json.definition).toBeUndefined();
  expect(JSON.stringify(json)).not.toContain('unassigned_question');
 }
});

test('POST never claims a saved assessment if the database revision receipt is missing or contradictory',async()=>{
 const body={id,expectedRevision:0,page:1,submit:false,identityConfirmed:true,answers:answers()};
 for(const receipt of [null,0,-1,1.5,'1',2]){
  rpc.mockResolvedValueOnce({data:receipt,error:null});
  const response=await POST(request(body));
  expect(response.status).toBe(503);
  expect((await response.json()).saved).toBeUndefined();
 }
 rpc.mockResolvedValueOnce({data:2,error:null});
 saved={answers:answers(),page:1,revision:2,status:'draft',identity_confirmed:true};
 const confirmed=await POST(request({...body,expectedRevision:1}));
 expect(confirmed.status).toBe(200);
 expect((await confirmed.json()).revision).toBe(2);
});

test('connected save only acknowledges independently read-back recipient, revision, page, status and exact answers',async()=>{
 const body={id,expectedRevision:0,page:1,submit:false,identityConfirmed:true,answers:answers()};
 const valid={answers:answers(),page:1,revision:1,status:'draft',identity_confirmed:true};
 const forbidden=[
  {assignment_id:'00000000-0000-0000-0000-000000000399'},
  {respondent_id:'another-recipient'},
  {revision:0},
  {page:0},
  {status:'submitted'},
  {identity_confirmed:false},
  {answers:{...answers(),foreign_question:'private'}},
  {answers:{}}
 ];
 for(const incorrect of forbidden){
  rpc.mockResolvedValueOnce({data:1,error:null});
  saved={...valid,...incorrect};
  const response=await POST(request(body));
  expect(response.status).toBe(503);
  expect((await response.json()).saved).toBeUndefined();
 }
 // A correctly persisted submitted response, not merely the RPC receipt,
 // is required for the final submission acknowledgement as well.
 saved={...valid};
 const submitted=await POST(request({...body,submit:true}));
 expect(submitted.status).toBe(200);
 expect((await submitted.json()).status).toBe('submitted');
});

test('connected save fails closed when PostgREST readback is missing',async()=>{
 const body={id,expectedRevision:0,page:1,submit:false,identityConfirmed:true,answers:answers()};
 rpc.mockResolvedValueOnce({data:1,error:null});
 saved=null;
 const response=await POST(request(body));
 expect(response.status).toBe(503);
 expect((await response.json()).saved).toBeUndefined();
});
