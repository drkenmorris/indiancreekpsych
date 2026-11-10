import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import PatientGroupNoteAmendments from '@/app/emr/PatientGroupNoteAmendments';

const patientId='00000000-0000-0000-0000-000000000101';
const sessionId='00000000-0000-0000-0000-000000000201';
const noteId='00000000-0000-0000-0000-000000000299';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('clinician may append reviewed unsigned addendum; original note remains untouched',async()=>{
 const writes:Record<string,unknown>[]=[];
 let amendmentExists=false;
 vi.stubGlobal('fetch',vi.fn(async (url:string,init?:RequestInit)=>{
  if(url.startsWith('/api/emr/groups/individual-notes/amendments?'))
   return {ok:true,json:async()=>({noteId,patientId,sessionId,amendments:amendmentExists?
    [{id:'00000000-0000-0000-0000-000000000398',note_id:noteId,reason:'Clarify timing',
      amendment:'Additional observations documented.',created_at:'2026-11-10T04:00:00Z'}]:[]})};
  if(url==='/api/emr/groups/individual-notes/amendments'&&init?.method==='POST'){
   const body=JSON.parse(String(init.body));writes.push(body);amendmentExists=true;
   return {ok:true,json:async()=>({id:'00000000-0000-0000-0000-000000000398',saved:true,unsigned:true})};
  }
  throw Error('Unexpected request '+url);
 }));
 render(<PatientGroupNoteAmendments noteId={noteId} patientId={patientId} sessionId={sessionId}/>);
 expect(await screen.findByText('No amendments recorded.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Add correction or clarification'}));
 const save=screen.getByRole('button',{name:'Save unsigned addendum'}) as HTMLButtonElement;
 expect(save.disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Reason for amendment'),{target:{value:'Clarify timing'}});
 fireEvent.change(screen.getByLabelText('Corrective or supplementary clinical information'),
  {target:{value:'Additional observations documented.'}});
 expect(save.disabled).toBe(true);
 fireEvent.click(screen.getByLabelText(/I reviewed this addition for the selected patient/));
 expect(save.disabled).toBe(false);
 fireEvent.click(save);
 await waitFor(()=>expect(writes).toHaveLength(1));
 expect(writes[0]).toEqual({note_id:noteId,patient_id:patientId,session_id:sessionId,
  reason:'Clarify timing',amendment:'Additional observations documented.',reviewed:true});
 expect(await screen.findByText(/Unsigned amendment saved/)).toBeTruthy();
 expect(screen.getByText('Additional observations documented.')).toBeTruthy();
});
test('mismatched patient note amendment response fails closed with no save action',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({
  noteId,patientId:'00000000-0000-0000-0000-000000000999',sessionId,amendments:[]})})));
 render(<PatientGroupNoteAmendments noteId={noteId} patientId={patientId} sessionId={sessionId}/>);
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',
  expect.stringContaining('did not match the selected patient note'));
 expect(screen.queryByRole('button',{name:'Add correction or clarification'})).toBeNull();
});
