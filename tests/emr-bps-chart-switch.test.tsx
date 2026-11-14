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
  return {ok:true,json:async()=>({patientId:id,source:{accountId:id,status:'submitted',version:id===a?2:9,updatedAt:'2026-11-10T12:00:00Z',submittedAt:'2026-11-10T12:00:00Z'},sections:Array.from({length:21},(_,i)=>({title:'Section '+i,domain:'History',disposition:'clinical',fields:[],answered:0})),unmappedKeys:[],reviews:[]})};
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
  answered:i===0?7:i===1||i===2||i===3||i===4?1:0,fields:i===0?[
   {key:'counseling_reason',label:'Reported concern',type:'text',reported:true,sourceOnly:false,value:'SAFE PATIENT REPORTED CONCERN'},
   {key:'insurance_member',label:'Spoofed coverage field',type:'text',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_SPOOFED_INSURANCE'},
   {key:'roi_authorize',label:'Spoofed authorization field',type:'text',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_SPOOFED_LEGAL'},
   {key:'prior_psychiatric_medications',label:'Retired medication history spoof',type:'historical-patient-report',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_RETIRED_MEDICATION'},
   {key:'legal_history',label:'Retired legal history spoof',type:'historical-patient-report',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_RETIRED_LEGAL'},
   {key:'medication_entries',label:'Structured medication',type:'medications',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_STRUCTURED'},
   {key:'unmarked',label:'Unmarked historical data',type:'text',reported:true,value:'DO_NOT_LEAK_UNMARKED'}]:
   i===1?[{key:'roi_authorize',label:'Authorization',type:'text',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_LEGAL'}]:
   i===2?[{key:'insurance_member',label:'Coverage',type:'text',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_INSURANCE'}]:
    i===3?[{key:'counseling_reason',label:'Falsely marked unreported',type:'text',reported:false,sourceOnly:false,value:'DO_NOT_LEAK_FALSE_REPORTED'}]:
    i===4?[{key:'counseling_reason',label:'Missing patient-report attestation',type:'text',sourceOnly:false,value:'DO_NOT_LEAK_MISSING_REPORTED'}]:[]
 }));
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({patientId:id,source:{accountId:id,status:'submitted',version:2,updatedAt:'2026-11-11T12:00:00Z',submittedAt:'2026-11-11T12:00:00Z'},sections,unmappedKeys:[],reviews:[]})));
 render(<PatientBpsIntakeReview patientId={id}/>);
 await screen.findByText(/Version 2/);
 expect(screen.getByText('SAFE PATIENT REPORTED CONCERN')).toBeTruthy();
 for(const secret of ['DO_NOT_LEAK_STRUCTURED','DO_NOT_LEAK_UNMARKED','DO_NOT_LEAK_LEGAL','DO_NOT_LEAK_INSURANCE','DO_NOT_LEAK_SPOOFED_INSURANCE','DO_NOT_LEAK_SPOOFED_LEGAL','DO_NOT_LEAK_RETIRED_MEDICATION','DO_NOT_LEAK_RETIRED_LEGAL','DO_NOT_LEAK_FALSE_REPORTED','DO_NOT_LEAK_MISSING_REPORTED'])
  expect(screen.queryByText(secret)).toBeNull();
});

test.each([
 ['missing linked account', {accountId:null}],
 ['invalid linked account', {accountId:'not-a-uuid'}],
 ['unsupported source status', {status:'revoked'}],
 ['zero source version', {version:0}],
 ['unsafe integer source version', {version:Number.MAX_SAFE_INTEGER+1}],
 ['invalid source timestamp', {updatedAt:'not-a-timestamp'}],
  ['ambiguous numeric source timestamp', {updatedAt:'1'}],
  ['calendar-normalized impossible source date', {updatedAt:'2026-02-30T09:00:00Z'}],
  ['date-only source without clock or timezone', {updatedAt:'2026-11-10'}],
 ['missing history array', {reviews:null}]
])('clinician BPS review withholds patient statements and save controls for %s',async(_reason,change)=>{
 const id='00000000-0000-4000-8000-000000000801';
 const source={accountId:'00000000-0000-4000-8000-000000000802',status:'submitted',version:7,updatedAt:'2026-11-10T12:00:00Z',submittedAt:'2026-11-10T12:00:00Z'};
 const response={
  patientId:id,source,sections:Array.from({length:21},(_,i)=>({
   title:'Section '+i,domain:'Clinical context',disposition:'clinical',answered:i===0?1:0,
   fields:i===0?[{key:'counseling_reason',label:'Patient report',type:'text',
    sourceOnly:false,reported:true,value:'PRIVATE_FICTIONAL_PATIENT_REPORT'}]:[]
  })),unmappedKeys:[],reviews:[]
 };
 const altered='reviews' in change?{...response,reviews:change.reviews}:{...response,source:{...source,...change}};
 let posts=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options?:RequestInit)=>{
  if(options?.method==='POST')posts++;
  return Response.json(altered);
 }));
 render(<PatientBpsIntakeReview patientId={id}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('provenance or clinical review history could not be verified');
 expect(screen.queryByText('PRIVATE_FICTIONAL_PATIENT_REPORT')).toBeNull();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(posts).toBe(0);
});

test.each([
 'missing section fields',
 'non-string patient response',
 'unsupported section routing',
 'impossible answered field count',
 'duplicate source field identities',
 'malformed unmapped source audit'
])('clinician BPS never renders source PHI or offers save for %s',async(variant)=>{
 const patient='00000000-0000-4000-8000-000000000851';
 const account='00000000-0000-4000-8000-000000000852';
 const sections:any[]=Array.from({length:21},(_,i)=>({
  title:'Intake section '+i,domain:'Clinical context',disposition:'clinical',
  answered:i===1?1:0,
  fields:i===1?[{
   key:'counseling_reason',label:'Patient report',type:'text',sourceOnly:false,
   reported:true,value:'PRIVATE_FICTIONAL_SOURCE_MUST_NOT_RENDER'
  }]:[]
 }));
 let unmappedKeys:any[]=[];
 if(variant==='missing section fields')sections[0].fields=null;
 if(variant==='non-string patient response')sections[0].fields=[{
  key:'counseling_reason',label:'Malformatted response',type:'text',
  reported:true,sourceOnly:false,value:{secret:'PRIVATE_NESTED_PHI'}
 }];
 if(variant==='unsupported section routing')sections[0].disposition='legal-consent';
 if(variant==='impossible answered field count')sections[0].answered=99;
 if(variant==='duplicate source field identities')sections[1].fields.push({
  key:'counseling_reason',label:'Conflicting duplicate patient statement',
  type:'text',sourceOnly:false,reported:true,value:'PRIVATE_DUPLICATE_FICTIONAL_REPORT'
 });
 if(variant==='malformed unmapped source audit')unmappedKeys=['ok',{secret:'PRIVATE_AUDIT_PHI'}];
 let posts=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options?:RequestInit)=>{
  if(options?.method==='POST')posts++;
  return Response.json({patientId:patient,source:{accountId:account,status:'submitted',
   version:3,updatedAt:'2026-11-12T12:00:00Z',submittedAt:'2026-11-12T12:00:00Z'},sections,unmappedKeys,reviews:[]});
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('21-section intake mapping is malformed');
 expect(document.body.textContent).not.toContain('PRIVATE_FICTIONAL_SOURCE_MUST_NOT_RENDER');
 expect(document.body.textContent).not.toContain('PRIVATE_DUPLICATE_FICTIONAL_REPORT');
 expect(document.body.textContent).not.toContain('PRIVATE_NESTED_PHI');
 expect(document.body.textContent).not.toContain('PRIVATE_AUDIT_PHI');
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(posts).toBe(0);
});

test('idle linked-intake refresh is source-scoped, stops during clinician review, and fails closed on invalid refreshed provenance',async()=>{
 const patient='00000000-0000-4000-8000-000000000811';
 const account='00000000-0000-4000-8000-000000000812';
 let version=2, valid=true, calls=0;
 const response=()=>({
  patientId:patient,
  source:{accountId:account,status:valid?'submitted':'retracted',version,updatedAt:'2026-11-12T12:00:00Z',submittedAt:'2026-11-12T12:00:00Z'},
  sections:Array.from({length:21},(_,i)=>({
   title:i===0?'Presenting concerns':i===1?'Medications':'Section '+i,
   domain:i===1?'Medication reconciliation':'Clinical context',
   disposition:i===1?'separate-review':'clinical',
   answered:i<2?1:0,
   fields:i===0?[{key:'counseling_reason',label:'Presenting concern',type:'text',sourceOnly:false,reported:true,value:'FICTIONAL_CONCERN_V'+version}]:
    i===1?[{key:'medication_entries',label:'Structured medication',type:'medications',sourceOnly:true,reported:true,value:'PRIVATE_MEDICATION_V'+version}]:[]
  })),unmappedKeys:[],reviews:[]
 });
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init?:RequestInit)=>{
  if(init?.method==='POST')throw Error('Test must not save a review');
  calls++;
  return Response.json(response());
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 2/);
 expect(screen.getByText('FICTIONAL_CONCERN_V2')).toBeTruthy();
 expect(document.body.textContent).not.toContain('PRIVATE_MEDICATION_V2');
 version=3;
 await act(async()=>{window.dispatchEvent(new Event('focus'));});
 await screen.findByText(/Version 3/);
 expect(screen.getByText('FICTIONAL_CONCERN_V3')).toBeTruthy();
 expect(document.body.textContent).not.toContain('PRIVATE_MEDICATION_V3');
 expect(calls).toBe(2);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.change(screen.getByLabelText('Presenting concerns and functional impact'),{target:{value:'UNSAVED_FICTIONAL_NOTE'}});
 version=4;
 await act(async()=>{window.dispatchEvent(new Event('focus'));});
 expect(calls).toBe(2);
 expect(screen.getByText(/Version 3/)).toBeTruthy();
 expect(screen.getByDisplayValue('UNSAVED_FICTIONAL_NOTE')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/Discard unsaved draft/i}));
 await act(async()=>{window.dispatchEvent(new Event('focus'));});
 await screen.findByText(/Version 4/);
 expect(screen.getByText('FICTIONAL_CONCERN_V4')).toBeTruthy();
 expect(document.body.textContent).not.toContain('PRIVATE_MEDICATION_V4');
 valid=false;
 await act(async()=>{window.dispatchEvent(new Event('focus'));});
 expect((await screen.findByRole('alert')).textContent).toContain('provenance or clinical review history could not be verified');
 expect(screen.queryByText('FICTIONAL_CONCERN_V4')).toBeNull();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
});


test.each([
 ['invalid historical review ID',{id:'not-a-uuid'}],
 ['invalid historical source version',{source_version:0}],
 ['missing clinician review attestation',{reviewed:undefined}],
 ['nonboolean clinician review attestation',{reviewed:'yes'}],
 ['unsupported historical source status',{source_status:'revoked'}],
 ['invalid historical source date',{source_updated_at:'2026-02-30T09:00:00Z'}],
 ['invalid review creation date',{created_at:'not-a-date'}],
 ['malformed historical clinical answers',{clinical_answers:['PHI_NOT_A_RECORD']}],
 ['missing historical clinician notes',{clinician_notes:null}],
])('clinician BPS UI fails closed when %s cannot be verified',async(_label,change)=>{
 const id='00000000-0000-4000-8000-000000000841';
 const account='00000000-0000-4000-8000-000000000842';
 const stamp='2026-11-12T12:00:00Z';
 const review={
  id:'00000000-0000-4000-8000-000000000843',
  reviewed:true,source_version:3,source_status:'submitted',
  source_updated_at:stamp,created_at:stamp,
  clinical_answers:{counseling_reason:'PRIVATE_FICTIONAL_HISTORICAL_STATEMENT'},
  clinician_notes:{presenting:'PRIVATE_FICTIONAL_CLINICIAN_OBSERVATION'}
 };
 let postCount=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init?:RequestInit)=>{
  if(init?.method==='POST')postCount++;
  return Response.json({
   patientId:id,
   source:{accountId:account,status:'submitted',version:3,updatedAt:stamp,submittedAt:stamp},
   sections:Array.from({length:21},(_,i)=>({
    title:'Clinical source '+i,domain:'History',disposition:'clinical',
    answered:i===0?1:0,
    fields:i===0?[{key:'counseling_reason',label:'Reported concern',
     type:'text',sourceOnly:false,reported:true,value:'PRIVATE_FICTIONAL_CURRENT_STATEMENT'}]:[]
   })),
   unmappedKeys:[],reviews:[{...review,...change}]
  });
 }));
 render(<PatientBpsIntakeReview patientId={id}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('invalid saved-row provenance');
 const visible=document.body.textContent||'';
 expect(visible).not.toContain('PRIVATE_FICTIONAL_HISTORICAL_STATEMENT');
 expect(visible).not.toContain('PRIVATE_FICTIONAL_CLINICIAN_OBSERVATION');
 expect(visible).not.toContain('PRIVATE_FICTIONAL_CURRENT_STATEMENT');
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(postCount).toBe(0);
});


test.each([
 ['missing submitted receipt',undefined],
 ['malformed submitted receipt','not-a-date'],
 ['impossible submitted receipt','2026-02-30T12:00:00Z']
])('protected clinician BPS refuses %s before rendering intake or permitting review',async(_description,submittedAt)=>{
 const patient='00000000-0000-4000-8000-000000000876';
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({
  patientId:patient,source:{accountId:patient,status:'submitted',version:2,
   updatedAt:'2026-11-10T12:00:00Z',submittedAt},
  sections:Array.from({length:21},(_,i)=>({
   title:'Section '+i,domain:'History',disposition:'clinical',
   fields:i===0?[{key:'counseling_reason',label:'Reason',type:'text',
    reported:true,sourceOnly:false,value:'PRIVATE_FICTIONAL_REPORTED_SOURCE'}]:[],answered:i===0?1:0
  })),
  unmappedKeys:[],reviews:[]
 })));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/provenance or clinical review history could not be verified/i);
 expect(screen.queryByText('PRIVATE_FICTIONAL_REPORTED_SOURCE')).toBeNull();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
});


test('duplicate twenty-one-section titles fail closed before displaying patient reports or permitting a clinician save',async()=>{
 const id='00000000-0000-4000-8000-000000000875';
 const sections=Array.from({length:21},(_,i)=>({
  title:'Fictional source section '+i,domain:'Clinical context',disposition:'clinical',
  fields:i===0?[{key:'counseling_reason',label:'Presenting concern',type:'text',
   value:'PRIVATE_FICTIONAL_PATIENT_REPORT',reported:true,sourceOnly:false}]:[],
  answered:i===0?1:0
 }));
 // Exactly 21 array elements, but two claim the same original section. This
 // cannot establish 21/21 questionnaire coverage and must not unlock review.
 sections[1]={...sections[0],fields:[],answered:0};
 let writes=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options?:RequestInit)=>{
  if(options?.method==='POST')writes++;
  return Response.json({patientId:id,source:{
   accountId:id,status:'submitted',version:4,
   updatedAt:'2026-11-13T12:00:00Z',submittedAt:'2026-11-13T12:00:00Z'
  },sections,unmappedKeys:[],reviews:[]});
 }));
 render(<PatientBpsIntakeReview patientId={id}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('Linked 21-section intake mapping is malformed');
 expect(document.body.textContent).not.toContain('PRIVATE_FICTIONAL_PATIENT_REPORT');
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(writes).toBe(0);
});
