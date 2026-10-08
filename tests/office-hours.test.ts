import {afterEach,beforeEach,expect,test,vi} from 'vitest';
const mocks=vi.hoisted(()=>({getUser:vi.fn(),getClaims:vi.fn(),single:vi.fn(),insert:vi.fn(),from:vi.fn(),read:vi.fn(),delivery:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:mocks.getUser,getClaims:mocks.getClaims},from:mocks.from})}));
vi.mock('next/server',async original=>({...await original<any>(),after:(fn:()=>Promise<unknown>)=>{void fn();}}));
import {POST} from '../app/api/scheduling/office-hours/route';
const request=(body:unknown,origin='https://example.test')=>new Request('https://example.test/api/scheduling/office-hours',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{
 vi.stubEnv('OMNICORE_VERIFIED_REQUESTS_ENABLED','false');
 mocks.getClaims.mockResolvedValue({data:{claims:{sub:'admin',exp:Math.floor(Date.now()/1000)+60}},error:null});
 mocks.delivery.mockResolvedValue(new Response('{}',{status:202}));vi.stubGlobal('fetch',mocks.delivery);
 vi.clearAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id:'admin'}},error:null});mocks.single.mockResolvedValue({data:{account_type:'admin'},error:null});
 mocks.insert.mockReturnValue({abortSignal:async()=>({error:null})});
 mocks.read.mockResolvedValue({data:[{id:'sat',weekday:6,start_time:'09:00:00',end_time:'17:00:00',enabled:true}],error:null});
 mocks.from.mockImplementation((table:string)=>table==='profiles'?{select:()=>({eq:()=>({single:mocks.single})})}:{insert:mocks.insert,select:()=>({order:()=>({order:()=>({abortSignal:mocks.read})})})});
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
test('Saturday hours save and return the refreshed list',async()=>{const r=await POST(request({weekday:6,start_time:'09:00',end_time:'17:00'}));expect(r.status).toBe(200);expect(mocks.insert).toHaveBeenCalledWith({weekday:6,start_time:'09:00',end_time:'17:00',anchor_time:null});expect((await r.json()).rules[0].weekday).toBe(6);});
test('end before start is rejected without a write',async()=>{const r=await POST(request({weekday:6,start_time:'17:00',end_time:'09:00'}));expect(r.status).toBe(400);expect(mocks.insert).not.toHaveBeenCalled();});
test('signed-out, non-admin, and cross-origin requests cannot save',async()=>{
 expect((await POST(request({},'https://other.test'))).status).toBe(403);
 mocks.getUser.mockResolvedValue({data:{user:null},error:null});expect((await POST(request({}))).status).toBe(401);
 mocks.getUser.mockResolvedValue({data:{user:{id:'patient'}},error:null});mocks.single.mockResolvedValue({data:{account_type:'patient'},error:null});expect((await POST(request({}))).status).toBe(403);expect(mocks.insert).not.toHaveBeenCalled();
});
test('database failure returns a visible error; partial read failure says not to retry blindly',async()=>{
 mocks.insert.mockReturnValue({abortSignal:async()=>({error:{message:'fixture'}})});expect((await POST(request({weekday:6,start_time:'09:00',end_time:'17:00'}))).status).toBe(400);
 mocks.insert.mockReturnValue({abortSignal:async()=>({error:null})});mocks.read.mockResolvedValue({error:{message:'fixture'}});const r=await POST(request({weekday:6,start_time:'09:00',end_time:'17:00'}));expect(r.status).toBe(502);expect((await r.json()).error).toContain('Hours were saved');
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
