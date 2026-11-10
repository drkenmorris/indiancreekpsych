import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import PatientGroupHistory from '@/app/emr/PatientGroupHistory';

const p='00000000-0000-0000-0000-000000000101';
const session='00000000-0000-0000-0000-000000000201';
const absent='00000000-0000-0000-0000-000000000202';
const history={patientId:p,timezone:'America/Chicago',sessions:[
 {id:session,group_name:'Fictional skills group',scheduled_start:'2026-11-09T20:00:00Z',duration_minutes:60,shared_topic:'Communication',attendance:'Present',created_at:'2026-11-09T20:00:00Z'},
 {id:absent,group_name:'Fictional second group',scheduled_start:'2026-11-08T20:00:00Z',duration_minutes:60,shared_topic:'Safety',attendance:'Absent',created_at:'2026-11-08T20:00:00Z'},
]};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

test('only attended sessions offer patient-bound DAP/SOAP/Narrative note editor; review is required for POST',async()=>{
 const calls:Array<{url:string;method:string;body?:Record<string,unknown>}>=[];
 let saved=false;
 vi.stubGlobal('fetch',vi.fn(async (url:string,init?:RequestInit)=>{
  const method=init?.method??'GET';
  calls.push({url,method,body:init?.body?JSON.parse(String(init.body)):undefined});
  if(url.startsWith('/api/emr/groups/patient?'))
   return {ok:true,json:async()=>history};
  if(url.startsWith('/api/emr/groups/individual-notes?'))
   return {ok:true,json:async()=>({patientId:p,sessionId:session,notes:saved?[{
    id:'00000000-0000-0000-0000-000000000299',patient_id:p,session_id:session,
    template:'DAP',sections:{data:'Participated appropriately',assessment:'Engagement recorded',plan:'Continue sessions'},
    created_at:'2026-11-09T21:00:00Z',
   }]:[]})};
  if(url==='/api/emr/groups/individual-notes'&&method==='POST'){
   saved=true;
   return {ok:true,json:async()=>({saved:true,unsigned:true,id:'00000000-0000-0000-0000-000000000299'})};
  }
  throw Error('Unexpected request '+method+' '+url);
 }));
 render(<PatientGroupHistory patientId={p}/>);
 expect(await screen.findByText(/Attendance: Present/)).toBeTruthy();
 expect(screen.getAllByRole('button',{name:'Open individual notes for this attended session'})).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'Open individual notes for this attended session'}));
 expect(await screen.findByText('No individual progress note has been saved for this session.')).toBeTruthy();
 expect(calls.filter(c=>c.url.includes('/individual-notes?'))[0].url).toBe('/api/emr/groups/individual-notes?patient='+p+'&session='+session);
 const saveButton=screen.getByRole('button',{name:'Save unsigned individual note'}) as HTMLButtonElement;
 expect(saveButton.disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Data'),{target:{value:'Participated appropriately'}});
 fireEvent.change(screen.getByLabelText('Assessment'),{target:{value:'Engagement recorded'}});
 fireEvent.change(screen.getByLabelText('Plan'),{target:{value:'Continue sessions'}});
 expect(saveButton.disabled).toBe(true);
 fireEvent.click(screen.getByLabelText(/I reviewed this patient's individual note/));
 expect(saveButton.disabled).toBe(false);
 fireEvent.click(saveButton);
 await waitFor(()=>expect(calls.filter(c=>c.method==='POST')).toHaveLength(1));
 const payload=calls.find(c=>c.method==='POST')?.body;
 expect(payload).toEqual({patient_id:p,session_id:session,template:'DAP',reviewed:true,
  sections:{data:'Participated appropriately',assessment:'Engagement recorded',plan:'Continue sessions'}});
 expect(await screen.findByText(/Reviewed individual progress note saved as an unsigned/)).toBeTruthy();
 expect(screen.getByText('DAP — unsigned')).toBeTruthy();
 expect(calls.every(c=>!c.url.includes(absent))).toBe(true);
});

test('a mismatched patient note response fails closed without displaying notes or allowing writes',async()=>{
 vi.stubGlobal('fetch',vi.fn(async (url:string)=>{
  if(url.startsWith('/api/emr/groups/patient?'))return {ok:true,json:async()=>({...history,sessions:[history.sessions[0]]})};
  return {ok:true,json:async()=>({patientId:'00000000-0000-0000-0000-000000000999',sessionId:session,notes:[]})};
 }));
 render(<PatientGroupHistory patientId={p}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Open individual notes for this attended session'}));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('did not match the selected central patient'));
 expect(screen.queryByRole('button',{name:'Save unsigned individual note'})).toBeNull();
});
