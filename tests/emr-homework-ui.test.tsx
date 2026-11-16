import React from 'react';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import HomeworkForm from '@/app/emr/homework/HomeworkForm';
import {homeworkVersion} from './fixtures/homework';
vi.mock('@/app/emr/treatment-response/RichTextEditor',()=>({default:({label,value,onChange}:any)=><label>{label}<textarea value={value.content?.[0]?.content?.[0]?.text??''} onChange={e=>onChange({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:e.target.value}]}]})}/></label>}));
const patientId='00000000-0000-4000-8000-000000000005';let versions:any[],assignments:any[],posts:any[],fail:boolean;
beforeEach(()=>{
 versions=[structuredClone(homeworkVersion)];assignments=[];posts=[];fail=false;
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  if(String(url).includes('treatment-plans'))return {ok:true,json:async()=>({patient:{id:patientId},versions})};
  if(options?.method==='POST'){
   const b=JSON.parse(options.body);posts.push(b);if(fail)return {ok:false,json:async()=>({error:'Save unavailable; draft retained.'})};
   const p=versions[0].snapshot.problems.find((p:any)=>p.id===b.problemId),o=p.children.find((o:any)=>o.id===b.objectiveId),i=o.children.find((i:any)=>i.id===b.interventionId);
   const assignment={id:b.id,patient_id:patientId,created_at:'2026-11-16T12:00:00Z',snapshot:{patient_name:'Fictional Patient',clinician_name:'Fictional Clinician',plan_title:'Fictional plan',plan_revision:2,plan_status:'finalized',problem:p,objective:o,intervention:i,assignment:b.narrative}};
   assignments.unshift(assignment);return {ok:true,json:async()=>({saved:true,assignment})};
  }
  return {ok:true,json:async()=>({patientId,assignments,offset:0,hasMore:false})};
 }));
 vi.spyOn(window,'print').mockImplementation(()=>{});
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function choose(){await screen.findByLabelText('Homework for');fireEvent.change(screen.getByLabelText('Homework for'),{target:{value:'p1'}});fireEvent.change(screen.getByLabelText('Objective'),{target:{value:'o1'}});fireEvent.change(screen.getByLabelText('Intervention'),{target:{value:'i1'}});fireEvent.change(screen.getByLabelText('Homework assignment'),{target:{value:'Fictional home practice'}});}
test('changing problems and objectives resets dependent choices and excludes other problem branches',async()=>{
 render(<HomeworkForm patientId={patientId}/>);await choose();
 expect(screen.queryByRole('option',{name:'o3'})).toBeNull();expect(screen.queryByRole('option',{name:'i4'})).toBeNull();
 fireEvent.change(screen.getByLabelText('Objective'),{target:{value:'o2'}});expect((screen.getByLabelText('Intervention') as HTMLSelectElement).value).toBe('');expect(screen.queryByRole('option',{name:'i1'})).toBeNull();
 fireEvent.change(screen.getByLabelText('Homework for'),{target:{value:'p2'}});expect((screen.getByLabelText('Objective') as HTMLSelectElement).value).toBe('');expect((screen.getByLabelText('Intervention') as HTMLSelectElement).disabled).toBe(true);
});
test('save and print bind problem, objective, intervention and narrative in a preserved handout',async()=>{
 const view=render(<HomeworkForm patientId={patientId}/>);await choose();fireEvent.click(screen.getByText('Save homework assignment'));
 await screen.findByText(/Homework saved/);expect(posts[0]).toMatchObject({patientId,planVersionId:homeworkVersion.id,problemId:'p1',objectiveId:'o1',interventionId:'i1'});
 const report=screen.getByRole('article',{name:'Printable saved homework assignment'});expect(report.textContent).toContain('p1');expect(report.textContent).toContain('o1');expect(report.textContent).toContain('i1');expect(report.textContent).toContain('Fictional home practice');
 fireEvent.click(screen.getByText('Print saved homework'));expect(window.print).toHaveBeenCalledOnce();
 view.unmount();render(<HomeworkForm patientId={patientId}/>);await screen.findByText('View saved handout');fireEvent.click(screen.getByText('View saved handout'));expect(screen.getByRole('article').textContent).toContain('Fictional home practice');
});
test('failed save keeps the draft, missing objectives explain the next step, and the old assessment gate is absent',async()=>{
 render(<HomeworkForm patientId={patientId}/>);await choose();fail=true;fireEvent.click(screen.getByText('Save homework assignment'));await screen.findByText(/draft retained/);expect((screen.getByLabelText('Homework assignment') as HTMLTextAreaElement).value).toBe('Fictional home practice');
 expect(screen.queryByText('Select library problems in an assessment first')).toBeNull();
 cleanup();versions[0].snapshot.problems[0].children=[];render(<HomeworkForm patientId={patientId}/>);await screen.findByLabelText('Homework for');fireEvent.change(screen.getByLabelText('Homework for'),{target:{value:'p1'}});await screen.findByText(/No objective has been saved/);
});
test('Homework menu opens dedicated patient editor without the legacy assessment prompt',async()=>{
 const {readFileSync}=await import('node:fs'),vm=await import('node:vm');const ctx=vm.createContext({patientId,activeSection:{module:'plan',key:'homework'},standalone:false,URLSearchParams,esc:(v:string)=>v});vm.runInContext(readFileSync('public/emr-assets/planner.js','utf8'),ctx);const html=vm.runInContext('libraryPlanView()',ctx);expect(html).toContain('/emr/homework?patient='+patientId);expect(html).not.toContain('Select library problems');
});
