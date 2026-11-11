import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import IntakeTraumaHistoryReconciliation from '@/app/emr/IntakeTraumaHistoryReconciliation';
import {traumaHistoryDefinition as definition} from '@/lib/patient/trauma-history';

const patientId='00000000-0000-0000-0000-000000000123';
const stamp='2026-11-10T08:30:00Z';
const selections=Object.fromEntries(definition.groups.map(group=>[group.key,[] as string[]]));
selections.experiences=['Physical assault or abuse'];
const source=JSON.stringify({definition_version:definition.version,selections});
const props={patientId,sourceJson:source,sourceUpdatedAt:stamp,sourceStatus:'submitted'};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function fixture({stale=false,unlinked=false,records=[] as unknown[],status='submitted'}={}){
 const calls:Array<{url:string;payload:any}>=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  const payload=init?.body?JSON.parse(String(init.body)):null;
  calls.push({url,payload});
  if(url.startsWith('/api/emr/patients'))return {ok:true,json:async()=>({
   patients:unlinked?[]:[{id:patientId}],
   intake:{updated_at:stale?'later':stamp,status,answers:{trauma_history_checklist:source}}
  })};
  if(payload?.path==='/api/save')return {ok:true,json:async()=>({revision:2,value:{saved:true}})};
  return {ok:true,json:async()=>({revision:1,value:{records}})};
 }));
 return calls;
}
const saves=(calls:Array<{payload:any}>)=>calls.filter(c=>c.payload?.path==='/api/save');

test('structured trauma history stays read-only until clinician intentionally prepares and reviews a draft',async()=>{
 const calls=fixture();
 render(<IntakeTraumaHistoryReconciliation {...props}/>);
 expect(await screen.findByText(/Saved biopsychosocial trauma-history snapshots: 0/)).toBeTruthy();
 expect(saves(calls)).toHaveLength(0);
 fireEvent.click(screen.getByRole('button',{name:'Prepare clinician trauma-history draft'}));
 expect(saves(calls)).toHaveLength(0);
 expect((screen.getByRole('button',{name:'Save reviewed trauma-history snapshot'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed these reported details/}));
 fireEvent.click(screen.getByRole('button',{name:'Save reviewed trauma-history snapshot'}));
 expect(await screen.findByText(/reviewed trauma-history snapshot was saved/)).toBeTruthy();
 expect(saves(calls)).toHaveLength(1);
 const write=saves(calls)[0].payload;
 expect(write.patientId).toBe(patientId);
 expect(write.expectedRevision).toBe(1);
 expect(write.body.patient_id).toBe(patientId);
 expect(write.body.action).toBe('biopsychosocial_trauma_history');
 expect(write.body.data.selections).toEqual(selections);
 expect(write.body.data.notes).toEqual({context_notes:'',followup_notes:'',source_notes:''});
});
test('stale or unlinked intake cannot be imported into a patient chart',async()=>{
 for(const variant of [{stale:true},{unlinked:true}]){
  cleanup();const calls=fixture(variant);
  render(<IntakeTraumaHistoryReconciliation {...props}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician trauma-history draft'}));
  fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed these reported details/}));
  fireEvent.click(screen.getByRole('button',{name:'Save reviewed trauma-history snapshot'}));
  expect(await screen.findByText(/Linked intake trauma history changed or was unlinked/)).toBeTruthy();
  expect(saves(calls)).toHaveLength(0);
 }
});
test('duplicate reviewed snapshot is refused before a network write',async()=>{
 const calls=fixture({records:[{kind:'biopsychosocial_trauma_history',definition:{version:definition.version},selections,notes:{context_notes:'',followup_notes:'',source_notes:''}}]});
 render(<IntakeTraumaHistoryReconciliation {...props}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician trauma-history draft'}));
 expect(await screen.findByText(/An identical history snapshot is already saved/)).toBeTruthy();
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed these reported details/}));
 expect((screen.getByRole('button',{name:'Save reviewed trauma-history snapshot'}) as HTMLButtonElement).disabled).toBe(true);
 expect(saves(calls)).toHaveLength(0);
});
test('editing a history selection invalidates the prior clinician review',async()=>{
 const calls=fixture();
 render(<IntakeTraumaHistoryReconciliation {...props}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Prepare clinician trauma-history draft'}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed these reported details/}));
 expect((screen.getByRole('button',{name:'Save reviewed trauma-history snapshot'}) as HTMLButtonElement).disabled).toBe(false);
 fireEvent.click(screen.getByLabelText('Childhood'));
 expect((screen.getByRole('button',{name:'Save reviewed trauma-history snapshot'}) as HTMLButtonElement).disabled).toBe(true);
 expect(saves(calls)).toHaveLength(0);
});
test('malformed or unsupported questionnaire never permits a transfer',async()=>{
 const calls=fixture();
 render(<IntakeTraumaHistoryReconciliation {...props} sourceJson='{"definition_version":"outdated","selections":{}}'/>);
 expect(screen.getByRole('alert').textContent).toMatch(/unsupported version/);
 expect(screen.queryByRole('button',{name:'Prepare clinician trauma-history draft'})).toBeNull();
 expect(saves(calls)).toHaveLength(0);
});
