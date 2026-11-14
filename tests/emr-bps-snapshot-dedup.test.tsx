import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import PatientBpsIntakeReview from '@/app/emr/PatientBpsIntakeReview';

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const patient='00000000-0000-4000-8000-000000000801';
const stamp='2026-11-10T12:00:00Z';
function source(reviews:Record<string,unknown>[]=[]){
 return {patientId:patient,source:{accountId:'00000000-0000-4000-8000-000000000802',status:'submitted',version:7,updatedAt:stamp,submittedAt:stamp},
  sections:Array.from({length:21},(_,i)=>({title:'Section '+i,domain:'Context',disposition:'clinical',fields:[],answered:0})),
  unmappedKeys:[],reviews};
}
test('stale clinician API cannot present a post-attestation edit as a submitted BPS source',async()=>{
 const forged=source();
 forged.source.updatedAt='2026-11-10T12:00:01Z';
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(forged)));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toMatch(/provenance|reopen the protected source/i);
 expect(screen.queryByText(/Sections audited:/)).toBeNull();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
});

test('the original clinician review never offers a duplicate save for an already reviewed source version',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(source([{
  id:'00000000-0000-4000-8000-000000000999',reviewed:true,source_version:7,source_status:'submitted',
  source_updated_at:stamp,created_at:stamp,clinical_answers:{},clinician_notes:{}
 }]))));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/A clinician-reviewed BPS snapshot for this source version has already been saved/);
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(screen.getByText(/Previously saved immutable clinician reviews/i)).toBeTruthy();
});


test('unattested saved history is not counted as a clinician review and cannot be silently resubmitted',async()=>{
 let posts=0;
 vi.stubGlobal('fetch',vi.fn(async (_url:string,options?:RequestInit)=>{
  if(options?.method==='POST'){posts++;return Response.json({saved:true});}
  return Response.json(source([{
   id:'00000000-0000-4000-8000-000000000999',reviewed:false,
   source_version:7,source_status:'submitted',source_updated_at:stamp,
   created_at:stamp,clinical_answers:{},clinician_notes:{}
  }]));
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Saved clinician reviews:/);
 expect(screen.getByText(/Some saved history records lack confirmed clinician-review attestation; investigate provenance/)).toBeTruthy();
 expect(screen.getByText(/A BPS history record for this source version lacks confirmed clinician-review attestation/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(posts).toBe(0);
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
 await screen.findByText(/save was acknowledged by the database, but the exact clinician review was NOT verified/);
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
   id:savedId,reviewed:true,source_version:7,source_status:'submitted',
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
   id:savedId,reviewed:true,source_version:6,source_status:'submitted',
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
  id:savedId,reviewed:true,source_version:7,source_status:'submitted',
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
  id:'00000000-0000-4000-8000-000000000999',reviewed:true,source_version:7,source_status:'submitted',
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
 ['new source timestamp',{updatedAt:'2026-11-10T12:05:00Z',submittedAt:'2026-11-10T12:05:00Z'}],
 ['microsecond source timestamp change',{updatedAt:'2026-11-10T12:00:00.000001Z',submittedAt:'2026-11-10T12:00:00.000001Z'}]
])('acknowledged BPS save cannot be independently verified after %s during readback',async(_reason,changed)=>{
 const savedId='00000000-0000-4000-8000-000000000999';
 let reads=0,posts=0;
 const oldReview={id:savedId,reviewed:true,source_version:7,source_status:'submitted',
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


test.each(['lost POST response','indeterminate server error','malformed success receipt'])(
 'BPS clinician cannot retry same source version blindly after %s',async(scenario)=>{
 let posts=0,reads=0;
 vi.stubGlobal('fetch',vi.fn(async (_url:string,options?:RequestInit)=>{
  if(options?.method==='POST'){
   posts++;
   if(scenario==='lost POST response')throw Error('Connection interrupted before the save receipt');
   if(scenario==='indeterminate server error')
    return Response.json({error:'Unable to confirm review persistence'},{status:503});
   return Response.json({saved:false});
  }
  reads++;
  return Response.json(source());
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 await screen.findByText(/no save receipt was verified/i);
 expect(screen.getByText(/outcome of this submission is unknown; no clinical save is claimed/i)).toBeTruthy();
 expect(screen.queryByText(/snapshot saved AND independently verified/i)).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(posts).toBe(1);
 expect(reads).toBe(1);
 });


test.each([false,undefined])('a saved row with review attestation %s cannot prove completed clinician review',async(attestation)=>{
 const savedId='00000000-0000-4000-8000-000000000999';
 let reads=0;
 vi.stubGlobal('fetch',vi.fn(async (_url:string,options?:RequestInit)=>{
  if(options?.method==='POST')return Response.json({saved:true,id:savedId});
  reads++;
  return Response.json(reads===1?source():source([{
   id:savedId,reviewed:attestation,source_version:7,source_status:'submitted',
   source_updated_at:stamp,created_at:stamp,clinical_answers:{},clinician_notes:{}
  }]));
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 if(attestation===undefined){
  // Malformed (absent) attestation withholds historical content rather than
  // fabricating a false review; the acknowledged save remains locked.
  await screen.findByText(/exact clinician review was NOT independently verified/);
  expect(screen.queryByText(/Previously saved immutable clinician reviews/)).toBeNull();
 }else{
  await screen.findByText(/NOT verified in chart history/);
  expect(screen.getAllByText(/lacks confirmed clinician-review attestation/).length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText(/A BPS history record for this source version lacks confirmed clinician-review attestation/)).toBeTruthy();
 }
 expect(screen.queryByText(/saved AND independently verified/)).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(reads).toBe(2);
});

test('matching BPS review ID is insufficient when chart history timestamp differs by one microsecond',async()=>{
 const savedId='00000000-0000-4000-8000-000000000999';
 let reads=0;
 vi.stubGlobal('fetch',vi.fn(async (_url:string,options?:RequestInit)=>{
  if(options?.method==='POST')return Response.json({saved:true,id:savedId});
  reads++;
  return Response.json(reads===1?source():source([{
   id:savedId,reviewed:true,source_version:7,source_status:'submitted',
   source_updated_at:'2026-11-10T12:00:00.000001Z',created_at:stamp,
   clinical_answers:{},clinician_notes:{}
  }]));
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 await screen.findByText(/exact clinician review was NOT independently verified/);
 expect(screen.queryByText(/snapshot saved AND independently verified in the protected chart history/)).toBeNull();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(reads).toBe(2);
});

test('stale clinical API cannot expose fictional private identifiers through unmapped-field names in the BPS interface',async()=>{
 const privateFieldName='FICTIONAL_PATIENT 123-45-6789 confidential source';
 const report={...source(),unmappedKeys:[privateFieldName]};
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(report)));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/additional historical or unrecognized field\(s\) were recorded/i);
 expect(document.body.textContent).not.toContain(privateFieldName);
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeTruthy();
});

test.each([
 {saved:'yes',id:'00000000-0000-4000-8000-000000000999'},
 {saved:true,id:'not-a-review-uuid'},
 {saved:true},
 {saved:false,id:'00000000-0000-4000-8000-000000000999'}
])('malformed BPS database receipt never authorizes a success claim or blind retry: %j',async(receipt)=>{
 let reads=0,posts=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options?:RequestInit)=>{
  if(options?.method==='POST'){posts++;return Response.json(receipt);}
  reads++;return Response.json(source());
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 await screen.findByText(/outcome of this submission is unknown/i);
 expect(screen.queryByText(/saved AND independently verified in the protected chart history/)).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(reads).toBe(1);
 expect(posts).toBe(1);
});


test('clinician save cannot be independently verified if the patient submission attestation changes after its write',async()=>{
 const savedId='00000000-0000-4000-8000-000000000971';
 let reads=0,posts=0;
 vi.stubGlobal('fetch',vi.fn(async (_url:string,options?:RequestInit)=>{
  if(options?.method==='POST'){posts++;return Response.json({saved:true,id:savedId});}
  reads++;
  if(reads===1)return Response.json(source());
  // This new receipt is chronologically valid, and the saved review is after
  // both receipts. An unchanged source version/edit timestamp alone must NOT
  // establish that the clinician reviewed the newer patient attestation.
  const changed=source([{
   id:savedId,reviewed:true,source_version:7,source_status:'submitted',
   source_updated_at:stamp,created_at:'2026-11-10T12:00:00.000002Z',
   clinical_answers:{},clinician_notes:{}
  }]);
  changed.source.submittedAt='2026-11-10T12:00:00.000001Z';
  return Response.json(changed);
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 await screen.findByText(/linked intake source changed during chart-history verification/i);
 expect(screen.queryByText(/snapshot saved AND independently verified in the protected chart history/)).toBeNull();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(posts).toBe(1);
 expect(reads).toBe(2);
});

test('equivalent patient attestation instants in different timezone offsets still verify the same saved BPS source',async()=>{
 const savedId='00000000-0000-4000-8000-000000000972';
 let reads=0;
 vi.stubGlobal('fetch',vi.fn(async (_url:string,options?:RequestInit)=>{
  if(options?.method==='POST')return Response.json({saved:true,id:savedId});
  reads++;
  if(reads===1)return Response.json(source());
  const equivalent=source([{
   id:savedId,reviewed:true,source_version:7,source_status:'submitted',
   source_updated_at:stamp,created_at:stamp,clinical_answers:{},clinician_notes:{}
  }]);
  equivalent.source.submittedAt='2026-11-10T06:00:00-06:00';
  return Response.json(equivalent);
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 await screen.findByText(/snapshot saved AND independently verified in the protected chart history/);
 expect(reads).toBe(2);
});
