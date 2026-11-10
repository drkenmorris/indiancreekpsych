import {beforeEach,expect,test,vi} from 'vitest';
import {GET} from '@/app/api/emr/groups/patient/route';
const mocks=vi.hoisted(()=>({access:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({emrAccess:mocks.access,privateHeaders:{'Cache-Control':'private, no-store'}}));
const id='00000000-0000-0000-0000-000000000101';
const url=(patient=id)=>new Request('https://www.indiancreekpsych.com/api/emr/groups/patient?patient='+patient);
function setup({exists=true,groups=[],errorTable=''}:{exists?:boolean;groups?:unknown[];errorTable?:string}={}){
 const eqs:Array<[string,string]>=[],tables:string[]=[],orderBy:string[]=[];
 mocks.from.mockImplementation((name:string)=>{
   tables.push(name);
   const chain:any={
     select:()=>chain,
     eq:(key:string,value:string)=>{eqs.push([key,value]);return chain;},
     order:(column:string)=>{orderBy.push(column);return chain;},
     limit:async()=>({data:groups,error:name===errorTable?{message:'DB unavailable'}:null}),
     maybeSingle:async()=>({
       data:name==='clinical_patients'?(exists?{id}:null):{timezone:'America/Chicago'},
       error:name===errorTable?{message:'DB unavailable'}:null,
     }),
   };
   return chain;
 });
 mocks.access.mockResolvedValue({supabase:{from:mocks.from}});
 return {eqs,tables,orderBy};
}
beforeEach(()=>vi.clearAllMocks());
test('requires administrator MFA before any patient query',async()=>{
 mocks.access.mockResolvedValue(null);
 const r=await GET(url());expect(r.status).toBe(403);expect(mocks.from).not.toHaveBeenCalled();
 expect(r.headers.get('Cache-Control')).toBe('private, no-store');
});
test('refuses malformed or missing central UUID and unknown patient',async()=>{
 const q=setup({exists:false});
 expect((await GET(url('not-a-uuid'))).status).toBe(400);
 expect(q.tables).toEqual([]);
 expect((await GET(url())).status).toBe(404);
 expect(q.tables).toEqual(['clinical_patients']);
});
test('queries only the selected patients participation and emits no peer identifiers',async()=>{
 const q=setup({groups:[{attendance:'Present',session:{id:'00000000-0000-0000-0000-000000000201',group_name:'Fictional support group',scheduled_start:'2026-11-09T20:00:00Z',duration_minutes:60,shared_topic:'Skills',created_at:'2026-11-09T22:00:00Z',participants:[{patient_id:'DO-NOT-LEAK'}],shared_content:'NOT-FOR-PATIENT-HISTORY'}}]});
 const r=await GET(url());expect(r.status).toBe(200);
 const body=await r.json();
 expect(body.patientId).toBe(id);
 expect(body.timezone).toBe('America/Chicago');
 expect(body.sessions).toHaveLength(1);
 expect(body.sessions[0].attendance).toBe('Present');
 expect(JSON.stringify(body)).not.toContain('DO-NOT-LEAK');
 expect(JSON.stringify(body)).not.toContain('NOT-FOR-PATIENT-HISTORY');
 expect(q.eqs).toContainEqual(['patient_id',id]);
 expect(q.orderBy).toContain('session(scheduled_start)');
 expect(q.tables).toEqual(['clinical_patients','appointment_settings','emr_group_participation']);
 expect(mocks.from).toHaveBeenCalledTimes(3);
});
test('fails closed on unavailable RLS-backed records',async()=>{
 setup({errorTable:'emr_group_participation'});
 const response=await GET(url());expect(response.status).toBe(503);
 expect((await response.json()).sessions).toBeUndefined();
});
