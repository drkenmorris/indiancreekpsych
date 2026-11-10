import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import IntakeMedicationReconciliation from '@/app/emr/IntakeMedicationReconciliation';

const id='00000000-0000-0000-0000-000000000123',updated='2026-11-09T14:00:00Z';
const entry={medication:'Fictional Medicine',status:'Past',dosage:'5 mg',frequency:'Daily',start_date:'2025-01-01',end_date:'2025-05-01',prescribing_physician:'Example provider',benefit:'Beneficial'};
const intakeJson=JSON.stringify([entry]);
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function mockApi({stale=false,records=[] as unknown[]}={}){
 const calls:Array<{url:string;body:unknown}>=[];
 vi.stubGlobal('fetch',vi.fn(async (url:string,init?:RequestInit)=>{
  const body=init?.body?JSON.parse(String(init.body)):null;
  calls.push({url,body});
  if(url.startsWith('/api/emr/patients'))return {ok:true,json:async()=>({patients:[{id}],intake:{updated_at:stale?'newer':updated,answers:{medication_entries:intakeJson}}})};
  if(body?.path==='/api/save')return {ok:true,json:async()=>({value:{saved:true},revision:2})};
  return {ok:true,json:async()=>({value:{records},revision:1})};
 }));
 return calls;
}
test('source is read without saving; saving requires explicit review, uses protected central workflow and does not overwrite prior entries',async()=>{
 const calls=mockApi();
 render(<IntakeMedicationReconciliation patientId={id} intakeJson={intakeJson} intakeUpdatedAt={updated}/>);
 const prepare=await screen.findByRole('button',{name:'Prepare review draft'});
 expect(calls.filter(c=>(c.body as {path?:string})?.path==='/api/save')).toHaveLength(0);
 fireEvent.click(prepare);
 const save=screen.getByRole('button',{name:'Save reviewed medication-history entry'});
 expect((save as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox'));
 expect((save as HTMLButtonElement).disabled).toBe(false);
 fireEvent.click(save);
 expect(await screen.findByText(/A new medication-history entry was saved/)).toBeTruthy();
 const writes=calls.filter(c=>(c.body as {path?:string})?.path==='/api/save');
 expect(writes).toHaveLength(1);
 const p=writes[0].body as {patientId:string;expectedRevision:number;body:{action:string;patient_id:string;data:{prior_id:string;medication:string}}};
 expect(p.patientId).toBe(id);expect(p.expectedRevision).toBe(1);
 expect(p.body.patient_id).toBe(id);expect(p.body.action).toBe('biopsychosocial_medication');
 expect(p.body.data).toMatchObject({medication:'Fictional Medicine',prior_id:''});
 expect(calls.some(c=>c.url.startsWith('/api/emr/patients?id='))).toBe(true);
});
test('changed intake blocks write rather than transferring stale medication values',async()=>{
 const calls=mockApi({stale:true});
 render(<IntakeMedicationReconciliation patientId={id} intakeJson={intakeJson} intakeUpdatedAt={updated}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare review draft'}));
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Save reviewed medication-history entry'}));
 expect(await screen.findByText(/Patient intake changed/)).toBeTruthy();
 expect(calls.filter(c=>(c.body as {path?:string})?.path==='/api/save')).toHaveLength(0);
});
test('existing chart medication is not duplicated and malformed intake cannot be transferred',async()=>{
 const calls=mockApi({records:[{kind:'biopsychosocial_medication',id:'example',...entry}]});
 const view=render(<IntakeMedicationReconciliation patientId={id} intakeJson={intakeJson} intakeUpdatedAt={updated}/>);
 expect((await screen.findByRole('button',{name:'Already in central history'}) as HTMLButtonElement).disabled).toBe(true);
 expect(calls.filter(c=>(c.body as {path?:string})?.path==='/api/save')).toHaveLength(0);
 view.rerender(<IntakeMedicationReconciliation patientId={id} intakeJson="not-json" intakeUpdatedAt={updated}/>);
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('malformed or incomplete'));
});
