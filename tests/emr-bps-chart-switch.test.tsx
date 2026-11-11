import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import PatientBpsIntakeReview from '@/app/emr/PatientBpsIntakeReview';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('a pending BPS save cannot reopen or message the wrong patient chart',async()=>{
 const a='00000000-0000-0000-0000-000000000801',b='00000000-0000-0000-0000-000000000802';
 let done!: (response:any)=>void;
 const pending=new Promise<any>(resolve=>done=resolve);
 const reads:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async (url:string,init?:RequestInit)=>{
  if(init?.method==='POST')return pending;
  const id=new URL(url,'https://www.indiancreekpsych.com').searchParams.get('patient')||'';
  reads.push(id);
  return {ok:true,json:async()=>({patientId:id,source:{status:'submitted',version:id===a?2:9,updatedAt:'2026-11-10T12:00:00Z'},sections:Array.from({length:21},(_,i)=>({title:'Section '+i,domain:'History',disposition:'clinical',fields:[],answered:0})),unmappedKeys:[],reviews:[]})};
 }));
 const {rerender}=render(<PatientBpsIntakeReview patientId={a}/>);
 await screen.findByText(/Version 2/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 rerender(<PatientBpsIntakeReview patientId={b}/>);
 await screen.findByText(/Version 9/);
 await act(async()=>{done({ok:true,json:async()=>({saved:true})});await pending;});
 expect(screen.getByText(/Version 9/)).toBeTruthy();
 expect(screen.queryByText(/snapshot saved in the protected chart/i)).toBeNull();
 expect(reads).toEqual([a,b]);
});

test('clinician reconciliation independently withholds separate, structured, reference and unmarked patient source values',async()=>{
 const id='00000000-0000-4000-8000-000000000801';
 const sections=Array.from({length:21},(_,i)=>({
  title:'Intake section '+i,domain:'Context',disposition:i===1?'reference':i===2?'separate-review':'clinical',
  answered:i<3?3:0,fields:i===0?[
   {key:'counseling_reason',label:'Reported concern',type:'text',reported:true,sourceOnly:false,value:'SAFE PATIENT REPORTED CONCERN'},
   {key:'medication_entries',label:'Structured medication',type:'medications',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_STRUCTURED'},
   {key:'unmarked',label:'Unmarked historical data',type:'text',reported:true,value:'DO_NOT_LEAK_UNMARKED'}]:
   i===1?[{key:'roi_authorize',label:'Authorization',type:'text',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_LEGAL'}]:
   i===2?[{key:'insurance_member',label:'Coverage',type:'text',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_INSURANCE'}]:[]
 }));
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({patientId:id,source:{accountId:id,status:'submitted',version:2,updatedAt:'2026-11-11T12:00:00Z'},sections,unmappedKeys:[],reviews:[]})));
 render(<PatientBpsIntakeReview patientId={id}/>);
 await screen.findByText(/Version 2/);
 expect(screen.getByText('SAFE PATIENT REPORTED CONCERN')).toBeTruthy();
 for(const secret of ['DO_NOT_LEAK_STRUCTURED','DO_NOT_LEAK_UNMARKED','DO_NOT_LEAK_LEGAL','DO_NOT_LEAK_INSURANCE'])
  expect(screen.queryByText(secret)).toBeNull();
});
