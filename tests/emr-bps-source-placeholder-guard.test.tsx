import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import PatientBpsIntakeReview from '@/app/emr/PatientBpsIntakeReview';
import {mapIntakeToBps} from '@/lib/emr/intake-bps';

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const patient='00000000-0000-4000-8000-000000000961';
const account='00000000-0000-4000-8000-000000000962';
const stamp='2026-11-17T12:00:00Z';
const patientAnswers={
 counseling_reason:'SAFE_FICTIONAL_PRESENTING_CONCERN',
 trauma_history:'PRIVATE_FICTIONAL_TRAUMA_NARRATIVE',
 insurance_member:'PRIVATE_FICTIONAL_INSURANCE_NUMBER',
 roi_authorize:'PRIVATE_FICTIONAL_LEGAL_CONSENT',
 prior_psychiatric_medications:'PRIVATE_FICTIONAL_RETIRED_MEDICATION'
};
function fixture(){
 return {
  patientId:patient,
  source:{accountId:account,status:'submitted',version:3,updatedAt:stamp,submittedAt:stamp},
  sections:mapIntakeToBps(patientAnswers).sections,unmappedKeys:[] as string[],reviews:[]
 };
}
type Source=ReturnType<typeof fixture>;
function tamper(source:Source,key:string,change:(field:Source['sections'][number]['fields'][number])=>void){
 const field=source.sections.flatMap(section=>section.fields).find(entry=>entry.key===key);
 if(!field)throw Error('Missing fictional question '+key);
 change(field);
}
function serve(source:Source){
 let writes=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options?:RequestInit)=>{
  if(options?.method==='POST'){writes++;throw Error('Unexpected clinical save');}
  return Response.json(source);
 }));
 return ()=>writes;
}
test('approved linked 21-section BPS source keeps separate medication, trauma, legal and insurance answers opaque',async()=>{
 const countWrites=serve(fixture());
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 3/);
 expect(document.body.textContent).toContain('SAFE_FICTIONAL_PRESENTING_CONCERN');
 for(const secret of Object.values(patientAnswers).slice(1))
  expect(document.body.textContent).not.toContain(secret);
 expect(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeTruthy();
 expect(countWrites()).toBe(0);
});

test.each([
 ['medication marker contains raw PHI','prior_psychiatric_medications','raw'],
 ['insurance marker contains raw PHI','insurance_member','raw'],
 ['legal marker contains raw PHI','roi_authorize','raw'],
 ['trauma narrative marked unrestricted','trauma_history','unrestricted'],
 ['source-only marker has no patient report','counseling_reason','unreported'],
 ['approved clinical field falsely marks private source-only value','counseling_reason','raw'],
] as const)('clinician source fails closed when %s',async(_label,key,attack)=>{
 const source=fixture();
 tamper(source,key,field=>{
  if(attack==='unrestricted')field.sourceOnly=false;
  else if(attack==='unreported')field.reported=false;
  else{field.sourceOnly=true;field.value='PRIVATE_RAW_SOURCE_NOT_A_SAFE_PLACEHOLDER';}
 });
 const countWrites=serve(source);
 render(<PatientBpsIntakeReview patientId={patient}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('21-section intake mapping is malformed');
 const displayed=document.body.textContent||'';
 expect(displayed).not.toContain('SAFE_FICTIONAL_PRESENTING_CONCERN');
 expect(displayed).not.toContain('PRIVATE_RAW_SOURCE_NOT_A_SAFE_PLACEHOLDER');
 for(const secret of Object.values(patientAnswers).slice(1))
  expect(displayed).not.toContain(secret);
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(countWrites()).toBe(0);
});

test('unmapped fictional reported fields remain an investigation warning and never enable clinician BPS attestation',async()=>{
 const source=fixture();
 source.unmappedKeys=['[unrecognized source field name withheld]'];
 const countWrites=serve(source);
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 3/);
 expect(screen.getByText(/Clinician BPS attestation is blocked/)).toBeTruthy();
 expect(screen.getByText(/additional historical or unrecognized field/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(countWrites()).toBe(0);
});

test.each([
 ['allowed clinical answer hidden under a false reported flag','counseling_reason'],
 ['insurance answer hidden under a false reported flag','insurance_member'],
] as const)('clinician source rejects %s even when section answer counts are forged to agree',async(_case,key)=>{
 const source=fixture();
 const section=source.sections.find(section=>section.fields.some(field=>field.key===key));
 if(!section)throw Error('Fictional source fixture missing '+key);
 tamper(source,key,field=>{
  field.reported=false;
  field.sourceOnly=false;
  field.value='PRIVATE_FICTIONAL_CONCEALED_PATIENT_RESPONSE';
 });
 section.answered-=1; // Attack also falsifies the aggregate count to match its flags.
 const countWrites=serve(source);
 render(<PatientBpsIntakeReview patientId={patient}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('21-section intake mapping is malformed');
 expect(document.body.textContent).not.toContain('PRIVATE_FICTIONAL_CONCEALED_PATIENT_RESPONSE');
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(countWrites()).toBe(0);
});

test('clinician source rejects a declared patient response lacking an explicit protected-source routing receipt',async()=>{
 const source=fixture();
 tamper(source,'counseling_reason',field=>{Reflect.deleteProperty(field,'sourceOnly');});
 const countWrites=serve(source);
 render(<PatientBpsIntakeReview patientId={patient}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('21-section intake mapping is malformed');
 expect(document.body.textContent).not.toContain('SAFE_FICTIONAL_PRESENTING_CONCERN');
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(countWrites()).toBe(0);
});
