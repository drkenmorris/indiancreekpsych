import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import PatientLegalPacket from '@/app/emr/PatientLegalPacket';

vi.mock('@/app/components/SubmittedLegalForms',()=>({default:({answers}:{answers:Record<string,string>})=>
 <div data-testid="legal-copy">{answers.full_name}</div>}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const patient='00000000-0000-0000-0000-000000000101';
test('linked submitted legal documents render only in the selected patient chart',async()=>{
 const calls:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  calls.push((init?.method??'GET')+' '+url);
  return {ok:true,json:async()=>({
   patientId:patient,packet:{version:'test',knownRevision:true,submittedAt:'2026-11-10T02:00:00Z',
    reference:'linked',answers:{full_name:'Fictional Patient'}},
  })};
 }));
 render(<PatientLegalPacket patientId={patient}/>);
 expect(await screen.findByTestId('legal-copy')).toHaveProperty('textContent','Fictional Patient');
 expect(screen.getByText(/patient drafts and office kiosk packets/i)).toBeTruthy();
 expect(calls).toEqual(['GET /api/emr/legal-packet?patient='+patient]);
});
test('unlinked patient cannot be assigned a signed record by patient name',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({patientId:patient,packet:null,reason:'unlinked'})})));
 render(<PatientLegalPacket patientId={patient}/>);
 expect(await screen.findByText(/cannot be matched by name or birth date/i)).toBeTruthy();
 expect(screen.queryByTestId('legal-copy')).toBeNull();
});
test('unrecognized revision blocks present-day legal text and shows a warning',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({
  patientId:patient,packet:{version:'unknown-revision',knownRevision:false,submittedAt:'2026-11-10T02:00:00Z'},
 })})));
 render(<PatientLegalPacket patientId={patient}/>);
 expect((await screen.findByRole('alert')).textContent).toContain('unknown-revision');
 expect(screen.queryByTestId('legal-copy')).toBeNull();
});
test('API patient-ID mismatch fails closed and never displays another chart legal packet',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({
  patientId:'00000000-0000-0000-0000-000000000202',
  packet:{version:'test',knownRevision:true,submittedAt:'2026-11-10T02:00:00Z',
   answers:{full_name:'Wrong Patient'}},
 })})));
 render(<PatientLegalPacket patientId={patient}/>);
 expect((await screen.findByRole('alert')).textContent).toContain('patient identity mismatch');
 expect(screen.queryByTestId('legal-copy')).toBeNull();
});
test('upstream API errors never imply any legal consent was submitted',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,json:async()=>({error:'Intake unavailable.'})})));
 render(<PatientLegalPacket patientId={patient}/>);
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveProperty('textContent',expect.stringContaining('Intake unavailable')));
 expect(screen.queryByTestId('legal-copy')).toBeNull();
});
