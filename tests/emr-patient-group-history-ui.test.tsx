import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import PatientGroupHistory from '@/app/emr/PatientGroupHistory';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('patient chart lists only read-only central group attendance, never saves or imports demo notes',async()=>{
 const id='00000000-0000-0000-0000-000000000101';
 const calls:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async (url:string,init?:RequestInit)=>{
   calls.push((init?.method??'GET')+' '+url);
   return {ok:true,json:async()=>({patientId:id,timezone:'America/Chicago',sessions:[{
    id:'00000000-0000-0000-0000-000000000201',group_name:'Fictional skills group',
    scheduled_start:'2026-11-09T20:00:00Z',duration_minutes:60,
    shared_topic:'Communication',attendance:'Present',created_at:'2026-11-09T20:00:00Z',
   }]})};
 }));
 render(<PatientGroupHistory patientId={id}/>);
 expect(await screen.findByText('Fictional skills group',{exact:false})).toBeTruthy();
 expect(screen.getByText(/Attendance: Present/)).toBeTruthy();
 expect(screen.getByText(/not an individualized progress note/)).toBeTruthy();
 expect(calls).toEqual(['GET /api/emr/groups/patient?patient='+id]);
});
test('unavailable group history does not block the rest of the chart',async()=>{
 vi.stubGlobal('fetch',vi.fn(async ()=>({ok:false,json:async()=>({error:'Patient group history unavailable.'})})));
 render(<PatientGroupHistory patientId="00000000-0000-0000-0000-000000000101"/>);
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('Existing chart records remain available'));
});
