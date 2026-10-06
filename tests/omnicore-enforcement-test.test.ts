// @vitest-environment node
import {afterEach,expect,test,vi} from 'vitest';
const state=vi.hoisted(()=>({blocked:false, options:null as any}));
vi.mock('next/server',()=>({after:vi.fn()}));
vi.mock('@/lib/omnicore-monitoring',()=>({siteMonitor:()=>({withRoute:(fn:any,options:any)=>{state.options=options;return (req:any)=>state.blocked?new Response('blocked',{status:403}):fn(req);}})}));
import { GET } from '../app/api/omnicore-test/route';
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();state.blocked=false;});
test('diagnostic is unavailable unless explicitly enabled',async()=>{
 vi.stubEnv('OMNICORE_ENFORCEMENT_TEST_ENABLED','');
 expect((await GET(new Request('https://example.test/api/omnicore-test'))).status).toBe(404);
});
test('diagnostic is synthetic and execution marker exists only when handler runs',async()=>{
 vi.stubEnv('OMNICORE_ENFORCEMENT_TEST_ENABLED','true');vi.stubEnv('OMNICORE_ENFORCEMENT_ENABLED','true');
 const log=vi.spyOn(console,'info').mockImplementation(()=>{});
 const req=()=>new Request('https://example.test/api/omnicore-test?probe=11111111-1111-4111-8111-111111111111');
 const allowed=await GET(req());expect(allowed.status).toBe(200);expect(allowed.headers.get('X-OmniCore-Test-Executed')).toBe('1');expect(log).toHaveBeenCalledTimes(1);
 expect(state.options).toMatchObject({synthetic:true,enforcement:true,route:'/api/omnicore-test',scope:'application'});
 state.blocked=true;const blocked=await GET(req());expect(blocked.status).toBe(403);expect(blocked.headers.has('X-OmniCore-Test-Executed')).toBe(false);expect(log).toHaveBeenCalledTimes(1);
});
