import {beforeEach,expect,test,vi} from 'vitest';
import {POST} from '@/app/api/emr/logout/route';
const m=vi.hoisted(()=>({access:vi.fn(),sameOrigin:vi.fn(),signOut:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({emrAccess:m.access,sameOrigin:m.sameOrigin,privateHeaders:{'Cache-Control':'private, no-store'}}));
beforeEach(()=>{vi.clearAllMocks();m.access.mockResolvedValue({supabase:{auth:{signOut:m.signOut}}});m.sameOrigin.mockReturnValue(true);m.signOut.mockResolvedValue({error:null});});
const request=()=>new Request('https://example.invalid/api/emr/logout',{method:'POST'});
test('original Logout action signs out the verified clinic session',async()=>{expect((await POST(request())).status).toBe(200);expect(m.signOut).toHaveBeenCalledOnce();});
test('unverified and cross-origin requests cannot sign out through the clinical endpoint',async()=>{m.access.mockResolvedValue(null);expect((await POST(request())).status).toBe(403);m.access.mockResolvedValue({supabase:{auth:{signOut:m.signOut}}});m.sameOrigin.mockReturnValue(false);expect((await POST(request())).status).toBe(403);expect(m.signOut).not.toHaveBeenCalled();});
