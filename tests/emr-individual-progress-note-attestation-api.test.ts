import {beforeEach,expect,test,vi} from 'vitest';
import {POST} from '@/app/api/emr/progress-notes/attest/route';
const mocks=vi.hoisted(()=>({access:vi.fn(),origin:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({emrAccess:mocks.access,sameOrigin:mocks.origin,privateHeaders:{'Cache-Control':'private, no-store'}}));
const patient='00000000-0000-0000-0000-000000000103',note='00000000-0000-0000-0000-000000000201',
 signedId='00000000-0000-0000-0000-000000000301';
const payload={patient_id:patient,note_id:note,typed_name:'Fictional Clinician',attested:true};
const request=(body:unknown)=>new Request('https://www.indiancreekpsych.com/api/emr/progress-notes/attest',{
 method:'POST',headers:{Origin:'https://www.indiancreekpsych.com','Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{
 vi.resetAllMocks();mocks.origin.mockReturnValue(true);
 mocks.access.mockResolvedValue({supabase:{rpc:mocks.rpc}});
 mocks.rpc.mockResolvedValue({data:signedId,error:null});
});
test('MFA/admin and same-origin checks reject unauthorized clinical attestation',async()=>{
 mocks.access.mockResolvedValue(null);
 expect((await POST(request(payload))).status).toBe(403);
 mocks.access.mockResolvedValue({supabase:{rpc:mocks.rpc}});
 mocks.origin.mockReturnValue(false);
 expect((await POST(request(payload))).status).toBe(403);
 expect(mocks.rpc).not.toHaveBeenCalled();
});
test('author attestation strips forged owner, signature time and signed content',async()=>{
 const result=await POST(request({...payload,owner_id:'forged',signed_at:'1900-01-01',signed_content:{sections:'forged'}}));
 expect(result.status).toBe(201);
 expect(await result.json()).toEqual({id:signedId,signed:true,scope:'original-note-only'});
 expect(mocks.rpc).toHaveBeenCalledWith('attest_emr_individual_progress_note',{
  p_payload:payload
 });
 expect(result.headers.get('Cache-Control')).toBe('private, no-store');
});
test('unreviewed, forged patient/note, missing matching name and oversized payload reject before RPC',async()=>{
 for(const bad of [{...payload,attested:false},{...payload,note_id:'broken'},
  {...payload,patient_id:'broken'},{...payload,typed_name:'  x '},
  {...payload,typed_name:'a'.repeat(170)}])
  expect((await POST(request(bad))).status).toBe(400);
 const big={...payload,junk:'a'.repeat(2000)};
 expect((await POST(request(big))).status).toBe(413);
 expect(mocks.rpc).not.toHaveBeenCalled();
});
test('duplicate author attestation conflicts and no credential or billing claim is emitted',async()=>{
 mocks.rpc.mockResolvedValue({data:null,error:{code:'23505',message:'duplicate'}});
 expect((await POST(request(payload))).status).toBe(409);
 mocks.rpc.mockResolvedValue({data:null,error:{code:'42501',message:'denied'}});
 expect((await POST(request(payload))).status).toBe(403);
 mocks.rpc.mockResolvedValue({data:null,error:{code:'22023',message:'bad-name'}});
 expect((await POST(request(payload))).status).toBe(400);
 mocks.rpc.mockResolvedValue({data:null,error:{code:'unknown',message:'offline'}});
 expect((await POST(request(payload))).status).toBe(503);
});
