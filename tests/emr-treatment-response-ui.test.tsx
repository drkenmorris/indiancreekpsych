import React from 'react';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import ResponseForm from '@/app/emr/treatment-response/ResponseForm';
import {emptyTreatmentResponse,type RichNode} from '@/lib/emr/treatment-response';
vi.mock('@/app/emr/treatment-response/RichTextEditor',()=>({default:({label,value,onChange,disabled}:any)=><label>{label}<textarea value={value.content?.[0]?.content?.[0]?.text??''} disabled={disabled} onChange={e=>onChange({type:'doc',content:[{type:'paragraph',content:e.target.value?[{type:'text',text:e.target.value}]:[]}]})}/></label>}));
const patientId='00000000-0000-4000-8000-000000000005';
let saved:any,revision:number,calls:any[],conflict:boolean;
beforeEach(()=>{
 saved=null;revision=0;calls=[];conflict=false;
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  if(options?.method==='POST'){
   const body=JSON.parse(options.body);calls.push(body);
   if(conflict)return {ok:false,json:async()=>({error:'The chart changed. Reload Response and review before saving again.'})};
   saved=body.response;revision++;
   return {ok:true,json:async()=>({revision,history:[{revision,response:saved,recorded_at:'2026-11-16T12:00:00Z',recorded_by:'fictional-clinician'}]})};
  }
  return {ok:true,json:async()=>({patientId,revision,response:saved,history:[]})};
 }));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('Yes and No are exclusive, three narratives and different family responses survive save/reload',async()=>{
 const view=render(<ResponseForm patientId={patientId}/>);
 const yes=await screen.findByLabelText('Identified patient 1 approves Yes');const no=screen.getByLabelText('Identified patient 1 approves No');
 expect((yes as HTMLInputElement).checked).toBe(false);expect((no as HTMLInputElement).checked).toBe(false);
 fireEvent.click(yes);fireEvent.click(no);expect((yes as HTMLInputElement).checked).toBe(false);expect((no as HTMLInputElement).checked).toBe(true);
 fireEvent.change(screen.getByLabelText('Significant other 2 name'),{target:{value:'Fictional Partner'}});fireEvent.click(screen.getByLabelText('Significant other 2 approves Yes'));
 fireEvent.click(screen.getByText('Add significant other, parent, guardian, or family member'));
 fireEvent.change(screen.getByLabelText('Family member 3 role'),{target:{value:'guardian'}});
 fireEvent.change(screen.getByLabelText('Guardian 3 name'),{target:{value:'Fictional Guardian'}});fireEvent.click(screen.getByLabelText('Guardian 3 approves No'));
 for(const label of ['Identified patient narrative','Significant other narrative','Parents, guardians, or family members narrative'])fireEvent.change(screen.getByLabelText(label),{target:{value:'Fictional '+label}});
 fireEvent.click(screen.getByText('Save treatment response'));await screen.findByText('Treatment response saved.');
 expect(calls[0].response.participants.map((p:any)=>p.approval)).toEqual(['no','yes','no']);
 view.unmount();render(<ResponseForm patientId={patientId}/>);
 await screen.findByLabelText('Guardian 3 approves No');expect((screen.getByLabelText('Guardian 3 approves No') as HTMLInputElement).checked).toBe(true);
 expect((screen.getByLabelText('Identified patient narrative') as HTMLTextAreaElement).value).toBe('Fictional Identified patient narrative');
});
test('conflicts retain unsaved approval and text; reload cannot silently discard them',async()=>{
 render(<ResponseForm patientId={patientId}/>);await screen.findByLabelText('Identified patient 1 approves Yes');
 fireEvent.change(screen.getByLabelText('Identified patient narrative'),{target:{value:'Fictional unsaved edit'}});conflict=true;
 fireEvent.click(screen.getByText('Save treatment response'));await screen.findByText(/The chart changed/);
 expect(document.querySelector('[data-response-dirty="true"]')).not.toBeNull();
 expect((screen.getByLabelText('Identified patient narrative') as HTMLTextAreaElement).value).toBe('Fictional unsaved edit');
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);fireEvent.click(screen.getByText('Reload saved response'));expect(confirm).toHaveBeenCalled();confirm.mockRestore();
});
test('Response menu opens the dedicated editor and navigation guards its unsaved changes',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
 const context=vm.createContext({patientId,activeSection:{module:'plan',key:'response'},standalone:false,URLSearchParams,esc:(v:string)=>v});
 vm.runInContext(readFileSync('public/emr-assets/planner.js','utf8'),context);
 expect(vm.runInContext('libraryPlanView()',context)).toContain('/emr/treatment-response?patient='+patientId);
 expect(readFileSync('public/emr-assets/menu-completion.js','utf8')).toContain('[data-response-dirty="true"]');
});
