import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import IndividualProgressPlanner from '@/app/emr/individual-progress-planner/IndividualProgressPlanner';
import type {ResolvedNode} from '@/lib/emr/treatment-planner';
const patientId='00000000-0000-4000-8000-000000000103';
const node=(kind:ResolvedNode['kind'],id:string,text:string,children:ResolvedNode[]=[]):ResolvedNode=>({kind,id,text,source_text:'Original library wording',children});
function payload(){return {patient:{id:patientId,name:'Fictional Example'},nodes:[],libraryRevision:1,entries:[],versions:[{id:'v2',plan_id:'p',revision:2,created_at:'2026-11-17T12:00:00Z',snapshot:{title:'Saved patient plan',status:'finalized',problems:[{...node('problem','p1','First saved problem',[node('definition','d1','First definition'),node('goal','g1','First goal'),node('objective','o1','First objective',[node('intervention','i1','First patient-specific planned intervention')])]),primary:true},node('problem','p2','Second saved problem',[node('definition','d2','Second definition'),node('goal','g2','Second goal'),node('objective','o2','Second objective',[node('intervention','i2','Second planned intervention')])])]}}]};}
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('two patient problems are separate complete groups using saved patient wording, not library text',async()=>{
 const fetch=vi.fn(async(_url:string,_options?:RequestInit)=>Response.json(payload()));vi.stubGlobal('fetch',fetch);
 render(<IndividualProgressPlanner patientId={patientId}/>);
 await screen.findByRole('heading',{name:'Problem 1: First saved problem'});
 const first=screen.getByRole('heading',{name:'Problem 1: First saved problem'}).closest('article')!;
 const second=screen.getByRole('heading',{name:'Problem 2: Second saved problem'}).closest('article')!;
 for(const text of ['First definition','First goal','First objective','First patient-specific planned intervention'])expect(within(first).getByText(text)).toBeTruthy();
 expect(within(first).queryByText('Second planned intervention')).toBeNull();
 for(const text of ['Second definition','Second goal','Second objective','Second planned intervention'])expect(within(second).getByText(text)).toBeTruthy();
 expect(screen.queryByText('Original library wording')).toBeNull();expect(screen.getAllByRole('heading',{name:'Planned Interventions'})).toHaveLength(2);
 expect(screen.getByText(/Version 2/).textContent).toContain('Finalized plan');
 expect(fetch.mock.calls[0][0]).toContain(patientId);expect(screen.queryByText('Save')).toBeNull();
});
test('earlier nested definitions/goals/objectives keep their saved associations and preserve literal text',async()=>{
 const data=payload();data.versions[0].snapshot.problems=[node('problem','p','Historical problem',[node('definition','d','Saved definition',[node('goal','g','Saved goal',[node('objective','o','Saved objective',[node('intervention','i','<script>Fictional literal text</script>')])])])])];
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(data)));render(<IndividualProgressPlanner patientId={patientId}/>);
 const heading=await screen.findByRole('heading',{name:'Planned Interventions'});
 expect(heading.closest('section')?.parentElement?.closest('section')?.textContent).toContain('Saved objective');
 expect(screen.getByText('<script>Fictional literal text</script>')).toBeTruthy();expect(document.querySelector('script')).toBeNull();
});
test('no saved plan, an empty draft, source failures, and wrong-patient responses are explicit',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(Response.json({patient:{id:patientId,name:'Fictional'},nodes:[],libraryRevision:1,entries:[],versions:[]})).mockResolvedValueOnce(Response.json({error:'Unavailable'},{status:503})).mockResolvedValueOnce(Response.json({...payload(),patient:{id:'another-patient'}})).mockResolvedValueOnce(Response.json({...payload(),versions:[{...payload().versions[0],snapshot:{title:'Blank draft',status:'draft',problems:[]}}]}));
 vi.stubGlobal('fetch',fetch);render(<IndividualProgressPlanner patientId={patientId}/>);
 await screen.findByText(/No saved treatment plan is available/);
 fireEvent.click(screen.getByRole('button',{name:'Refresh saved treatment plan'}));await screen.findByRole('alert');expect(screen.getByRole('alert').textContent).toBe('Unavailable');
 fireEvent.click(screen.getByRole('button',{name:'Refresh saved treatment plan'}));await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('did not match'));
 fireEvent.click(screen.getByRole('button',{name:'Refresh saved treatment plan'}));await screen.findByText('This saved draft has no selected problems.');expect(screen.getByText(/Draft plan — not finalized/)).toBeTruthy();
});
test('changing the patient removes old source immediately and ignores late responses',async()=>{
 let resolve!:(value:Response)=>void;const fetch=vi.fn().mockImplementationOnce(()=>new Promise<Response>(r=>{resolve=r;})).mockResolvedValueOnce(Response.json({patient:{id:'next',name:'Next fictional'},nodes:[],libraryRevision:1,entries:[],versions:[]}));vi.stubGlobal('fetch',fetch);
 const view=render(<IndividualProgressPlanner patientId={patientId}/>);view.rerender(<IndividualProgressPlanner patientId="next"/>);
 await screen.findByText(/No saved treatment plan is available/);resolve(Response.json(payload()));await Promise.resolve();await Promise.resolve();
 expect(screen.queryByText('First saved problem')).toBeNull();expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
});

const linkedNodes=()=>[
 ...['1','2'].flatMap(i=>[{id:'p'+i,kind:'problem',parent:null,text:'Library problem '+i,active:true},{id:'o'+i,kind:'objective',parent:'p'+i,text:'Library objective '+i,active:true},{id:'i'+i,kind:'intervention',parent:'o'+i,text:'Library planned '+i,active:true},{id:'done'+i,kind:'implemented_intervention',parent:'i'+i,text:'Implemented choice '+i,active:true}]),
];
test('each problem has its own scrollable region and only its aligned implemented choices; no plan-editor link exists',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({...payload(),nodes:linkedNodes()})));
 render(<IndividualProgressPlanner patientId={patientId}/>);await screen.findByRole('heading',{name:'Problem 1: First saved problem'});
 expect(screen.getByRole('region',{name:'Problem 1: First saved problem'}).className).toBe('progressPlanContext');expect(screen.getByRole('region',{name:'Problem 2: Second saved problem'}).getAttribute('tabindex')).toBe('0');
 expect(within(screen.getByLabelText('Select an implemented intervention for Problem 1')).getByRole('option',{name:'Implemented choice 1'})).toBeTruthy();expect(within(screen.getByLabelText('Select an implemented intervention for Problem 1')).queryByRole('option',{name:'Implemented choice 2'})).toBeNull();
 expect(document.querySelector('a[href*="treatment-plan"]')).toBeNull();
});
test('implemented selections from two problems save with plan version and library provenance, then reopen as immutable session history',async()=>{
 let entry:any;const fetch=vi.fn(async(_url,options)=>{if(options?.method==='POST'){const body=JSON.parse(options.body);entry={id:body.id,session_date:body.sessionDate,plan_version_id:body.planVersionId,library_revision:body.libraryRevision,selection_ids:body.selections,snapshot:{plan_title:'Saved patient plan',plan_revision:2,plan_status:'finalized',selections:body.selections.map((s:any)=>({id:s.implementedId,problemId:s.problemId,problemText:'Saved '+s.problemId,text:'Implemented '+s.implementedId,plannedText:'Saved planned wording',objectiveText:'Saved objective'}))}};return Response.json({saved:true,entry});}return Response.json({...payload(),nodes:linkedNodes(),entries:entry?[entry]:[]});});vi.stubGlobal('fetch',fetch);
 const view=render(<IndividualProgressPlanner patientId={patientId}/>);await screen.findByLabelText('Session date');fireEvent.change(screen.getByLabelText('Session date'),{target:{value:'2026-01-01'}});
 for(const i of [1,2])fireEvent.change(screen.getByLabelText('Select an implemented intervention for Problem '+i),{target:{value:'done'+i}});
 fireEvent.click(screen.getByRole('button',{name:'Save implemented interventions'}));await screen.findByText(/Implemented interventions saved to this patient/);expect(entry.selection_ids).toEqual([{problemId:'p1',implementedId:'done1'},{problemId:'p2',implementedId:'done2'}]);expect(entry.plan_version_id).toBe('v2');expect(document.querySelector('[data-implemented-dirty="true"]')).toBeNull();
 view.unmount();render(<IndividualProgressPlanner patientId={patientId}/>);await screen.findByText('Saved session intervention entries');expect(screen.getByText('Implemented done1')).toBeTruthy();expect(screen.getByText('Implemented done2')).toBeTruthy();
});
test('failed save keeps all selected wording and the session date for review',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(_url,options)=>options?.method==='POST'?Response.json({error:'Library changed; refresh choices before saving'},{status:409}):Response.json({...payload(),nodes:linkedNodes()})));
 render(<IndividualProgressPlanner patientId={patientId}/>);await screen.findByLabelText('Session date');fireEvent.change(screen.getByLabelText('Session date'),{target:{value:'2026-01-01'}});fireEvent.change(screen.getByLabelText('Select an implemented intervention for Problem 1'),{target:{value:'done1'}});fireEvent.click(screen.getByRole('button',{name:'Save implemented interventions'}));await screen.findByRole('alert');expect(screen.getByText('Implemented choice 1',{selector:'p'})).toBeTruthy();expect((screen.getByLabelText('Session date') as HTMLInputElement).value).toBe('2026-01-01');expect(document.querySelector('[data-implemented-dirty="true"]')).not.toBeNull();
});
