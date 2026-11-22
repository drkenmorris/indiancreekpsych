import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import IntakeMedicalSubstanceReconciliation from '@/app/emr/IntakeMedicalSubstanceReconciliation';
import {emptyMedicalSubstance,medicalSubstanceDefinition} from '@/lib/patient/medical-substance';
const id='abcdef00-0000-4000-8000-000000000123',stamp='2026-11-09T12:00:00Z';
const original=emptyMedicalSubstance();
original.selections[medicalSubstanceDefinition.groups[0].key]=[medicalSubstanceDefinition.groups[0].choices[0]];
const sourceJson=JSON.stringify(original);
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function fixture({stale=false,omitReadback=false,sameRevision=false,missingRecordId=false,status='submitted',records=[] as unknown[]}={}){
 let persisted:unknown=null;
 const calls:Array<{url:string;payload:unknown}>=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  const payload=init?.body?JSON.parse(String(init.body)):null;
  calls.push({url,payload});
  if(url.startsWith('/api/emr/patients'))return {ok:true,json:async()=>({patients:[{id}],intake:{status,updated_at:stale?'changed':stamp,answers:{medical_substance_history:sourceJson}}})};
  if(payload?.path==='/api/save'){
   if(!omitReadback)persisted={id:missingRecordId?'':'fictional-new-history-record',kind:'biopsychosocial_medical_substance',...payload.body.data};
   return {ok:true,json:async()=>({value:{saved:true},revision:2})};
  }
  return {ok:true,json:async()=>({value:{records:persisted?[...records,persisted]:records},revision:persisted&&!sameRevision?2:1})};
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
test('200 OK without persisted medical/substance history does not confirm clinician save',async()=>{
 const calls=fixture({omitReadback:true});
 render(<IntakeMedicalSubstanceReconciliation patientId={id} sourceJson={sourceJson} sourceUpdatedAt={stamp}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician draft from intake'}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed and corrected these patient-reported historical details/}));
 fireEvent.click(screen.getByRole('button',{name:'Save clinician-reviewed history snapshot'}));
 expect(await screen.findByText(/exact reviewed history was not verified on chart readback/)).toBeTruthy();
 expect(screen.queryByText(/A new medical\/substance history snapshot was recorded/)).toBeNull();
 expect(screen.getByRole('button',{name:'Save clinician-reviewed history snapshot'})).toBeTruthy();
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(1);
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

test('a draft website intake cannot be imported as clinician-reviewed medical/substance history',async()=>{
 const calls=fixture({status:'draft'});
 render(<IntakeMedicalSubstanceReconciliation patientId={id} sourceJson={sourceJson} sourceUpdatedAt={stamp}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician draft from intake'}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed and corrected these patient-reported historical details/}));
 fireEvent.click(screen.getByRole('button',{name:'Save clinician-reviewed history snapshot'}));
 expect(await screen.findByText(/Linked intake has not been submitted/)).toBeTruthy();
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(0);
});

test.each([
 ['unchanged chart revision',{sameRevision:true}],
 ['unidentified chart-history entry',{missingRecordId:true}]
])('medical/substance history write acknowledgment with %s cannot claim confirmed clinical persistence',async(_scenario,options)=>{
 const calls=fixture(options);
 render(<IntakeMedicalSubstanceReconciliation patientId={id} sourceJson={sourceJson} sourceUpdatedAt={stamp}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician draft from intake'}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed and corrected these patient-reported historical details/}));
 fireEvent.click(screen.getByRole('button',{name:'Save clinician-reviewed history snapshot'}));
 expect(await screen.findByText(/exact reviewed history was not verified on chart readback/)).toBeTruthy();
 expect(screen.queryByText(/A new medical\/substance history snapshot was recorded/)).toBeNull();
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(1);
});

test('ambiguous medical history save locks any retry until protected chart is reopened',async()=>{
 const calls=fixture({omitReadback:true});
 render(<IntakeMedicalSubstanceReconciliation patientId={id} sourceJson={sourceJson} sourceUpdatedAt={stamp}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician draft from intake'}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed and corrected these patient-reported historical details/}));
 const save=screen.getByRole('button',{name:'Save clinician-reviewed history snapshot'});
 fireEvent.click(save);
 expect(await screen.findByText(/exact reviewed history was not verified on chart readback/)).toBeTruthy();
 expect(await screen.findByText(/Reopen the protected chart and inspect history before another attempt/)).toBeTruthy();
 expect((save as HTMLButtonElement).disabled).toBe(true);
 fireEvent.submit(save.closest('form')!);
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(1);
});

test('medical/substance history cannot transfer from pending source request after patient switch',async()=>{
 const next='00000000-0000-0000-0000-000000000124';
 let done:(v:any)=>void=()=>{};
 const pending=new Promise<any>(resolve=>{done=resolve;});
 const requests:Array<{url:string;payload:any}>=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  const payload=init?.body?JSON.parse(String(init.body)):null;
  requests.push({url,payload});
  if(url.startsWith('/api/emr/patients?id='+id))return pending;
  return {ok:true,json:async()=>({revision:1,value:{records:[]}})};
 }));
 const view=render(<IntakeMedicalSubstanceReconciliation patientId={id} sourceJson={sourceJson} sourceUpdatedAt={stamp}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician draft from intake'}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed and corrected these patient-reported historical details/}));
 fireEvent.click(screen.getByRole('button',{name:'Save clinician-reviewed history snapshot'}));
 await waitFor(()=>expect(requests.filter(r=>r.url.startsWith('/api/emr/patients?id='+id))).toHaveLength(1));
 view.rerender(<IntakeMedicalSubstanceReconciliation patientId={next} sourceJson={sourceJson} sourceUpdatedAt={stamp}/>);
 await act(async()=>done({ok:true,json:async()=>({patients:[{id}],intake:{status:'submitted',updated_at:stamp,answers:{medical_substance_history:sourceJson}}})}));
 expect(requests.filter(r=>r.payload?.path==='/api/save')).toHaveLength(0);
});

test('delayed medical-history write acknowledgement is discarded after the original chart is left',async()=>{
 const next='00000000-0000-0000-0000-000000000124';
 let acknowledge:(value:any)=>void=()=>{};
 const waiting=new Promise<any>(resolve=>{acknowledge=resolve;});
 const writes:Array<any>=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  const payload=init?.body?JSON.parse(String(init.body)):null;
  if(url.startsWith('/api/emr/patients'))return {ok:true,json:async()=>({patients:[{id}],intake:{status:'submitted',updated_at:stamp,answers:{medical_substance_history:sourceJson}}})};
  if(payload?.path==='/api/save'){writes.push(payload);return waiting;}
  return {ok:true,json:async()=>({revision:1,value:{records:[]}})};
 }));
 const view=render(<IntakeMedicalSubstanceReconciliation patientId={id} sourceJson={sourceJson} sourceUpdatedAt={stamp}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician draft from intake'}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed and corrected these patient-reported historical details/}));
 fireEvent.click(screen.getByRole('button',{name:'Save clinician-reviewed history snapshot'}));
 await waitFor(()=>expect(writes).toHaveLength(1));
 view.rerender(<IntakeMedicalSubstanceReconciliation patientId={next} sourceJson={sourceJson} sourceUpdatedAt={stamp}/>);
 await act(async()=>acknowledge({ok:true,json:async()=>({revision:2,value:{saved:true}})}));
 expect(writes).toHaveLength(1);
 expect(screen.queryByText(/A new medical\/substance history snapshot was recorded/)).toBeNull();
});

test('mixed-case patient UUID is normalized for medical/substance source and chart receipt',async()=>{
 const calls=fixture();
 render(<IntakeMedicalSubstanceReconciliation patientId={id.toUpperCase()} sourceJson={sourceJson} sourceUpdatedAt={stamp}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician draft from intake'}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed and corrected these patient-reported historical details/}));
 fireEvent.click(screen.getByRole('button',{name:'Save clinician-reviewed history snapshot'}));
 expect(await screen.findByText(/A new medical\/substance history snapshot was recorded/)).toBeTruthy();
 const writes=calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save');
 expect(writes).toHaveLength(1);
 expect((writes[0].payload as {patientId:string}).patientId).toBe(id);
 expect(calls.some(c=>c.url==='/api/emr/patients?id='+id)).toBe(true);
});
