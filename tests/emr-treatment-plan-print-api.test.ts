import {beforeEach,expect,test,vi} from 'vitest';
import {GET} from '@/app/api/emr/treatment-plans/route';
import {treatmentPlanIdentity} from '@/lib/emr/treatment-plan-report';
const m=vi.hoisted(()=>({access:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({emrAccess:m.access,privateHeaders:{'Cache-Control':'private, no-store'}}));
const pid='00000000-0000-4000-8000-000000000103',owner='00000000-0000-4000-8000-000000000200';let tables:Record<string,any[]>,calls:any[],broken:string;
beforeEach(()=>{broken='';calls=[];tables={clinical_patients:[{id:pid,demographics:{dob:'1990-01-02'},profiles:{full_name:'Fictional Patient'}}],emr_treatment_plans:[{id:'plan',patient_id:pid,owner_id:owner}],emr_treatment_plan_versions:[{id:'version',plan_id:'plan'}],emr_workspaces:[],emr_treatment_response_versions:[]};m.access.mockResolvedValue({user:{id:owner},supabase:{from:m.from}});m.from.mockImplementation((table:string)=>{const filters:any[]=[],state:{range?:number[]}={};calls.push({table,filters});const run=()=>{let data=tables[table]??[];for(const[key,value,kind]of filters)data=data.filter(row=>kind==='in'?value.includes(row[key]):row[key]===value);if(state.range)data=data.slice(state.range[0],state.range[1]+1);return{data,error:broken===table?{message:'Unavailable'}:null};};const q:any={select:()=>q,is:()=>q,eq:(key:string,value:any)=>{filters.push([key,value]);return q;},in:(key:string,value:any)=>{filters.push([key,value,'in']);return q;},order:()=>q,limit:()=>q,range:(a:number,b:number)=>{state.range=[a,b];return q;},single:async()=>({...run(),data:run().data[0]??null}),maybeSingle:async()=>({...run(),data:run().data[0]??null}),then:(done:any)=>Promise.resolve(run()).then(done)};return q;});});
const read=()=>GET(new Request('https://fictional.example/api/emr/treatment-plans?patient='+pid));
test('current chart identity overlays own earlier demographics and falls back to linked account name',async()=>{
 tables.emr_workspaces=[{patient_id:pid,owner_id:owner,state:{records:[{patient_id:pid,kind:'demographics',body:JSON.stringify({schema:'demographics/2',first_name:'Earlier',last_name:'Fictional',dob:'1980-02-03'})}]}}];
 const response=await read(),body=await response.json();expect(body.patient).toEqual({id:pid,name:'Earlier Fictional',dob:'1990-01-02'});expect(response.headers.get('cache-control')).toBe('private, no-store');expect(calls.find(c=>c.table==='emr_workspaces').filters).toContainEqual(['owner_id',owner]);
 expect(treatmentPlanIdentity({},[],pid,'Fictional Linked Account')).toEqual({id:pid,name:'Fictional Linked Account',dob:''});
});
test('only the latest Response for the exact visible saved version appears, without changing its saved plan status',async()=>{
 tables.emr_treatment_response_versions=[{patient_id:pid,revision:8,recorded_at:'2026-11-18T12:00:00Z',reference:'plan-version:other-version',participants:[]},{patient_id:pid,revision:7,recorded_at:'2026-11-18T11:00:00Z',reference:'plan-version:version',participants:[{role:'patient',name:'Fictional Patient',approval:'no'}]},{patient_id:pid,revision:6,recorded_at:'2026-11-17T11:00:00Z',reference:'plan-version:version',participants:[{role:'patient',name:'Fictional Patient',approval:'yes'}]}];
 const body=await(await read()).json();expect(body.approvals).toHaveLength(1);expect(body.approvals[0]).toMatchObject({versionId:'version',revision:7,participants:[{approval:'no'}]});expect(body.versions).toEqual(tables.emr_treatment_plan_versions);
});
test('unavailable approval/identity sources fail closed; anonymous and cross-patient workspace reads are rejected',async()=>{
 broken='emr_treatment_response_versions';expect((await read()).status).toBe(503);broken='';tables.emr_workspaces=[{patient_id:pid,owner_id:owner,state:{records:[{patient_id:'other'}]}}];expect((await read()).status).toBe(503);m.access.mockResolvedValue(null);expect((await read()).status).toBe(403);
});
test('earlier free-text approval is retained as explicitly unlinked and never substituted for a version-linked response',async()=>{
 tables.emr_treatment_response_versions=[{patient_id:pid,revision:3,recorded_at:'2026-11-13T12:00:00Z',reference:'Final plan discussed in session',participants:[{role:'patient',name:'Fictional Patient',approval:'yes'}]}];
 const body=await(await read()).json();expect(body.approvals).toEqual([]);expect(body.legacyApproval).toEqual({reference:'Final plan discussed in session',revision:3,recordedAt:'2026-11-13T12:00:00Z',patientApproval:'yes'});
});
