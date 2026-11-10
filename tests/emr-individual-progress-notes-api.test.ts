import {beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/emr/progress-notes/route';
const mocks=vi.hoisted(()=>({access:vi.fn(),sameOrigin:vi.fn(),rpc:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({emrAccess:mocks.access,sameOrigin:mocks.sameOrigin,privateHeaders:{'Cache-Control':'private, no-store'}}));
const p='00000000-0000-0000-0000-000000000101',other='00000000-0000-0000-0000-000000000102',n='00000000-0000-0000-0000-000000000201';
const note={action:'note',patient_id:p,encounter_at:'2026-11-09T20:00:00Z',encounter_type:'Individual therapy',
 template:'DAP',sections:{data:'Observed presentation',assessment:'Response documented',plan:'Continue therapy'},reviewed:true};
const post=(body:unknown)=>new Request('https://www.indiancreekpsych.com/api/emr/progress-notes',{method:'POST',
 headers:{Origin:'https://www.indiancreekpsych.com','Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{
 vi.clearAllMocks();mocks.sameOrigin.mockReturnValue(true);
 mocks.access.mockResolvedValue({supabase:{rpc:mocks.rpc,from:mocks.from}});
 mocks.rpc.mockResolvedValue({data:n,error:null});
});
test('MFA authorization and same-origin gate prevent unauthorized progress-note access',async()=>{
 mocks.access.mockResolvedValue(null);
 expect((await GET(new Request('https://www.indiancreekpsych.com/api/emr/progress-notes?patient='+p))).status).toBe(403);
 expect((await POST(post(note))).status).toBe(403);
 mocks.access.mockResolvedValue({supabase:{rpc:mocks.rpc}});mocks.sameOrigin.mockReturnValue(false);
 expect((await POST(post(note))).status).toBe(403);expect(mocks.rpc).not.toHaveBeenCalled();
});
test('reviewed note uses dedicated immutable RPC and drops forged signature/billing fields',async()=>{
 const response=await POST(post({...note,signature:'forged',charge:999,sections:{...note.sections}}));
 expect(response.status).toBe(201);
 expect(await response.json()).toEqual({id:n,saved:true,unsigned:true,kind:'note'});
 const [method,args]=mocks.rpc.mock.calls[0];
 expect(method).toBe('save_emr_individual_progress_note');expect(args.p_payload).toEqual({
  patient_id:p,encounter_at:note.encounter_at,encounter_type:'Individual therapy',
  template:'DAP',sections:note.sections,reviewed:true,
 });
 expect(JSON.stringify(args.p_payload)).not.toContain('forged');
});
test('unreviewed, invalid patient, unknown templates, timezone-less times and extra sections cannot save',async()=>{
 for(const bad of [
  {...note,reviewed:false},{...note,patient_id:'invalid'}, {...note,encounter_at:'2026-11-09T15:00:00'},
  {...note,template:'INVALID'},{...note,encounter_type:'Synthetic therapy'},
  {...note,sections:{...note.sections,extra:'do not accept'}},{...note,sections:{...note.sections,data:''}},
  {...note,template:'SOAP'}, {...note,action:'wrong'},
 ])expect((await POST(post(bad))).status).toBe(400);
 expect(mocks.rpc).not.toHaveBeenCalled();
});
test('append-only addendum binds patient and original note, ignores forged sign-off',async()=>{
 const add={action:'addendum',patient_id:p,note_id:n,reason:'Clarify details',amendment:'Additional reviewed patient information.',reviewed:true};
 const response=await POST(post({...add,provider_signature:'forged'}));
 expect(response.status).toBe(201);expect((await response.json()).kind).toBe('addendum');
 expect(mocks.rpc).toHaveBeenCalledWith('save_emr_individual_progress_note_addendum',{p_payload:{
  patient_id:p,note_id:n,reason:add.reason,amendment:add.amendment,reviewed:true,
 }});
});
test('invalid addendum refuses save before database',async()=>{
 for(const bad of [
  {action:'addendum',patient_id:p,note_id:n,reason:'short',amendment:'Too little',reviewed:false},
  {action:'addendum',patient_id:p,note_id:'bad',reason:'Clarification',amendment:'New record',reviewed:true},
  {action:'addendum',patient_id:p,note_id:n,reason:'bad',amendment:'New record',reviewed:true},
 ])expect((await POST(post(bad))).status).toBe(400);
 expect(mocks.rpc).not.toHaveBeenCalled();
});
test('reads verify central patient and bind both notes and addenda to exact chart IDs',async()=>{
 const patient={select:()=>patient,eq:vi.fn(()=>patient),maybeSingle:async()=>({data:{id:p},error:null})};
 const notes={select:()=>notes,eq:vi.fn(()=>notes),order:()=>notes,limit:async()=>({data:[{id:n,patient_id:p}],error:null})};
 const addenda={select:()=>addenda,in:vi.fn(()=>addenda),order:()=>addenda,limit:async()=>({data:[{id:other,note_id:n}],error:null})};
 mocks.from.mockImplementation((table:string)=>table==='clinical_patients'?patient:
  table==='emr_individual_progress_notes'?notes:addenda);
 const response=await GET(new Request('https://www.indiancreekpsych.com/api/emr/progress-notes?patient='+p));
 expect(response.status).toBe(200);
 expect(await response.json()).toEqual({patientId:p,notes:[{id:n,patient_id:p}],addenda:[{id:other,note_id:n}]});
 expect(patient.eq).toHaveBeenCalledWith('id',p);
 expect(notes.eq).toHaveBeenCalledWith('patient_id',p);
 expect(addenda.in).toHaveBeenCalledWith('note_id',[n]);
});
test('missing central patient fails closed before querying clinical note tables',async()=>{
 const patient={select:()=>patient,eq:()=>patient,maybeSingle:async()=>({data:null,error:null})};
 mocks.from.mockReturnValue(patient);
 const response=await GET(new Request('https://www.indiancreekpsych.com/api/emr/progress-notes?patient='+p));
 expect(response.status).toBe(404);
 expect(mocks.from).toHaveBeenCalledTimes(1);
});
