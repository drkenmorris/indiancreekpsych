import {beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/emr/groups/individual-notes/attest/route';
const m=vi.hoisted(()=>({access:vi.fn(),origin:vi.fn(),from:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({
 emrAccess:m.access,sameOrigin:m.origin,privateHeaders:{'Cache-Control':'private, no-store'}
}));
const patient='00000000-0000-0000-0000-000000000103',
 session='00000000-0000-0000-0000-000000000201',
 note='00000000-0000-0000-0000-000000000301',
 signature='00000000-0000-0000-0000-000000000401';
const payload={patient_id:patient,session_id:session,note_id:note,typed_name:'Fictional Group Clinician',attested:true};
const path='https://www.indiancreekpsych.com/api/emr/groups/individual-notes/attest';
const post=(value:unknown)=>new Request(path,{method:'POST',
 headers:{'Content-Type':'application/json',Origin:'https://www.indiancreekpsych.com'},body:JSON.stringify(value)});
beforeEach(()=>{
 vi.resetAllMocks();m.origin.mockReturnValue(true);
 m.access.mockResolvedValue({supabase:{rpc:m.rpc,from:m.from}});
 m.rpc.mockResolvedValue({data:signature,error:null});
});
test('both API methods require protected administrator MFA and POST requires same origin',async()=>{
 m.access.mockResolvedValue(null);
 expect((await GET(new Request(path+'?note='+note+'&patient='+patient+'&session='+session))).status).toBe(403);
 expect((await POST(post(payload))).status).toBe(403);
 m.access.mockResolvedValue({supabase:{rpc:m.rpc,from:m.from}});
 m.origin.mockReturnValue(false);
 expect((await POST(post(payload))).status).toBe(403);
 expect(m.rpc).not.toHaveBeenCalled();
});
test('POST strips forged signer, timestamp and signed content, and persists only reviewed IDs/name',async()=>{
 const r=await POST(post({...payload,owner_id:'forged',signed_at:'1900',signed_content:{fake:true}}));
 expect(r.status).toBe(201);
 expect(await r.json()).toEqual({id:signature,signed:true,scope:'original-group-note-only'});
 expect(m.rpc).toHaveBeenCalledWith('attest_emr_group_individual_note',{p_payload:payload});
 expect(r.headers.get('Cache-Control')).toBe('private, no-store');
});
test('POST refuses missing review, invalid identifiers, empty names, excess request and duplicate sign',async()=>{
 for(const bad of [{...payload,attested:false},{...payload,note_id:'invalid'},
  {...payload,session_id:'invalid'},{...payload,patient_id:'invalid'},
  {...payload,typed_name:'x'}, {...payload,typed_name:'a'.repeat(161)}])
  expect((await POST(post(bad))).status).toBe(400);
 expect((await POST(post({...payload,junk:'a'.repeat(1800)}))).status).toBe(413);
 expect(m.rpc).not.toHaveBeenCalled();
 m.rpc.mockResolvedValue({error:{code:'23505'},data:null});
 expect((await POST(post(payload))).status).toBe(409);
 m.rpc.mockResolvedValue({error:{code:'42501'},data:null});
 expect((await POST(post(payload))).status).toBe(403);
 m.rpc.mockResolvedValue({error:{code:'22023'},data:null});
 expect((await POST(post(payload))).status).toBe(400);
 m.rpc.mockResolvedValue({error:{code:'offline'},data:null});
 expect((await POST(post(payload))).status).toBe(503);
});
test('GET verifies original note belongs to selected patient/session before retrieving author attestation',async()=>{
 const original={select:()=>original,eq:vi.fn(()=>original),maybeSingle:async()=>({data:{id:note},error:null})};
 const signed={select:()=>signed,eq:vi.fn(()=>signed),
  maybeSingle:async()=>({data:{id:signature,note_id:note,signer_name:'Fictional Group Clinician',signed_at:'2026-11-10T07:00:00Z'},error:null})};
 m.from.mockImplementation((table:string)=>table==='emr_group_individual_notes'?original:signed);
 const result=await GET(new Request(path+'?note='+note+'&patient='+patient+'&session='+session));
 expect(result.status).toBe(200);
 expect(await result.json()).toEqual({noteId:note,patientId:patient,sessionId:session,
  attestation:{id:signature,note_id:note,signer_name:'Fictional Group Clinician',signed_at:'2026-11-10T07:00:00Z'}});
 expect(original.eq).toHaveBeenCalledWith('patient_id',patient);
 expect(original.eq).toHaveBeenCalledWith('session_id',session);
 expect(signed.eq).toHaveBeenCalledWith('note_id',note);
});
test('GET fails closed on mismatched chart and missing attestation table',async()=>{
 const original={select:()=>original,eq:()=>original,maybeSingle:async()=>({data:null,error:null})};
 m.from.mockReturnValue(original);
 expect((await GET(new Request(path+'?note='+note+'&patient='+patient+'&session='+session))).status).toBe(404);
 const good={select:()=>good,eq:()=>good,maybeSingle:async()=>({data:{id:note},error:null})};
 const broken={select:()=>broken,eq:()=>broken,maybeSingle:async()=>({data:null,error:{message:'not migrated'}})};
 m.from.mockImplementation((table:string)=>table==='emr_group_individual_notes'?good:broken);
 expect((await GET(new Request(path+'?note='+note+'&patient='+patient+'&session='+session))).status).toBe(503);
});
