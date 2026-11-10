import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import PatientGroupNoteAttestation from '@/app/emr/PatientGroupNoteAttestation';

const patient='00000000-0000-0000-0000-000000000103';
const session='00000000-0000-0000-0000-000000000201';
const note='00000000-0000-0000-0000-000000000301';
const signedId='00000000-0000-0000-0000-000000000401';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('reviewed clinician signs only exact original group note after explicit approval; readback verifies permanent record',async()=>{
 let signed=false;
 const calls:Array<{url:string,body?:Record<string,unknown>}>=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  const body=init?.body?JSON.parse(String(init.body)):undefined;
  calls.push({url,body});
  if(init?.method==='POST'){
   signed=true;
   return {ok:true,status:201,json:async()=>({id:signedId,signed:true,scope:'original-group-note-only'})};
  }
  return {ok:true,status:200,json:async()=>({noteId:note,patientId:patient,sessionId:session,
   attestation:signed?{id:signedId,note_id:note,signer_name:'Fictional Group Clinician',signed_at:'2026-11-10T07:00:00Z'}:null})};
 }));
 render(<PatientGroupNoteAttestation noteId={note} patientId={patient} sessionId={session}/>);
 const toggle=await screen.findByRole('button',{name:'Attest original group note'});
 fireEvent.click(toggle);
 const submit=screen.getByRole('button',{name:'Record permanent group-note attestation'}) as HTMLButtonElement;
 expect(submit.disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Type your full profile name'),{target:{value:'Fictional Group Clinician'}});
 expect(submit.disabled).toBe(true);
 fireEvent.click(screen.getByLabelText(/I personally authored or reviewed this group encounter note/));
 expect(submit.disabled).toBe(false);
 fireEvent.click(submit);
 await waitFor(()=>expect(calls.filter(c=>!!c.body)).toHaveLength(1));
 expect(calls.find(c=>c.body)?.body).toEqual({note_id:note,patient_id:patient,session_id:session,
  typed_name:'Fictional Group Clinician',attested:true});
 expect(await screen.findByText(/Author-attested:/)).toBeTruthy();
 expect(screen.getByText(/Original group note attested/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Attest original group note'})).toBeNull();
});
test('attestation from different patient or note fails closed and prevents signature POST',async()=>{
 const calls:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
  calls.push(url);
  return {ok:true,json:async()=>({noteId:note,patientId:patient,sessionId:session,
   attestation:{id:signedId,note_id:'00000000-0000-0000-0000-000000000999',
    signer_name:'Wrong Clinician',signed_at:'2026-11-10T07:00:00Z'}})};
 }));
 render(<PatientGroupNoteAttestation noteId={note} patientId={patient} sessionId={session}/>);
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('does not match'));
 expect(screen.queryByRole('button',{name:'Attest original group note'})).toBeNull();
 expect(calls).toHaveLength(1);
});
test('unavailable attestation database disables sign-off instead of guessing signature status',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,json:async()=>({error:'Group note author-attestation history unavailable.'})})));
 render(<PatientGroupNoteAttestation noteId={note} patientId={patient} sessionId={session}/>);
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('history unavailable'));
 expect(screen.queryByRole('button',{name:'Attest original group note'})).toBeNull();
});
