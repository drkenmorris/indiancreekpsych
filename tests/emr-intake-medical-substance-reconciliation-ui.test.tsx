import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import IntakeMedicalSubstanceReconciliation from '@/app/emr/IntakeMedicalSubstanceReconciliation';
import {emptyMedicalSubstance,medicalSubstanceDefinition} from '@/lib/patient/medical-substance';
const id='00000000-0000-0000-0000-000000000123',stamp='2026-11-09T12:00:00Z';
const original=emptyMedicalSubstance();
original.selections[medicalSubstanceDefinition.groups[0].key]=[medicalSubstanceDefinition.groups[0].choices[0]];
const sourceJson=JSON.stringify(original);
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function fixture({stale=false,records=[] as unknown[]}={}){
 const calls:Array<{url:string;payload:unknown}>=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  const payload=init?.body?JSON.parse(String(init.body)):null;
  calls.push({url,payload});
  if(url.startsWith('/api/emr/patients'))return {ok:true,json:async()=>({patients:[{id}],intake:{updated_at:stale?'changed':stamp,answers:{medical_substance_history:sourceJson}}})};
  if(payload?.path==='/api/save')return {ok:true,json:async()=>({value:{saved:true},revision:2})};
  return {ok:true,json:async()=>({value:{records},revision:1})};
 }));
 return calls;
}
test('new reviewed structured history is saved only by explicit request through central EMR, not into browser demo storage',async()=>{
 const calls=fixture();
 render(<IntakeMedicalSubstanceReconciliation patientId={id} sourceJson={sourceJson} sourceUpdatedAt={stamp}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician draft from intake'}));
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(0);
 const save=screen.getByRole('button',{name:'Save clinician-reviewed history snapshot'});
 expect((save as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed and corrected these patient-reported historical details/}));
 fireEvent.click(save);
 expect(await screen.findByText(/A new medical\/substance history snapshot was recorded/)).toBeTruthy();
 const writes=calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save');
 expect(writes).toHaveLength(1);
 const payload=writes[0].payload as {patientId:string;expectedRevision:number;body:{patient_id:string;action:string;data:unknown}};
 expect(payload.patientId).toBe(id);expect(payload.expectedRevision).toBe(1);
 expect(payload.body.patient_id).toBe(id);
 expect(payload.body.action).toBe('biopsychosocial_medical_substance');
 expect(payload.body.data).toMatchObject({selections:original.selections,notes:original.notes});
});
test('changed or unlinked intake prevents medical-history write',async()=>{
 const calls=fixture({stale:true});
 render(<IntakeMedicalSubstanceReconciliation patientId={id} sourceJson={sourceJson} sourceUpdatedAt={stamp}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician draft from intake'}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed and corrected these patient-reported historical details/}));
 fireEvent.click(screen.getByRole('button',{name:'Save clinician-reviewed history snapshot'}));
 expect(await screen.findByText(/linked intake history changed/)).toBeTruthy();
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(0);
});
test('does not re-save identical medical/substance history snapshot',async()=>{
 const calls=fixture({records:[{kind:'biopsychosocial_medical_substance',created:stamp,selections:original.selections,notes:original.notes}]});
 render(<IntakeMedicalSubstanceReconciliation patientId={id} sourceJson={sourceJson} sourceUpdatedAt={stamp}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician draft from intake'}));
 expect(await screen.findByText(/An identical history already exists/)).toBeTruthy();
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed and corrected these patient-reported historical details/}));
 expect((screen.getByRole('button',{name:'Save clinician-reviewed history snapshot'}) as HTMLButtonElement).disabled).toBe(true);
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(0);
});
