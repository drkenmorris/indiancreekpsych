import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import IntakeAllergyReconciliation from '@/app/emr/IntakeAllergyReconciliation';
const patient='00000000-0000-0000-0000-000000000123',sourceUpdatedAt='2026-11-09T00:00:00Z';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function fixtures({stale=false,omitReadback=false,sameRevision=false,missingRecordId=false,status='submitted',records=[] as unknown[]}={}){
 let persisted:unknown=null;
 const calls:Array<{url:string;payload:unknown}>=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  const payload=init?.body?JSON.parse(String(init.body)):null;calls.push({url,payload});
  if(url.startsWith('/api/emr/patients'))return {ok:true,json:async()=>({patients:[{id:patient}],intake:{status,updated_at:stale?'new source':sourceUpdatedAt,
   answers:{medication_allergy_status:'Medication allergies reported',medication_allergy_notes:'Fictional reported reaction'}}})};
  if(payload?.path==='/api/save'){
   if(!omitReadback)persisted={id:missingRecordId?'':'fictional-new-history-record',kind:'medication_allergies',...payload.body.data};
   return {ok:true,json:async()=>({value:{saved:true},revision:2})};
  }
  return {ok:true,json:async()=>({value:{records:persisted?[...records,persisted]:records},revision:persisted&&!sameRevision?2:1})};
 }));
 return calls;
}
const props={patientId:patient,sourceStatus:'Medication allergies reported',sourceNotes:'Fictional reported reaction',sourceUpdatedAt};
test('reviewed patient-reported medication allergy status writes one append-only central chart action',async()=>{
 const calls=fixtures();
 render(<IntakeAllergyReconciliation {...props}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare medication-allergy review'}));
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(0);
 const save=screen.getByRole('button',{name:'Save reviewed allergy-history entry'});
 expect((save as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(save);
 expect(await screen.findByText(/A reviewed medication-allergy history entry was saved/)).toBeTruthy();
 const writes=calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save');
 expect(writes).toHaveLength(1);
 expect(writes[0].payload).toMatchObject({patientId:patient,expectedRevision:1,body:{patient_id:patient,action:'medication_allergies',
  data:{allergy_status:'Medication allergies reported',allergy_notes:'Fictional reported reaction'}}});
});
test('200 OK without persisted allergy-history chart readback does not confirm clinician save',async()=>{
 const calls=fixtures({omitReadback:true});
 render(<IntakeAllergyReconciliation {...props}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare medication-allergy review'}));
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Save reviewed allergy-history entry'}));
 expect(await screen.findByText(/exact reviewed entry was not verified on chart readback/)).toBeTruthy();
 expect(screen.queryByText(/A reviewed medication-allergy history entry was saved/)).toBeNull();
 expect(screen.getByRole('button',{name:'Save reviewed allergy-history entry'})).toBeTruthy();
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(1);
});
test('changed allergy intake prevents transfer even when draft was reviewed',async()=>{
 const calls=fixtures({stale:true});
 render(<IntakeAllergyReconciliation {...props}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare medication-allergy review'}));
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Save reviewed allergy-history entry'}));
 expect(await screen.findByText(/linked allergy intake changed/)).toBeTruthy();
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(0);
});
test('no source status and already saved identical allergy histories do not create duplicates',async()=>{
 fixtures({records:[{kind:'medication_allergies',allergy_status:'Medication allergies reported',allergy_notes:'Fictional reported reaction'}]});
 const view=render(<IntakeAllergyReconciliation {...props}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare medication-allergy review'}));
 fireEvent.click(screen.getByRole('checkbox'));
 expect((screen.getByRole('button',{name:'Save reviewed allergy-history entry'}) as HTMLButtonElement).disabled).toBe(true);
 view.rerender(<IntakeAllergyReconciliation {...props} sourceStatus="Not yet reviewed"/>);
 expect(screen.getByText(/does not have a reviewable allergy status/)).toBeTruthy();
});

test('unsubmitted linked allergy intake does not produce clinical chart history',async()=>{
 const calls=fixtures({status:'draft'});
 render(<IntakeAllergyReconciliation {...props}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare medication-allergy review'}));
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Save reviewed allergy-history entry'}));
 expect(await screen.findByText(/Linked intake has not been submitted/)).toBeTruthy();
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(0);
});

test.each([
 ['unchanged chart revision',{sameRevision:true}],
 ['unidentified chart-history entry',{missingRecordId:true}]
])('allergy-history write acknowledgment with %s cannot claim confirmed clinical persistence',async(_scenario,options)=>{
 const calls=fixtures(options);
 render(<IntakeAllergyReconciliation {...props}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare medication-allergy review'}));
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Save reviewed allergy-history entry'}));
 expect(await screen.findByText(/exact reviewed entry was not verified on chart readback/)).toBeTruthy();
 expect(screen.queryByText(/A reviewed medication-allergy history entry was saved/)).toBeNull();
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(1);
});

test('ambiguous allergy-history save locks duplicate attempts until chart is reopened',async()=>{
 const calls=fixtures({omitReadback:true});
 render(<IntakeAllergyReconciliation {...props}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare medication-allergy review'}));
 fireEvent.click(screen.getByRole('checkbox'));
 const save=screen.getByRole('button',{name:'Save reviewed allergy-history entry'});
 fireEvent.click(save);
 expect(await screen.findByText(/exact reviewed entry was not verified on chart readback/)).toBeTruthy();
 expect(await screen.findByText(/Reopen the protected chart and inspect history before another attempt/)).toBeTruthy();
 expect((save as HTMLButtonElement).disabled).toBe(true);
 fireEvent.submit(save.closest('form')!);
 expect(calls.filter(c=>(c.payload as {path?:string})?.path==='/api/save')).toHaveLength(1);
});
