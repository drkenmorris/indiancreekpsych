import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import PatientBpsIntakeReview from '@/app/emr/PatientBpsIntakeReview';

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const patient='00000000-0000-4000-8000-000000000801';
const stamp='2026-11-10T12:00:00Z';
function source(reviews:Record<string,unknown>[]=[]){
 return {patientId:patient,source:{accountId:'00000000-0000-4000-8000-000000000802',status:'submitted',version:7,updatedAt:stamp},
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


test('clinician BPS save is independently confirmed only after exact source-provenant chart history readback',async()=>{
 const savedId='00000000-0000-4000-8000-000000000999';
 let reads=0;
 vi.stubGlobal('fetch',vi.fn(async (_url:string,options?:RequestInit)=>{
  if(options?.method==='POST')return Response.json({saved:true,id:savedId});
  reads++;
  return Response.json(reads===1?source():source([{
   id:savedId,source_version:7,source_status:'submitted',
   source_updated_at:'2026-11-10T06:00:00-06:00',created_at:stamp,
   clinical_answers:{},clinician_notes:{}
  }]));
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 await screen.findByText(/snapshot saved AND independently verified in the protected chart history/);
 expect(screen.queryByText(/NOT verified in chart history/)).toBeNull();
 expect(reads).toBe(2);
});

test('clinician BPS save cannot claim verified chart history when readback has mismatched source provenance',async()=>{
 const savedId='00000000-0000-4000-8000-000000000999';
 let reads=0,posts=0;
 vi.stubGlobal('fetch',vi.fn(async (_url:string,options?:RequestInit)=>{
  if(options?.method==='POST'){posts++;return Response.json({saved:true,id:savedId});}
  reads++;
  return Response.json(reads===1?source():source([{
   id:savedId,source_version:6,source_status:'submitted',
   source_updated_at:stamp,created_at:stamp,
   clinical_answers:{},clinician_notes:{}
  }]));
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 await screen.findByText(/NOT verified in chart history/);
 expect(screen.queryByText(/snapshot saved AND independently verified in the protected chart history/)).toBeNull();
 expect(screen.getByText(/A clinician-reviewed BPS snapshot for this source version has already been saved/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(posts).toBe(1);
 expect(reads).toBe(2);
});

test('an acknowledged BPS save remains unverified until protected history readback resolves',async()=>{
 const savedId='00000000-0000-4000-8000-000000000999';
 let reads=0;
 let releaseReadback!: (value:Response)=>void;
 const delayedReadback=new Promise<Response>(resolve=>{releaseReadback=resolve;});
 vi.stubGlobal('fetch',vi.fn(async (_url:string,options?:RequestInit)=>{
  if(options?.method==='POST')return Response.json({saved:true,id:savedId});
  reads++;
  return reads===1?Response.json(source()):delayedReadback;
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 await screen.findByText(/save acknowledged; verifying the saved review ID and source provenance/);
 expect(screen.queryByText(/saved AND independently verified/)).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(reads).toBe(2);
 releaseReadback(Response.json(source([{
  id:savedId,source_version:7,source_status:'submitted',
  source_updated_at:stamp,created_at:stamp,
  clinical_answers:{},clinician_notes:{}
 }])));
 await screen.findByText(/saved AND independently verified in the protected chart history/);
 expect(screen.queryByText(/save acknowledged; verifying/)).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
});

test('clinician BPS history with malformed historical clinician notes fails closed in the rendered chart',async()=>{
 const withheld='PRIVATE_LEGAL_IN_HISTORICAL_NOTE';
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(source([{
  id:'00000000-0000-4000-8000-000000000999',source_version:7,source_status:'submitted',
  source_updated_at:stamp,created_at:stamp,clinical_answers:{},
  clinician_notes:{presenting:'Allowed independent clinician observation',unknown_legal_field:withheld,
   medical:{raw:'PRIVATE_STRUCTURED_MEDICAL_NOTE'},safety:'S'.repeat(4001)}
 }]))));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 expect(screen.getByText('Allowed independent clinician observation')).toBeTruthy();
 expect(screen.getByText(/3 unapproved or malformed historical clinician-note field/)).toBeTruthy();
 expect(screen.queryByText(withheld)).toBeNull();
 expect(screen.queryByText('PRIVATE_STRUCTURED_MEDICAL_NOTE')).toBeNull();
 expect(screen.queryByText('S'.repeat(4001))).toBeNull();
});


test.each([
 ['new source version',{version:8}],
 ['different linked account',{accountId:'00000000-0000-4000-8000-000000000803'}],
 ['changed source status',{status:'draft'}],
 ['new source timestamp',{updatedAt:'2026-11-10T12:05:00Z'}]
])('acknowledged BPS save cannot be independently verified after %s during readback',async(_reason,changed)=>{
 const savedId='00000000-0000-4000-8000-000000000999';
 let reads=0,posts=0;
 const oldReview={id:savedId,source_version:7,source_status:'submitted',
  source_updated_at:stamp,created_at:stamp,clinical_answers:{},clinician_notes:{}};
 vi.stubGlobal('fetch',vi.fn(async (_url:string,options?:RequestInit)=>{
  if(options?.method==='POST'){posts++;return Response.json({saved:true,id:savedId});}
  reads++;
  const original=source();
  return Response.json(reads===1?original:{
   ...source([oldReview]),source:{...original.source,...changed}
  });
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 await screen.findByText(/linked intake source changed during chart-history verification/);
 expect(screen.queryByText(/saved AND independently verified in the protected chart history/)).toBeNull();
 expect(screen.getByText(/A clinician-reviewed BPS snapshot for this source version has already been saved/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 // The acknowledged source remains locked until reopening this chart; a changed
 // account/status/version must never unlock another save within the same session.
 expect(screen.getByText(/Version 7/)).toBeTruthy();
 expect(posts).toBe(1);
 expect(reads).toBe(2);
});
