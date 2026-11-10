import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import IntakeAllergyReconciliation from '@/app/emr/IntakeAllergyReconciliation';
const patient='00000000-0000-0000-0000-000000000123',sourceUpdatedAt='2026-11-09T00:00:00Z';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function fixtures({stale=false,records=[] as unknown[]}={}){
 const calls:Array<{url:string;payload:unknown}>=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  const payload=init?.body?JSON.parse(String(init.body)):null;calls.push({url,payload});
  if(url.startsWith('/api/emr/patients'))return {ok:true,json:async()=>({patients:[{id:patient}],intake:{updated_at:stale?'new source':sourceUpdatedAt,
   answers:{medication_allergy_status:'Medication allergies reported',medication_allergy_notes:'Fictional reported reaction'}}})};
  if(payload?.path==='/api/save')return {ok:true,json:async()=>({value:{saved:true},revision:2})};
  return {ok:true,json:async()=>({value:{records},revision:1})};
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
