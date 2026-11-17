import React from 'react';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import ModalityTable from '@/app/emr/treatment-modality/ModalityTable';
const patientId='00000000-0000-4000-8000-000000000001',providerId='00000000-0000-4000-8000-000000000002';
let record:any,calls:any[],fail:boolean;
beforeEach(()=>{record=null;calls=[];fail=false;vi.stubGlobal('fetch',vi.fn(async(_url,options)=>{
 if(options?.method==='POST'){const body=JSON.parse(options.body);calls.push(body);if(fail)return {ok:false,json:async()=>({error:'The plan or assignment changed. Reload Modality and review before saving again.'})};record={revision:(record?.revision??0)+1,sessions:body.sessions,care_periods:body.carePeriods,assigned_provider_id:body.assignedProviderId};return {ok:true,json:async()=>({record})};}
 return {ok:true,json:async()=>({record,providers:[{id:providerId,name:'Fictional Provider',enrolled:true}],admin:true,userId:providerId})};
}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function addRow(){await screen.findByRole('button',{name:'Add session type'});fireEvent.click(screen.getByRole('button',{name:'Add session type'}));}
function completeRow(){for(const [name,value] of [['Session type 1','90834'],['Expected sessions 1','12'],['Frequency 1','weekly']])fireEvent.change(screen.getByRole('combobox',{name}),{target:{value}});}
test('incomplete rows explain why they cannot save instead of disabling Save silently',async()=>{
 render(<ModalityTable patientId={patientId}/>);await addRow();const save=screen.getByRole('button',{name:'Save Modality'});expect((save as HTMLButtonElement).disabled).toBe(false);fireEvent.click(save);await screen.findByText(/Session 1: select a session type/);expect(calls).toHaveLength(0);expect(screen.getByRole('combobox',{name:'Assigned provider 1'})).toBeTruthy();
});
test('added sessions save, reload and update while errors retain edits',async()=>{
 const view=render(<ModalityTable patientId={patientId}/>);await addRow();completeRow();fireEvent.click(screen.getByRole('button',{name:'Save Modality'}));await screen.findByText('Modality saved.');expect(calls[0].sessions).toEqual([{code:'90834',count:12,frequency:'weekly',providerId}]);view.unmount();render(<ModalityTable patientId={patientId}/>);await screen.findByRole('combobox',{name:'Session type 1'});expect((screen.getByRole('combobox',{name:'Expected sessions 1'}) as HTMLSelectElement).value).toBe('12');fireEvent.change(screen.getByRole('combobox',{name:'Expected sessions 1'}),{target:{value:'10'}});fail=true;fireEvent.click(screen.getByRole('button',{name:'Save Modality'}));await screen.findByText(/The plan or assignment changed/);expect((screen.getByRole('combobox',{name:'Expected sessions 1'}) as HTMLSelectElement).value).toBe('10');expect(document.querySelector('[data-modality-dirty="true"]')).not.toBeNull();fail=false;fireEvent.click(screen.getByRole('button',{name:'Save Modality'}));await screen.findByText('Modality saved.');expect(calls[2].revision).toBe(1);
});
test('incomplete care periods explain missing level and dates without posting',async()=>{
 render(<ModalityTable patientId={patientId}/>);await screen.findByRole('button',{name:'Add care period'});fireEvent.click(screen.getByRole('button',{name:'Add care period'}));fireEvent.click(screen.getByRole('button',{name:'Save Modality'}));await screen.findByText(/Care period 1: choose a level/);expect(calls).toHaveLength(0);
});
test('patient switch and Home Find/Add Patient use the same guarded directory',async()=>{
 const {readFileSync}=await import('node:fs');const app=readFileSync('public/emr-assets/app.js','utf8');expect(app).toContain('id="change-patient">Find/Add Patient</button>');expect(app).toContain("$('#change-patient').addEventListener('click',openDirectory)");expect(readFileSync('public/emr-assets/navigation-menus.js','utf8')).toContain('safeNavigate(()=>openDirectory())');
});
