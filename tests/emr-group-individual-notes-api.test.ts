import {beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/emr/groups/individual-notes/route';
import {GET as GET_AMENDMENTS,POST as POST_AMENDMENTS} from '@/app/api/emr/groups/individual-notes/amendments/route';
const mocks=vi.hoisted(()=>({access:vi.fn(),sameOrigin:vi.fn(),rpc:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({emrAccess:mocks.access,sameOrigin:mocks.sameOrigin,privateHeaders:{'Cache-Control':'private, no-store'}}));
const p='00000000-0000-0000-0000-000000000101',s='00000000-0000-0000-0000-000000000201';
const note={patient_id:p,session_id:s,template:'DAP',sections:{data:'Participation in the session',assessment:'Documented observed response',plan:'Follow-up group work'},reviewed:true};
const post=(body:unknown)=>new Request('https://www.indiancreekpsych.com/api/emr/groups/individual-notes',
 {method:'POST',headers:{Origin:'https://www.indiancreekpsych.com','Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{
 vi.clearAllMocks();mocks.sameOrigin.mockReturnValue(true);
 mocks.access.mockResolvedValue({supabase:{rpc:mocks.rpc,from:mocks.from}});
 mocks.rpc.mockResolvedValue({data:'00000000-0000-0000-0000-000000000299',error:null});
});
test('MFA and same-origin gate individual progress-note writes and reads',async()=>{
 mocks.access.mockResolvedValue(null);
 expect((await GET(new Request('https://www.indiancreekpsych.com/api/emr/groups/individual-notes?patient='+p+'&session='+s))).status).toBe(403);
 expect((await POST(post(note))).status).toBe(403);expect(mocks.rpc).not.toHaveBeenCalled();
 mocks.access.mockResolvedValue({supabase:{rpc:mocks.rpc}});mocks.sameOrigin.mockReturnValue(false);
 expect((await POST(post(note))).status).toBe(403);
});
test('validated DAP note is appended through exact RPC without untrusted content',async()=>{
 const r=await POST(post({...note,signature:'forged',sections:{...note.sections}}));expect(r.status).toBe(201);
 const [method,args]=mocks.rpc.mock.calls[0];
 expect(method).toBe('save_emr_group_individual_note');expect(args.p_payload).not.toHaveProperty('signature');
 expect(args.p_payload.sections).toEqual(note.sections);
 expect(await r.json()).toEqual({id:'00000000-0000-0000-0000-000000000299',saved:true,unsigned:true});
});
test('wrong template keys, missing review and forged patient IDs cannot reach storage',async()=>{
 for(const bad of [{...note,reviewed:false},{...note,patient_id:'bad'},
  {...note,template:'Unknown'},{...note,sections:{...note.sections,secret:'hidden'}},
  {...note,sections:{data:'',assessment:'Valid note',plan:'Plan'}},
  {...note,template:'Narrative',sections:note.sections}]){
  expect((await POST(post(bad))).status).toBe(400);
 }
 expect(mocks.rpc).not.toHaveBeenCalled();
});
test('read filters by both bound patient and session and never requests other participant notes',async()=>{
 const q={select:()=>q,eq:vi.fn(()=>q),order:()=>q,limit:async()=>({data:[],error:null})};
 mocks.from.mockReturnValue(q);
 const r=await GET(new Request('https://www.indiancreekpsych.com/api/emr/groups/individual-notes?patient='+p+'&session='+s));
 expect(r.status).toBe(200);expect(await r.json()).toEqual({patientId:p,sessionId:s,notes:[]});
 expect(q.eq).toHaveBeenCalledWith('patient_id',p);expect(q.eq).toHaveBeenCalledWith('session_id',s);
});

test('note addenda require MFA, same-origin, explicit review and bound note IDs',async()=>{
 const n='00000000-0000-0000-0000-000000000299';
 const body={note_id:n,patient_id:p,session_id:s,reason:'Clarification',amendment:'Additional reviewed information.',reviewed:true};
 const send=(value:unknown)=>new Request('https://www.indiancreekpsych.com/api/emr/groups/individual-notes/amendments',
  {method:'POST',headers:{Origin:'https://www.indiancreekpsych.com','Content-Type':'application/json'},body:JSON.stringify(value)});
 mocks.access.mockResolvedValue(null);
 expect((await POST_AMENDMENTS(send(body))).status).toBe(403);
 mocks.access.mockResolvedValue({supabase:{rpc:mocks.rpc,from:mocks.from}});
 mocks.sameOrigin.mockReturnValue(false);
 expect((await POST_AMENDMENTS(send(body))).status).toBe(403);
 mocks.sameOrigin.mockReturnValue(true);
 for(const bad of [{...body,reviewed:false},{...body,note_id:'bad'},{...body,reason:'x'},{...body,amendment:''}]){
  expect((await POST_AMENDMENTS(send(bad))).status).toBe(400);
 }
 expect(mocks.rpc).not.toHaveBeenCalled();
 const response=await POST_AMENDMENTS(send({...body,forged_signature:'clinician'}));
 expect(response.status).toBe(201);
 const [method,args]=mocks.rpc.mock.calls[0];
 expect(method).toBe('save_emr_group_note_amendment');
 expect(args.p_payload).toEqual(body);
 expect(args.p_payload).not.toHaveProperty('forged_signature');
});
test('addendum history reads only after matching the exact original patient and session',async()=>{
 const n='00000000-0000-0000-0000-000000000299';
 const note={select:()=>note,eq:vi.fn(()=>note),maybeSingle:async()=>({data:{id:n},error:null})};
 const amendments={select:()=>amendments,eq:vi.fn(()=>amendments),order:()=>amendments,limit:async()=>({data:[],error:null})};
 mocks.from.mockImplementation((name:string)=>name==='emr_group_individual_notes'?note:amendments);
 const response=await GET_AMENDMENTS(new Request('https://www.indiancreekpsych.com/api/emr/groups/individual-notes/amendments?note='+n+'&patient='+p+'&session='+s));
 expect(response.status).toBe(200);
 expect(await response.json()).toEqual({noteId:n,patientId:p,sessionId:s,amendments:[]});
 expect(note.eq).toHaveBeenCalledWith('patient_id',p);
 expect(note.eq).toHaveBeenCalledWith('session_id',s);
 expect(amendments.eq).toHaveBeenCalledWith('note_id',n);
});
