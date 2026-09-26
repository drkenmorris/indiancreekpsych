import {beforeEach,expect,test,vi} from 'vitest';
const mocks=vi.hoisted(()=>({getUser:vi.fn(),single:vi.fn(),insert:vi.fn(),from:vi.fn(),read:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:mocks.getUser},from:mocks.from})}));
import {POST} from '../app/api/scheduling/office-hours/route';
const request=(body:unknown,origin='https://example.test')=>new Request('https://example.test/api/scheduling/office-hours',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{
 vi.clearAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id:'admin'}},error:null});mocks.single.mockResolvedValue({data:{account_type:'admin'},error:null});
 mocks.insert.mockReturnValue({abortSignal:async()=>({error:null})});
 mocks.read.mockResolvedValue({data:[{id:'sat',weekday:6,start_time:'09:00:00',end_time:'17:00:00',enabled:true}],error:null});
 mocks.from.mockImplementation((table:string)=>table==='profiles'?{select:()=>({eq:()=>({single:mocks.single})})}:{insert:mocks.insert,select:()=>({order:()=>({order:()=>({abortSignal:mocks.read})})})});
});
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
