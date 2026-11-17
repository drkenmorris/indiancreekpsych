import React from 'react';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import DiagnosisTable from '@/app/emr/diagnosis/DiagnosisTable';
import {diagnosticReference} from '@/lib/emr/diagnosis-reference';
import {diagnosisCatalog} from '@/lib/emr/diagnoses';
const patientId='00000000-0000-4000-8000-000000000005';
const rows=[{code:'F41.1',label:'Generalized anxiety disorder',category:'Anxiety disorders',group:'F41',groupLabel:'Other anxiety disorders'},
 {code:'F32.1',label:'Major depressive disorder, single episode, moderate',category:'Depressive disorders',group:'F32',groupLabel:'Depressive episode'},...diagnosisCatalog.rows.filter(row=>['F06.70','F06.31'].includes(row.code))];
let saved:any[],revision:number,conflict:boolean;
const calls:any[]=[];
beforeEach(()=>{
 saved=[];revision=0;conflict=false;calls.length=0;
 vi.stubGlobal('fetch',vi.fn(async (_url,options)=>{
  if(String(_url).includes('/reference?'))return {ok:true,json:async()=>diagnosticReference(new URL(String(_url),'https://clinic.test').searchParams.get('code')!)};
  if(options?.method==='POST'){
   const body=JSON.parse(options.body);calls.push(body);
   if(conflict)return {ok:false,json:async()=>({error:'The chart changed. Reload Diagnosis and review before saving again.'})};
   saved=body.diagnoses;revision++;
   return {ok:true,json:async()=>({revision,history:[{revision,diagnoses:saved,recorded_at:'2026-11-15T01:00:00Z'}]})};
  }
  return {ok:true,json:async()=>({patientId,revision,diagnoses:saved,history:[],catalog:{version:'ICD-10-CM FY2027',effectiveFrom:'2026-10-01',effectiveThrough:'2027-09-30',rows}})};
 }));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function choose(){
 await screen.findByText('Add diagnosis');
 fireEvent.click(screen.getByText('Add diagnosis'));
 fireEvent.change(screen.getByLabelText('Diagnosis 1 family'),{target:{value:'Anxiety disorders'}});
 fireEvent.change(screen.getByLabelText('Diagnosis 1 disorder group'),{target:{value:'F41'}});
 fireEvent.change(screen.getByLabelText('Diagnosis 1 specific diagnosis'),{target:{value:'F41.1'}});
}
test('patient can receive a diagnosis without a library assessment; canonical code and notes survive save/reload',async()=>{
 const first=render(<DiagnosisTable patientId={patientId}/>);
 await choose();
 expect(screen.getByLabelText('Diagnosis 1 ICD-10-CM code').textContent).toBe('F41.1');
 fireEvent.change(screen.getByLabelText('Diagnosis 1 clinical notes'),{target:{value:'Fictional clinical entry'}});
 fireEvent.click(screen.getByText('Save diagnoses'));
 await screen.findByText('Diagnoses saved.');
 expect(calls[0]).toMatchObject({patientId,revision:0,diagnoses:[{code:'F41.1',label:rows[0].label,notes:'Fictional clinical entry'}]});
 first.unmount();render(<DiagnosisTable patientId={patientId}/>);
 await screen.findByText('Add diagnosis');
 expect((screen.getByLabelText('Diagnosis 1 specific diagnosis') as HTMLSelectElement).value).toBe('F41.1');
 expect((screen.getByLabelText('Diagnosis 1 clinical notes') as HTMLTextAreaElement).value).toBe('Fictional clinical entry');
});
test('changing a family clears the dependent diagnosis and code; selecting another primary demotes the old one',async()=>{
 render(<DiagnosisTable patientId={patientId}/>);await choose();
 fireEvent.change(screen.getByLabelText('Diagnosis 1 family'),{target:{value:'Depressive disorders'}});
 expect((screen.getByLabelText('Diagnosis 1 specific diagnosis') as HTMLSelectElement).value).toBe('');
 expect(screen.getByLabelText('Diagnosis 1 ICD-10-CM code').textContent).toBe('—');
 fireEvent.click(screen.getByText('Add diagnosis'));
 fireEvent.change(screen.getByLabelText('Diagnosis 2 priority'),{target:{value:'primary'}});
 expect((screen.getByLabelText('Diagnosis 1 priority') as HTMLSelectElement).value).toBe('secondary');
});
test('save conflicts preserve the unsaved diagnosis for clinician review',async()=>{
 render(<DiagnosisTable patientId={patientId}/>);await choose();conflict=true;
 fireEvent.click(screen.getByText('Save diagnoses'));
 await screen.findByText(/The chart changed/);
 expect(screen.getByLabelText('Diagnosis 1 ICD-10-CM code').textContent).toBe('F41.1');
 expect(document.querySelector('[data-diagnosis-dirty="true"]')).not.toBeNull();
});
test('diagnosis routing opens the patient editor instead of the assessment prerequisite',async()=>{
 const {readFileSync}=await import('node:fs');
 const vm=await import('node:vm');
 const context=vm.createContext({patientId,activeSection:{module:'plan',key:'diagnosis'},standalone:false,URLSearchParams,esc:(s:string)=>s});
 vm.runInContext(readFileSync('public/emr-assets/planner.js','utf8'),context);
 const html=vm.runInContext('libraryPlanView()',context);
 expect(html).toContain('/emr/diagnosis?patient='+patientId);
 expect(html).not.toContain('Select library problems');
});

test('criteria appear on selection while notes and diagnosis actions occupy separate lines outside the selection table',async()=>{
 render(<DiagnosisTable patientId={patientId}/>);await choose();
 await screen.findByText(/Evaluate difficult-to-control worry/);
 const notes=screen.getByLabelText('Diagnosis 1 clinical notes');
 expect(notes.closest('table')).toBeNull();
 const card=screen.getByRole('region',{name:'Diagnosis 1'});
 const actions=screen.getByRole('group',{name:'Diagnosis 1 actions'});
 expect(actions.closest('table')).toBeNull();
 expect(card.contains(notes)&&card.contains(actions)).toBe(true);
 expect(notes.closest('.diagnosisNotesLine')?.nextElementSibling).toBe(actions);
 expect(actions.textContent).toContain('Remove diagnosis');
 expect(screen.getByText(/View missing DSM-referenced codes/).getAttribute('href')).toBe('/emr/diagnosis?coverage=1');
});

test('related codes are added explicitly from the connected Actions line as unsaved secondary rows',async()=>{
 render(<DiagnosisTable patientId={patientId}/>);
 await screen.findByText('Add diagnosis');fireEvent.click(screen.getByText('Add diagnosis'));
 const choice=diagnosisCatalog.rows.find(row=>row.code==='F06.70')!;
 fireEvent.change(screen.getByLabelText('Diagnosis 1 family'),{target:{value:choice.category}});
 fireEvent.change(screen.getByLabelText('Diagnosis 1 disorder group'),{target:{value:choice.group}});
 fireEvent.change(screen.getByLabelText('Diagnosis 1 specific diagnosis'),{target:{value:choice.code}});
 const related=await screen.findByLabelText('Available related codes for F06.31');
 const summary=screen.getByText(/Referenced additional codes and EMR availability/);fireEvent.click(summary);
 fireEvent.change(related,{target:{value:'F06.31'}});
 const action=screen.getByText('Add F06.31 as secondary diagnosis');
 expect(action.closest('[aria-label="Diagnosis 1 actions"]')).not.toBeNull();
 fireEvent.click(action);
 expect((screen.getByLabelText('Diagnosis 2 specific diagnosis') as HTMLSelectElement).value).toBe('F06.31');
 expect((screen.getByLabelText('Diagnosis 2 priority') as HTMLSelectElement).value).toBe('secondary');
 expect((screen.getByLabelText('Diagnosis 2 status') as HTMLSelectElement).value).toBe('provisional');
 expect(calls).toHaveLength(0);
});
test('incomplete rows announce the row requiring completion instead of native validation silently blocking save',async()=>{
 render(<DiagnosisTable patientId={patientId}/>);await screen.findByText('Add diagnosis');fireEvent.click(screen.getByText('Add diagnosis'));
 fireEvent.click(screen.getByText('Save diagnoses'));await screen.findByText(/Diagnosis 1: choose a diagnostic family/);expect(calls).toHaveLength(0);
 expect(document.activeElement).toBe(screen.getByLabelText('Diagnosis 1 family'));
});
test('save includes the originally loaded list and updates that baseline after each confirmed save',async()=>{
 render(<DiagnosisTable patientId={patientId}/>);await choose();fireEvent.click(screen.getByText('Save diagnoses'));await screen.findByText('Diagnoses saved.');expect(calls[0].originalDiagnoses).toEqual([]);
 fireEvent.change(screen.getByLabelText('Diagnosis 1 clinical notes'),{target:{value:'Fictional changed note'}});expect(screen.queryByText('Diagnoses saved.')).toBeNull();fireEvent.click(screen.getByText('Save diagnoses'));await screen.findByText('Diagnoses saved.');expect(calls[1].originalDiagnoses).toEqual(calls[0].diagnoses);
});
