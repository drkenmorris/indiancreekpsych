import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import PatientProgressNotes from '@/app/emr/PatientProgressNotes';

const p='00000000-0000-0000-0000-000000000101',wrong='00000000-0000-0000-0000-000000000102';
const n='00000000-0000-0000-0000-000000000201',a='00000000-0000-0000-0000-000000000202';
const savedNote={id:n,patient_id:p,encounter_at:'2026-11-09T20:00:00Z',encounter_type:'Individual therapy',template:'DAP',
 sections:{data:'Observed interaction',assessment:'Response noted',plan:'Follow-up planned'},created_at:'2026-11-09T21:00:00Z'};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('reviewed individual patient note saves only after explicit review, with unsigned confirmation',async()=>{
 let saved=false;
 const calls:Array<{url:string;method:string;body?:Record<string,unknown>}>=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  const method=init?.method??'GET';const body=init?.body?JSON.parse(String(init.body)):undefined;
  calls.push({url,method,body});
  if(method==='GET')return {ok:true,json:async()=>({patientId:p,notes:saved?[savedNote]:[],addenda:[]})};
  if(method==='POST'){saved=true;return {ok:true,json:async()=>({id:n,saved:true,unsigned:true,kind:'note'})};}
  throw Error('Unexpected request');
 }));
 render(<PatientProgressNotes patientId={p}/>);
 expect(await screen.findByText('No individual progress notes are saved for this patient.')).toBeTruthy();
 const save=screen.getByRole('button',{name:'Save unsigned individual note'}) as HTMLButtonElement;
 expect(save.disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Data'),{target:{value:'Observed interaction'}});
 fireEvent.change(screen.getByLabelText('Assessment'),{target:{value:'Response noted'}});
 fireEvent.change(screen.getByLabelText('Plan'),{target:{value:'Follow-up planned'}});
 expect(save.disabled).toBe(true);
 fireEvent.click(screen.getByLabelText(/I reviewed the date, patient identity and note content/));
 expect(save.disabled).toBe(false);
 fireEvent.click(save);
 await waitFor(()=>expect(calls.some(c=>c.method==='POST')).toBe(true));
 const submitted=calls.find(c=>c.method==='POST')?.body;
 expect(submitted?.patient_id).toBe(p);expect(submitted?.action).toBe('note');
 expect(submitted?.reviewed).toBe(true);expect(submitted?.template).toBe('DAP');
 expect(String(submitted?.encounter_at)).toMatch(/Z$/);
 expect(await screen.findByText(/Reviewed individual progress note saved unsigned/)).toBeTruthy();
 expect(screen.getByText(/Individual therapy — DAP — unsigned/)).toBeTruthy();
});
test('mismatched patient notes are not rendered or editable',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({patientId:p,notes:[{...savedNote,patient_id:wrong}],addenda:[]})})));
 render(<PatientProgressNotes patientId={p}/>);
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('Patient mismatch'));
 expect(screen.queryByRole('button',{name:'Save unsigned individual note'})).toBeNull();
});
test('clinician-reviewed addendum saves against existing note without editing it',async()=>{
 let amended=false;
 const calls:Array<{method:string;body?:Record<string,unknown>}>=[];
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init?:RequestInit)=>{
  const method=init?.method??'GET',body=init?.body?JSON.parse(String(init.body)):undefined;
  calls.push({method,body});
  if(method==='GET')return {ok:true,json:async()=>({patientId:p,notes:[savedNote],addenda:amended?[{id:a,note_id:n,reason:'Clarification needed',amendment:'New reviewed details.',created_at:'2026-11-09T22:00:00Z'}]:[]})};
  if(method==='POST'){amended=true;return {ok:true,json:async()=>({id:a,saved:true,unsigned:true,kind:'addendum'})};}
  throw Error('Unexpected request');
 }));
 render(<PatientProgressNotes patientId={p}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Add correction or clarification'}));
 const save=screen.getByRole('button',{name:'Save unsigned addendum'}) as HTMLButtonElement;
 expect(save.disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Reason for correction'),{target:{value:'Clarification needed'}});
 fireEvent.change(screen.getByLabelText('Corrected or additional clinical information'),{target:{value:'New reviewed details.'}});
 fireEvent.click(screen.getByLabelText(/I reviewed this correction/));
 fireEvent.click(save);
 await waitFor(()=>expect(calls.some(c=>c.method==='POST')).toBe(true));
 expect(calls.find(c=>c.method==='POST')?.body).toEqual({
  action:'addendum',patient_id:p,note_id:n,reason:'Clarification needed',amendment:'New reviewed details.',reviewed:true,
 });
 expect(await screen.findByText(/original clinical note was not changed/)).toBeTruthy();
});
