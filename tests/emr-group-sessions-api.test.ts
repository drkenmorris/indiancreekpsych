import {beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/emr/groups/route';
const mocks=vi.hoisted(()=>({access:vi.fn(),sameOrigin:vi.fn(),rpc:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({emrAccess:mocks.access,sameOrigin:mocks.sameOrigin,privateHeaders:{'Cache-Control':'private, no-store'}}));
const p1='00000000-0000-0000-0000-000000000101',p2='00000000-0000-0000-0000-000000000102';
const body={group_name:'Fictional skills group',facilitators:'Example clinician',scheduled_start:'2026-11-09T20:00:00Z',duration_minutes:60,shared_topic:'Communication skills',shared_content:'Shared psychoeducation only.',reviewed:true,participants:[{patient_id:p1,attendance:'Present'},{patient_id:p2,attendance:'Absent'}]};
const request=(value:unknown)=>new Request('https://www.indiancreekpsych.com/api/emr/groups',{method:'POST',headers:{Origin:'https://www.indiancreekpsych.com','Content-Type':'application/json'},body:JSON.stringify(value)});
beforeEach(()=>{
  vi.clearAllMocks();mocks.sameOrigin.mockReturnValue(true);
  mocks.access.mockResolvedValue({supabase:{rpc:mocks.rpc,from:mocks.from}});
  mocks.rpc.mockResolvedValue({data:'00000000-0000-0000-0000-000000000800',error:null});
});
test('MFA sign-in and same-origin are required before any group write',async()=>{
  mocks.access.mockResolvedValue(null);expect((await POST(request(body))).status).toBe(403);expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.access.mockResolvedValue({supabase:{rpc:mocks.rpc}});mocks.sameOrigin.mockReturnValue(false);
  expect((await POST(request(body))).status).toBe(403);expect(mocks.rpc).not.toHaveBeenCalled();
});
test('requires reviewed shared content and distinct selected patients',async()=>{
  for(const bad of [{...body,reviewed:false},{...body,participants:[]},{...body,participants:[body.participants[0],body.participants[0]]},{...body,participants:[{patient_id:p1,attendance:'Present'},{patient_id:p2,attendance:'Unknown'}]},{...body,duration_minutes:0}]){
    expect((await POST(request(bad))).status).toBe(400);
  }
  expect(mocks.rpc).not.toHaveBeenCalled();
});
test('successful group save uses only validated central IDs and shared session fields',async()=>{
 const result=await POST(request({...body,untrusted_metadata:'do not save',participants:body.participants.map(p=>({...p,individual_clinical_note:'secret'}))}));
 expect(result.status).toBe(201);
 const [method,args]=mocks.rpc.mock.calls[0];expect(method).toBe('save_emr_group_session');
 expect(args.p_payload).not.toHaveProperty('untrusted_metadata');
 expect(args.p_payload.participants[0]).not.toHaveProperty('individual_clinical_note');
 expect(args.p_payload.participants).toHaveLength(2);
});
test('GET refuses unauthenticated callers and reads protected group tables',async()=>{
 mocks.access.mockResolvedValue(null);expect((await GET()).status).toBe(403);
 expect(mocks.from).not.toHaveBeenCalled();
 mocks.access.mockResolvedValue({supabase:{from:mocks.from}});
 const chain={select:()=>chain,order:()=>chain,limit:async()=>({data:[],error:null})};
 mocks.from.mockReturnValue(chain);
 const response=await GET();expect(response.status).toBe(200);
 expect(await response.json()).toEqual({sessions:[]});
 expect(mocks.from).toHaveBeenCalledWith('emr_group_sessions');
});
