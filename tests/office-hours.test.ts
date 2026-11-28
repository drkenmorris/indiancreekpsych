import {afterEach,beforeEach,expect,test,vi} from 'vitest';
const mocks=vi.hoisted(()=>({getUser:vi.fn(),getClaims:vi.fn(),single:vi.fn(),mfa:vi.fn(),insert:vi.fn(),update:vi.fn(),from:vi.fn(),read:vi.fn(),delivery:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:mocks.getUser,getClaims:mocks.getClaims,mfa:{getAuthenticatorAssuranceLevel:mocks.mfa}},from:mocks.from})}));
vi.mock('next/server',async original=>({...await original<any>(),after:(fn:()=>Promise<unknown>)=>{void fn();}}));
import {POST} from '../app/api/scheduling/office-hours/route';
import {POST as CHECK} from '../app/api/scheduling/office-hours/protection-check/route';
const savedRuleId='00000000-0000-4000-8000-000000000006';
const inserted=(data:unknown,error:unknown=null)=>({select:()=>({abortSignal:()=>({single:async()=>({data,error})})})});
const updated=(data:unknown,error:unknown=null)=>({eq:()=>inserted(data,error)});
const request=(body:unknown,origin='https://example.test')=>new Request('https://example.test/api/scheduling/office-hours',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{
 vi.stubEnv('OMNICORE_VERIFIED_REQUESTS_ENABLED','false');
 vi.stubEnv('OMNICORE_OFFICE_HOURS_FIREWALL_ENABLED','false');
 mocks.getClaims.mockResolvedValue({data:{claims:{sub:'admin',exp:Math.floor(Date.now()/1000)+60}},error:null});
 mocks.delivery.mockResolvedValue(new Response('{}',{status:202}));vi.stubGlobal('fetch',mocks.delivery);
 vi.clearAllMocks();mocks.mfa.mockResolvedValue({data:{currentLevel:'aal2'},error:null});mocks.getUser.mockResolvedValue({data:{user:{id:'admin'}},error:null});mocks.single.mockResolvedValue({data:{account_type:'admin'},error:null});
 mocks.insert.mockImplementation((payload:Record<string,unknown>)=>inserted({id:savedRuleId,...payload}));
 mocks.update.mockImplementation((payload:Record<string,unknown>)=>updated({id:savedRuleId,...payload}));
 mocks.read.mockResolvedValue({data:[{id:savedRuleId,weekday:6,start_time:'09:00:00',end_time:'17:00:00',anchor_time:null,enabled:true}],error:null});
 mocks.from.mockImplementation((table:string)=>table==='profiles'?{select:()=>({eq:()=>({single:mocks.single})})}:{insert:mocks.insert,update:mocks.update,select:()=>({order:()=>({order:()=>({abortSignal:mocks.read})})})});
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
test('Saturday hours save and return the refreshed list',async()=>{const r=await POST(request({weekday:6,start_time:'09:00',end_time:'17:00'}));expect(r.status).toBe(200);expect(mocks.insert).toHaveBeenCalledWith({weekday:6,start_time:'09:00',end_time:'17:00',anchor_time:null});expect((await r.json()).rules[0].weekday).toBe(6);});
test('administrator without completed MFA cannot change office hours',async()=>{
 mocks.mfa.mockResolvedValueOnce({data:{currentLevel:'aal1'},error:null});
 const denied=await POST(request({weekday:6,start_time:'09:00',end_time:'17:00'}));
 expect(denied.status).toBe(403);
 expect((await denied.json()).error).toContain('MFA');
 expect(mocks.insert).not.toHaveBeenCalled();
});
test('end before start is rejected without a write',async()=>{const r=await POST(request({weekday:6,start_time:'17:00',end_time:'09:00'}));expect(r.status).toBe(400);expect(mocks.insert).not.toHaveBeenCalled();});
test('signed-out, non-admin, and cross-origin requests cannot save',async()=>{
 expect((await POST(request({},'https://other.test'))).status).toBe(403);
 mocks.getUser.mockResolvedValue({data:{user:null},error:null});expect((await POST(request({}))).status).toBe(401);
 mocks.getUser.mockResolvedValue({data:{user:{id:'patient'}},error:null});mocks.single.mockResolvedValue({data:{account_type:'patient'},error:null});expect((await POST(request({}))).status).toBe(403);expect(mocks.insert).not.toHaveBeenCalled();
});
test('database failure returns a visible error; partial read failure says not to retry blindly',async()=>{
 mocks.insert.mockReturnValue(inserted(null,{message:'fixture'}));expect((await POST(request({weekday:6,start_time:'09:00',end_time:'17:00'}))).status).toBe(502);
 mocks.insert.mockImplementation((payload:Record<string,unknown>)=>inserted({id:savedRuleId,...payload}));mocks.read.mockResolvedValue({error:{message:'fixture'}});const r=await POST(request({weekday:6,start_time:'09:00',end_time:'17:00'}));expect(r.status).toBe(502);expect((await r.json()).error).toContain('readback was not verified');
});

function enableIdentity(){vi.stubEnv('OMNICORE_VERIFIED_REQUESTS_ENABLED','true');vi.stubEnv('OMNICORE_SITE_ID','00000000-0000-4000-8000-000000000001');vi.stubEnv('OMNICORE_INGEST_KEY','synthetic-local-key');}
test('identity gate requires authentication and fresh retry before any database operation',async()=>{
 enableIdentity();mocks.getClaims.mockResolvedValue({data:null,error:null});
 const denied=await POST(request({}));expect(denied.status).toBe(401);expect(await denied.json()).toMatchObject({authenticationRequired:true,retryWithNewRequest:true,authenticationPath:'/login'});expect(mocks.from).not.toHaveBeenCalled();
 mocks.getClaims.mockResolvedValue({data:{claims:{sub:'admin',exp:Math.floor(Date.now()/1000)+60}},error:null});
 expect((await POST(request({weekday:6,start_time:'09:00',end_time:'17:00'}))).status).toBe(200);expect(mocks.insert).toHaveBeenCalledTimes(1);
});
test('identity gate does not override administrator checks and fails closed when unavailable',async()=>{
 enableIdentity();mocks.single.mockResolvedValue({data:{account_type:'patient'},error:null});
 expect((await POST(request({}))).status).toBe(403);expect(mocks.insert).not.toHaveBeenCalled();
 mocks.getClaims.mockRejectedValue(new Error('provider offline'));
 expect((await POST(request({}))).status).toBe(503);expect(mocks.insert).not.toHaveBeenCalled();
 vi.stubEnv('OMNICORE_INGEST_KEY','');expect((await POST(request({}))).status).toBe(503);
});

function firewallRequest(contentType:string|null){
 const headers:Record<string,string>={origin:'https://example.test'};
 if(contentType!==null)headers['content-type']=contentType;
 return new Request('https://example.test/api/scheduling/office-hours',{method:'POST',headers,body:new TextEncoder().encode(JSON.stringify({weekday:6,start_time:'09:00',end_time:'17:00'}))});
}
function firewallEvents(){return mocks.delivery.mock.calls.flatMap(([,init])=>JSON.parse(String(init?.body)).events??[]);}
test('office-hours firewall denies missing and non-JSON types before handler/database access and records the reason',async()=>{
 enableIdentity();vi.stubEnv('OMNICORE_OFFICE_HOURS_FIREWALL_ENABLED','true');
 for(const type of [null,'text/plain','application/x-www-form-urlencoded','multipart/form-data; boundary=test']){
  const r=await POST(firewallRequest(type));expect(r.status).toBe(403);
 }
 expect(mocks.from).not.toHaveBeenCalled();expect(mocks.insert).not.toHaveBeenCalled();
 const completed=firewallEvents().filter(e=>e.direction==='inbound'&&e.phase==='completed');
 expect(completed).toHaveLength(4);
 for(const event of completed)expect(event.firewall).toMatchObject({mode:'enforce',outcome:'denied',codes:['content_type_not_allowed']});
});
test('office-hours firewall permits JSON and charset variants without bypassing identity or admin checks',async()=>{
 enableIdentity();vi.stubEnv('OMNICORE_OFFICE_HOURS_FIREWALL_ENABLED','true');
 for(const type of ['application/json','application/json; charset=utf-8','Application/JSON'])expect((await POST(firewallRequest(type))).status).toBe(200);
 expect(mocks.insert).toHaveBeenCalledTimes(3);
 mocks.insert.mockClear();mocks.getClaims.mockResolvedValue({data:null,error:null});
 expect((await POST(firewallRequest('application/json'))).status).toBe(401);
 mocks.getClaims.mockResolvedValue({data:{claims:{sub:'admin',exp:Math.floor(Date.now()/1000)+60}},error:null});
 mocks.single.mockResolvedValue({data:{account_type:'patient'},error:null});
 expect((await POST(firewallRequest('application/json'))).status).toBe(403);
 expect(mocks.insert).not.toHaveBeenCalled();
});
test('firewall-only configuration fails closed without connector credentials and switches modes predictably',async()=>{
 enableIdentity();vi.stubEnv('OMNICORE_VERIFIED_REQUESTS_ENABLED','false');
 vi.stubEnv('OMNICORE_OFFICE_HOURS_FIREWALL_ENABLED','true');
 expect((await POST(firewallRequest('text/plain'))).status).toBe(403);
 vi.stubEnv('OMNICORE_OFFICE_HOURS_FIREWALL_ENABLED','false');
 expect((await POST(firewallRequest('text/plain'))).status).toBe(200);
 vi.stubEnv('OMNICORE_OFFICE_HOURS_FIREWALL_ENABLED','true');
 expect((await POST(firewallRequest('text/plain'))).status).toBe(403);
 mocks.from.mockClear();vi.stubEnv('OMNICORE_INGEST_KEY','');
 expect((await POST(firewallRequest('application/json'))).status).toBe(503);
 expect(mocks.from).not.toHaveBeenCalled();
});

test('fixed administrator firewall-check payload cannot write even with policy disabled',async()=>{
 enableIdentity();
 const empty=()=>new Request('https://example.test/api/scheduling/office-hours',{method:'POST',headers:{origin:'https://example.test','content-type':'text/plain'},body:'{}'});
 vi.stubEnv('OMNICORE_OFFICE_HOURS_FIREWALL_ENABLED','true');expect((await POST(empty())).status).toBe(403);
 expect(mocks.from).not.toHaveBeenCalled();
 vi.stubEnv('OMNICORE_OFFICE_HOURS_FIREWALL_ENABLED','false');expect((await POST(empty())).status).toBe(400);
 expect(mocks.insert).not.toHaveBeenCalled();
});

const checkRequest=(origin='https://example.test')=>new Request('https://example.test/api/scheduling/office-hours/protection-check',{method:'POST',headers:{origin,'content-type':'application/json','x-omnicore-test':'true'},body:JSON.stringify({weekday:1,start_time:'09:00',end_time:'17:00',testProvenance:'spoof'})});
test('administrator check constructs a fixed server fixture, records trusted provenance and cannot save submitted hours',async()=>{
 enableIdentity();vi.stubEnv('OMNICORE_OFFICE_HOURS_FIREWALL_ENABLED','true');
 expect((await CHECK(checkRequest())).status).toBe(403);
 const events=firewallEvents().filter(e=>e.direction==='inbound');expect(events).toHaveLength(2);
 for(const e of events){expect(e.synthetic).toBe(false);expect(e.testProvenance).toMatchObject({kind:'controlled_test',source:'server_fixed_fixture',scenario:'office_hours_content_type'});}
 expect(events[1].firewallEvidence).toMatchObject({contentType:'text/plain',allowedContentTypes:['application/json'],stage:'before_handler'});
 expect(mocks.insert).not.toHaveBeenCalled();
 vi.stubEnv('OMNICORE_OFFICE_HOURS_FIREWALL_ENABLED','false');expect((await CHECK(checkRequest())).status).toBe(400);expect(mocks.insert).not.toHaveBeenCalled();
});
test('fixed fixture endpoint denies anonymous, non-admin, cross-origin and unavailable identity before constructing tests',async()=>{
 enableIdentity();expect((await CHECK(checkRequest('https://other.test'))).status).toBe(403);
 mocks.getUser.mockResolvedValue({data:{user:null},error:null});expect((await CHECK(checkRequest())).status).toBe(401);
 mocks.getUser.mockResolvedValue({data:{user:{id:'patient'}},error:null});mocks.single.mockResolvedValue({data:{account_type:'patient'},error:null});expect((await CHECK(checkRequest())).status).toBe(403);
 mocks.getUser.mockRejectedValue(new Error('offline'));expect((await CHECK(checkRequest())).status).toBe(503);
 expect(firewallEvents()).toHaveLength(0);expect(mocks.insert).not.toHaveBeenCalled();
});
test('ordinary route cannot acquire trusted provenance from user-supplied flags',async()=>{
 enableIdentity();
 // The untrusted input intentionally uses weekday 1; keep its independently
 // fetched schedule receipt consistent with that weekday. Mismatched readback
 // must be rejected by the production handler, not this provenance test.
 mocks.read.mockResolvedValueOnce({data:[{id:savedRuleId,weekday:1,start_time:'09:00:00',end_time:'17:00:00',anchor_time:null,enabled:true}],error:null});
 const req=checkRequest();expect((await POST(req)).status).toBe(200);
 expect(firewallEvents().every(e=>e.testProvenance===undefined)).toBe(true);
});

test('missing or inconsistent INSERT receipts cannot announce saved practice hours',async()=>{
 const payload={weekday:6,start_time:'09:00',end_time:'17:00'};
 for(const receipt of [null,[],{id:savedRuleId,weekday:5,start_time:'09:00',end_time:'17:00',anchor_time:null},
   {id:savedRuleId,weekday:6,start_time:'09:00',end_time:'16:00',anchor_time:null},
   {id:'',weekday:6,start_time:'09:00',end_time:'17:00',anchor_time:null}]){
  mocks.insert.mockReturnValue(inserted(receipt));
  mocks.read.mockClear();
  const response=await POST(request(payload));
  expect(response.status).toBe(502);
  expect((await response.json()).error).toContain('Refresh');
  expect(mocks.read).not.toHaveBeenCalled();
 }
});
test('an acknowledged INSERT must also appear exactly once in the refreshed schedule',async()=>{
 const payload={weekday:6,start_time:'09:00',end_time:'17:00'};
 for(const rows of [[],[{id:'other-id',weekday:6,start_time:'09:00:00',end_time:'17:00:00',anchor_time:null}],
  [{id:savedRuleId,weekday:5,start_time:'09:00:00',end_time:'17:00:00',anchor_time:null}],
  Array.from({length:2},()=>({id:savedRuleId,weekday:6,start_time:'09:00:00',end_time:'17:00:00',anchor_time:null}))]){
  mocks.read.mockResolvedValueOnce({data:rows,error:null});
  const response=await POST(request(payload));
  expect(response.status).toBe(502);
  expect((await response.json()).error).toContain('readback');
 }
});
test('an UPDATE cannot claim success from a missing row, wrong ID or stale schedule readback',async()=>{
 const payload={id:savedRuleId,weekday:6,start_time:'09:00',end_time:'17:00'};
 mocks.update.mockReturnValueOnce(updated(null));
 expect((await POST(request(payload))).status).toBe(502);
 mocks.update.mockReturnValueOnce(updated({id:'other',weekday:6,start_time:'09:00',end_time:'17:00',anchor_time:null}));
 expect((await POST(request(payload))).status).toBe(502);
 mocks.read.mockResolvedValueOnce({data:[],error:null});
 expect((await POST(request(payload))).status).toBe(502);
 expect((await POST(request(payload))).status).toBe(200);
 expect(mocks.update).toHaveBeenCalledWith({weekday:6,start_time:'09:00',end_time:'17:00',anchor_time:null});
});
