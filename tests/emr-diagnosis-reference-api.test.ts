import {beforeEach,expect,test,vi} from 'vitest';
import {GET} from '@/app/api/emr/diagnoses/reference/route';
const mock=vi.hoisted(()=>({access:vi.fn()}));
vi.mock('@/lib/emr/modality-access',()=>({modalityAccess:mock.access}));
const request=(query:string)=>new Request('https://clinic.test/api/emr/diagnoses/reference?'+query);
beforeEach(()=>mock.access.mockResolvedValue({admin:true}));
test('reference and downloadable audit require the existing clinic MFA gate',async()=>{
 mock.access.mockResolvedValue(null);
 expect((await GET(request('code=F41.1'))).status).toBe(403);
 expect((await GET(request('coverage=1'))).status).toBe(403);
});
test('reference rejects invalid or unavailable code selections and returns no patient data',async()=>{
 expect((await GET(request('code=invalid'))).status).toBe(400);
 expect((await GET(request('code=G30.9'))).status).toBe(404);
 const response=await GET(request('code=F41.1'));
 expect(response.headers.get('cache-control')).toBe('private, no-store');
 const data=await response.json();
 expect(data.code).toBe('F41.1');expect(data.criteria).not.toBeNull();expect(data.patientId).toBeUndefined();
});
test('text audit contains the complete missing-code list and correct historical distinction',async()=>{
 const response=await GET(request('coverage=1'));
 expect(response.headers.get('content-disposition')).toContain('attachment');
 const text=await response.text();
 expect(text).toContain('Current referenced codes absent: 70');
 expect(text).toContain('HISTORICAL / NONTERMINAL');
});
