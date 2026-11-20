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
  for(const bad of [{...body,reviewed:false},{...body,participants:[]},{...body,participants:[body.participants[0],body.participants[0]]},{...body,participants:[{patient_id:p1,attendance:'Present'},{patient_id:p2,attendance:'Unknown'}]},{...body,duration_minutes:0},{...body,scheduled_start:'2026-11-09T14:00:00'}]){
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
 const chain={select:()=>chain,order:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:{timezone:'America/Chicago'},error:null}),limit:async()=>({data:[],error:null})};
 mocks.from.mockReturnValue(chain);
 const response=await GET();expect(response.status).toBe(200);
 expect(await response.json()).toEqual({timezone:'America/Chicago',sessions:[]});
 expect(mocks.from).toHaveBeenCalledWith('emr_group_sessions');
 expect(mocks.from).toHaveBeenCalledWith('appointment_settings');
});

test('history uses stable date-and-ID pagination with full timestamp precision and only visible attendance',async()=>{
 const calls:any[]=[];const rows=Array.from({length:51},(_,i)=>({id:'00000000-0000-4000-8000-'+String(1000-i).padStart(12,'0'),group_name:'Fictional group',scheduled_start:'2026-11-19T17:00:00.123456+00:00',facilitators:'Fictional',duration_minutes:60,shared_topic:'Fictional',shared_content:'Fictional shared note',created_at:'2026-11-19T18:00:00Z'}));
 mocks.from.mockImplementation((table:string)=>{const q:any={select:()=>q,eq:()=>q,order:(...args:any[])=>{calls.push(['order',...args]);return q;},or:(filter:string)=>{calls.push(['or',filter]);return q;},maybeSingle:async()=>({data:{timezone:'America/Chicago'},error:null}),limit:async(n:number)=>{calls.push(['limit',n]);return {data:rows,error:null};},in:async(_key:string,ids:string[])=>{calls.push(['attendance',ids]);return {data:[{session_id:rows[0].id,patient_id:p1,attendance:'Present'}],error:null};}};return q;});
 const result=await GET(new Request('https://clinic.test/api/emr/groups?history=1'));expect(result.headers.get('cache-control')).toContain('no-store');const first=await result.json();expect(first.sessions).toHaveLength(50);expect(first.nextCursor).toEqual({start:rows[49].scheduled_start,id:rows[49].id});expect(first.sessions[0].participants).toEqual([{patient_id:p1,attendance:'Present'}]);expect(calls).toContainEqual(['limit',51]);expect(calls.find(c=>c[0]==='attendance')[1]).not.toContain(rows[50].id);
 const query=new URLSearchParams({history:'1',before:first.nextCursor.start,before_id:first.nextCursor.id});expect((await GET(new Request('https://clinic.test/api/emr/groups?'+query))).status).toBe(200);expect(calls).toContainEqual(['or','scheduled_start.lt.'+rows[49].scheduled_start+',and(scheduled_start.eq.'+rows[49].scheduled_start+',id.lt.'+rows[49].id+')']);expect(calls).toContainEqual(['order','id',{ascending:false}]);
});
test('bad history cursors fail before a data query and repository failures are explicit',async()=>{
 for(const query of ['history=1&before=invalid&before_id='+p1,'history=1&before=2026-11-19T17%3A00%3A00Z','before=2026-11-19T17%3A00%3A00Z&before_id='+p1,'history=1&before=2026-11-19T17%3A00%3A00Z&before_id=bad'])expect((await GET(new Request('https://clinic.test/api/emr/groups?'+query))).status).toBe(400);expect(mocks.from).not.toHaveBeenCalled();
 const q:any={select:()=>q,eq:()=>q,order:()=>q,maybeSingle:async()=>({data:{timezone:'America/Chicago'},error:null}),limit:async()=>({data:null,error:{message:'offline'}})};mocks.from.mockReturnValue(q);expect((await GET(new Request('https://clinic.test/api/emr/groups?history=1'))).status).toBe(503);
});

test('exact session readback is protected and independent of the first history page',async()=>{
 const calls:any[]=[];const q:any={select:()=>q,eq:(...args:any[])=>{calls.push(args);return q;},order:()=>q,maybeSingle:async()=>({data:{timezone:'America/Chicago'},error:null}),limit:async(n:number)=>{calls.push(['limit',n]);return {data:[],error:null};}};mocks.from.mockReturnValue(q);
 expect((await GET(new Request('https://clinic.test/api/emr/groups?session='+p1))).status).toBe(200);expect(calls).toContainEqual(['id',p1]);expect(calls).toContainEqual(['limit',1]);expect((await GET(new Request('https://clinic.test/api/emr/groups?session=bad'))).status).toBe(400);
});
