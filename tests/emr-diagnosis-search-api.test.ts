import {beforeEach,expect,test,vi} from 'vitest';
import {POST} from '@/app/api/emr/diagnoses/search/route';
const mock=vi.hoisted(()=>({access:vi.fn()}));
vi.mock('@/lib/emr/modality-access',()=>({modalityAccess:mock.access}));
const request=(body:unknown)=>new Request('https://clinic.test/api/emr/diagnoses/search',{method:'POST',body:JSON.stringify(body)});
beforeEach(()=>mock.access.mockResolvedValue({admin:true}));
test('reference search requires clinic MFA and returns private results without patient data',async()=>{
 mock.access.mockResolvedValue(null);
 expect((await POST(request({query:'GAD'}))).status).toBe(403);
 mock.access.mockResolvedValue({admin:true});
 const response=await POST(request({query:'GAD',source:'nimh'}));
 expect(response.headers.get('cache-control')).toBe('private, no-store');
 const data=await response.json();
 expect(data.results.length).toBeGreaterThan(0);
 expect(data.patientId).toBeUndefined();
});
test('validates source, query, request size, JSON and pagination at the server boundary',async()=>{
 for(const body of [null,[],{}, {query:[]},{query:' '},{query:'a'.repeat(161)},{query:'GAD',source:'internet'},{query:'GAD',offset:-1},{query:'GAD',offset:0.5},{query:'GAD',offset:501}])expect((await POST(request(body))).status).toBe(400);
 expect((await POST(new Request('https://clinic.test',{method:'POST',body:'not json'}))).status).toBe(400);
 expect((await POST(new Request('https://clinic.test',{method:'POST',headers:{'content-length':'3000'},body:'{}'}))).status).toBe(413);
});
