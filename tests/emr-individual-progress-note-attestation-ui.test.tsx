import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import PatientProgressNotes from '@/app/emr/PatientProgressNotes';
const patient='00000000-0000-0000-0000-000000000103',note='00000000-0000-0000-0000-000000000201';
const signedId='00000000-0000-0000-0000-000000000301';
const saved={id:note,patient_id:patient,encounter_at:'2026-11-09T20:00:00Z',
 encounter_type:'Individual therapy',template:'DAP',
 sections:{data:'Patient presentation',assessment:'Response observed',plan:'Follow-up'},
 created_at:'2026-11-09T21:00:00Z'};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('clinician must explicitly attest and match profile name before irreversible sign-off; readback verifies record',async()=>{
 let signed=false;
 const calls:Array<{url:string;body?:Record<string,unknown>}>= [];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  const body=init?.body?JSON.parse(String(init.body)):undefined;
  calls.push({url,body});
  if(init?.method==='POST'){signed=true;return {ok:true,status:201,json:async()=>({id:signedId,signed:true,scope:'original-note-only'})};}
  return {ok:true,status:200,json:async()=>({patientId:patient,notes:[saved],addenda:[],
   attestations:signed?[{id:signedId,note_id:note,signer_name:'Fictional Clinician',signed_at:'2026-11-10T06:00:00Z'}]:[]})};
 }));
 render(<PatientProgressNotes patientId={patient}/>);
 const toggle=await screen.findByRole('button',{name:'Attest original progress note'});
 fireEvent.click(toggle);
 const submit=screen.getByRole('button',{name:'Record permanent author attestation'}) as HTMLButtonElement;
 expect(submit.disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Type your full profile name'),{target:{value:'Fictional Clinician'}});
 expect(submit.disabled).toBe(true);
 fireEvent.click(screen.getByLabelText(/I personally authored or reviewed this encounter documentation/));
 expect(submit.disabled).toBe(false);
 fireEvent.click(submit);
 await waitFor(()=>expect(calls.some(x=>x.url.endsWith('/attest'))).toBe(true));
 expect(calls.find(x=>x.url.endsWith('/attest'))?.body).toEqual({
  patient_id:patient,note_id:note,typed_name:'Fictional Clinician',attested:true
 });
 expect(await screen.findByText(/Individual therapy — DAP — author-attested/)).toBeTruthy();
 expect(screen.getByText(/Original note attested and recorded/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Attest original progress note'})).toBeNull();
});
test('attestation belonging to a different note blocks all chart forms',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({patientId:patient,notes:[saved],addenda:[],
  attestations:[{id:signedId,note_id:'00000000-0000-0000-0000-000000000999',signer_name:'Unknown',signed_at:'2026-11-10T06:00:00Z'}]})})));
 render(<PatientProgressNotes patientId={patient}/>);
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('Signature record does not match'));
 expect(screen.queryByRole('button',{name:'Attest original progress note'})).toBeNull();
});
