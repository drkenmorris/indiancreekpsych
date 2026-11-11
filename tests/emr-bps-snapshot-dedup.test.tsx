import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import PatientBpsIntakeReview from '@/app/emr/PatientBpsIntakeReview';

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const patient='00000000-0000-4000-8000-000000000801';
const stamp='2026-11-10T12:00:00Z';
function source(reviews:Record<string,unknown>[]=[]){
 return {patientId:patient,source:{status:'submitted',version:7,updatedAt:stamp},
  sections:Array.from({length:21},(_,i)=>({title:'Section '+i,domain:'Context',disposition:'clinical',fields:[],answered:0})),
  unmappedKeys:[],reviews};
}
test('the original clinician review never offers a duplicate save for an already reviewed source version',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(source([{
  id:'00000000-0000-4000-8000-000000000999',source_version:7,source_status:'submitted',
  source_updated_at:stamp,created_at:stamp,clinical_answers:{},clinician_notes:{}
 }]))));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/A clinician-reviewed BPS snapshot for this source version has already been saved/);
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(screen.getByText(/Previously saved immutable clinician reviews/i)).toBeTruthy();
});

test('an acknowledged save stays locked if the history read-back fails',async()=>{
 let reads=0,posts=0;
 vi.stubGlobal('fetch',vi.fn(async (_url:string,options?:RequestInit)=>{
  if(options?.method==='POST'){posts++;return Response.json({saved:true,id:'00000000-0000-4000-8000-000000000999'});}
  reads++;
  return reads===1?Response.json(source()):Response.json({error:'History unavailable'},{status:503});
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 await screen.findByText(/snapshot WAS saved, but its history could not be reloaded/);
 expect(screen.getByText(/A clinician-reviewed BPS snapshot for this source version has already been saved/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(posts).toBe(1);
 expect(reads).toBe(2);
});
