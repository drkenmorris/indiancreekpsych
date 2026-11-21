import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import PatientBpsIntakeReview from '@/app/emr/PatientBpsIntakeReview';
import {bpsSectionClassification,mapIntakeToBps} from '@/lib/emr/intake-bps';
import {intakeSectionsForVersion} from '@/lib/patient/intake';
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
  return {ok:true,json:async()=>({patientId:id,source:{accountId:id,status:'submitted',version:id===a?2:9,updatedAt:'2026-11-10T12:00:00Z',submittedAt:'2026-11-10T12:00:00Z'},sections:mapIntakeToBps({}).sections,unmappedKeys:[],reviews:[]})};
 }));
 const {rerender}=render(<PatientBpsIntakeReview patientId={a}/>);
 await screen.findByText(/Version 2/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.change(screen.getByLabelText('Presenting concerns and functional impact'),{
  target:{value:'Independent fictional clinician review context'}
 });
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 rerender(<PatientBpsIntakeReview patientId={b}/>);
 await screen.findByText(/Version 9/);
 await act(async()=>{done({ok:true,json:async()=>({saved:true})});await pending;});
 expect(screen.getByText(/Version 9/)).toBeTruthy();
 expect(screen.queryByText(/snapshot saved in the protected chart/i)).toBeNull();
 expect(reads).toEqual([a,b]);
});

test('clinician reconciliation retains visible clinical history while withholding separate medication, legal, insurance and structured source values',async()=>{
 const id='00000000-0000-4000-8000-000000000801';
 const reported:Record<string,string>={
  counseling_reason:'SAFE PATIENT REPORTED CONCERN',
  insurance_member:'DO_NOT_LEAK_SPOOFED_INSURANCE',
  roi_authorize:'DO_NOT_LEAK_SPOOFED_LEGAL',
  prior_psychiatric_medications:'DO_NOT_LEAK_RETIRED_MEDICATION',
  legal_history:'DO_NOT_LEAK_RETIRED_LEGAL',
  medication_entries:'DO_NOT_LEAK_STRUCTURED'
 };
 const sections=mapIntakeToBps(reported).sections;
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({patientId:id,source:{accountId:id,status:'submitted',version:2,updatedAt:'2026-11-11T12:00:00Z',submittedAt:'2026-11-11T12:00:00Z'},sections,unmappedKeys:[],reviews:[]})));
 render(<PatientBpsIntakeReview patientId={id}/>);
 await screen.findByText(/Version 2/);
 expect(screen.getByText('SAFE PATIENT REPORTED CONCERN')).toBeTruthy();
 for(const secret of ['DO_NOT_LEAK_STRUCTURED','DO_NOT_LEAK_SPOOFED_INSURANCE','DO_NOT_LEAK_SPOOFED_LEGAL','DO_NOT_LEAK_RETIRED_MEDICATION','DO_NOT_LEAK_RETIRED_LEGAL'])
  expect(document.body.textContent).not.toContain(secret);
});

test('clinician reconciliation fails closed instead of partially displaying a contradictory source answer receipt',async()=>{
 const id='00000000-0000-4000-8000-000000000801';
 const sections=mapIntakeToBps({
  counseling_reason:'SAFE_BUT_MUST_WITHHOLD_WITH_MALFORMED_PACKET',
  counseling_goals:'PRIVATE_FALSE_REPORTED_FLAG',
  prior_mental_health_treatment:'PRIVATE_MISSING_BPS_VISIBILITY_FLAG',
  insurance_member:'PRIVATE_INSURANCE_SOURCE'
 }).sections;
 // Previously this fixture asserted partial rendering after falsifying the
 // patient-reported flag and dropping a source visibility receipt. Both are
 // now provenance contradictions: the entire 21-section packet must be withheld.
 let altered=0;
 for(const section of sections)for(const field of section.fields){
  if(field.key==='counseling_goals'){field.reported=false;section.answered--;altered++;}
  if(field.key==='prior_mental_health_treatment'){field.sourceOnly=undefined as unknown as boolean;altered++;}
 }
 expect(altered).toBe(2);
 let posts=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options?:RequestInit)=>{
  if(options?.method==='POST')posts++;
  return Response.json({patientId:id,source:{accountId:id,status:'submitted',version:2,updatedAt:'2026-11-11T12:00:00Z',submittedAt:'2026-11-11T12:00:00Z'},sections,unmappedKeys:[],reviews:[]});
 }));
 render(<PatientBpsIntakeReview patientId={id}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('21-section intake mapping is malformed');
 for(const secret of ['SAFE_BUT_MUST_WITHHOLD_WITH_MALFORMED_PACKET','PRIVATE_FALSE_REPORTED_FLAG','PRIVATE_MISSING_BPS_VISIBILITY_FLAG','PRIVATE_INSURANCE_SOURCE'])
  expect(document.body.textContent).not.toContain(secret);
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(posts).toBe(0);
});

test.each([
 ['missing linked account', {accountId:null}],
 ['invalid linked account', {accountId:'not-a-uuid'}],
 ['unsupported source status', {status:'revoked'}],
 ['unrecognized questionnaire packet provenance', {questionnairePacketVersion:'2030-unknown'}],
  ['draft source with a contradictory patient submission receipt', {status:'draft'}],
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
 'known legal consent section spoofed as clinical',
 'known medication section spoofed as clinical',
 'known clinical section spoofed with another domain',
 'known legal consent section spoofed with clinical domain',
 'known safety section relabels a presenting-concern answer',
 'impossible answered field count',
 'patient response marked reported but empty',
 'patient response marked reported but whitespace-only',
 'duplicate source field identities',
 'cross-section duplicate source field identities',
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
 if(variant==='known legal consent section spoofed as clinical'){
  sections[1].title='Consent to Counseling and Informed Treatment';
  sections[1].disposition='clinical';
 }
 if(variant==='known medication section spoofed as clinical'){
  sections[1].title='Medications';
  sections[1].disposition='clinical';
 }
 // Preserve the correct disposition: a mismatched domain label alone must
 // withhold source statements and disable clinical saving.
 if(variant==='known clinical section spoofed with another domain'){
  sections[1].title='Presenting concerns and functional impact';
  sections[1].domain='Medication/allergy reconciliation (separate chart review)';
  sections[1].disposition='clinical';
 }
 if(variant==='known legal consent section spoofed with clinical domain'){
  sections[1].title='Consent to Counseling and Informed Treatment';
  sections[1].domain='Presenting problems, functioning and goals';
  sections[1].disposition='reference';
 }
 if(variant==='known safety section relabels a presenting-concern answer'){
  sections[1].title='Safety and risk screening';
  sections[1].domain=bpsSectionClassification['Safety and risk screening'].domain;
  sections[1].disposition='clinical';
  // Even an exact approved section label cannot accept a clinical question
  // sourced from the presenting-concerns section.
 }
 if(variant==='impossible answered field count')sections[0].answered=99;
 if(variant==='patient response marked reported but empty')sections[1].fields[0].value='';
 if(variant==='patient response marked reported but whitespace-only')sections[1].fields[0].value='  ';
 if(variant==='duplicate source field identities')sections[1].fields.push({
  key:'counseling_reason',label:'Conflicting duplicate patient statement',
  type:'text',sourceOnly:false,reported:true,value:'PRIVATE_DUPLICATE_FICTIONAL_REPORT'
 });
 if(variant==='cross-section duplicate source field identities')sections[0].fields.push({
  key:'counseling_reason',label:'Forged second section for same source question',
  type:'text',sourceOnly:false,reported:true,value:'PRIVATE_CROSS_SECTION_FICTIONAL_REPORT'
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
 expect(document.body.textContent).not.toContain('PRIVATE_CROSS_SECTION_FICTIONAL_REPORT');
 expect(document.body.textContent).not.toContain('PRIVATE_NESTED_PHI');
 expect(document.body.textContent).not.toContain('PRIVATE_AUDIT_PHI');
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(posts).toBe(0);
});


test.each([
 ['medication recorded as unrestricted source','medication_entries',false],
 ['legal consent recorded as unrestricted source','roi_authorize',false],
 ['retired psychiatric medication recorded as unrestricted source','prior_psychiatric_medications',false],
 ['forged multi-line patient-source label','counseling_reason',true],
 ['bidirectional control in patient-source label','counseling_reason','bidi']
] as const)('clinician BPS refuses contradictory or forged source attribution: %s',async(_reason,key,labelAttack)=>{
 const patient='00000000-0000-4000-8000-000000000861';
 const account='00000000-0000-4000-8000-000000000862';
 const sections=mapIntakeToBps({
  counseling_reason:'SAFE_FICTIONAL_PRESENTING_CONCERN',
  medication_entries:'PRIVATE_FICTIONAL_MEDICATION',
  roi_authorize:'PRIVATE_FICTIONAL_LEGAL',
  prior_psychiatric_medications:'PRIVATE_FICTIONAL_LEGACY_MEDICATION'
 }).sections;
 const section=sections.find(section=>section.fields.some(field=>field.key===key));
 const field=section?.fields.find(field=>field.key===key);
 expect(field).toBeDefined();
 if(labelAttack===true)field!.label='Patient report\nClinician-approved diagnosis';
 else if(labelAttack==='bidi')field!.label='Source \u202E clinician statement';
 else {
  field!.sourceOnly=false;
  field!.value='PRIVATE_FICTIONAL_UNRESTRICTED_MEDICAL_OR_LEGAL_SOURCE';
 }
 let writes=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options?:RequestInit)=>{
  if(options?.method==='POST')writes++;
  return Response.json({patientId:patient,source:{
   accountId:account,status:'submitted',version:4,
   updatedAt:'2026-11-17T12:00:00Z',submittedAt:'2026-11-17T12:00:00Z'
  },sections,unmappedKeys:[],reviews:[]});
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('21-section intake mapping is malformed');
 const displayed=document.body.textContent||'';
 expect(displayed).not.toContain('SAFE_FICTIONAL_PRESENTING_CONCERN');
 expect(displayed).not.toContain('PRIVATE_FICTIONAL_UNRESTRICTED_MEDICAL_OR_LEGAL_SOURCE');
 expect(displayed).not.toContain('PRIVATE_FICTIONAL_MEDICATION');
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(writes).toBe(0);
});

test('idle linked-intake refresh is source-scoped, stops during clinician review, and fails closed on invalid refreshed provenance',async()=>{
 const patient='00000000-0000-4000-8000-000000000811';
 const account='00000000-0000-4000-8000-000000000812';
 let version=2, valid=true, calls=0;
 const response=()=>({
  patientId:patient,
  source:{accountId:account,status:valid?'submitted':'retracted',version,updatedAt:'2026-11-12T12:00:00Z',submittedAt:'2026-11-12T12:00:00Z'},
  sections:mapIntakeToBps({counseling_reason:'FICTIONAL_CONCERN_V'+version,
   medication_entries:'PRIVATE_MEDICATION_V'+version}).sections,unmappedKeys:[],reviews:[]
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
 ['historical review refers to a future source version',{source_version:4}],
 ['review status disagrees with current same-version attestation',{source_status:'draft'}],
 ['review timestamp disagrees with current same-version revision',{source_updated_at:'2026-11-12T11:59:59Z'}],
 ['missing clinician review attestation',{reviewed:undefined}],
 ['nonboolean clinician review attestation',{reviewed:'yes'}],
 ['unsupported historical source status',{source_status:'revoked'}],
 ['invalid historical source date',{source_updated_at:'2026-02-30T09:00:00Z'}],
 ['invalid review creation date',{created_at:'not-a-date'}],
 ['review created before source revision',{source_updated_at:'2026-11-12T12:00:00.000001Z',created_at:'2026-11-12T12:00:00Z'}],
 ['malformed historical clinical answers',{clinical_answers:['PHI_NOT_A_RECORD']}],
 ['missing historical clinician notes',{clinician_notes:null}],
 ['negative withheld clinical-field count',{excluded_clinical_fields:-1}],
 ['string withheld clinical-field count',{excluded_clinical_fields:'0'}],
 ['fractional withheld clinical-field count',{excluded_clinical_fields:0.5}],
 ['negative withheld clinician-note count',{excluded_clinician_notes:-1}],
 ['string withheld clinician-note count',{excluded_clinician_notes:'0'}],
 ['fractional withheld clinician-note count',{excluded_clinician_notes:0.5}],
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
   sections:mapIntakeToBps({counseling_reason:'PRIVATE_FICTIONAL_CURRENT_STATEMENT'}).sections,
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

test('clinician BPS withholds source and historical notes when a current review predates patient submission',async()=>{
 const patient='00000000-0000-4000-8000-000000000897';
 const updated='2026-11-10T09:00:00Z';
 const submission='2026-11-10T09:10:00.000001Z';
 let writes=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options?:RequestInit)=>{
  if(options?.method==='POST')writes++;
  return Response.json({
   patientId:patient,source:{accountId:patient,status:'submitted',version:2,updatedAt:updated,submittedAt:submission},
   sections:mapIntakeToBps({counseling_reason:'PRIVATE_FICTIONAL_CURRENT_SOURCE'}).sections,
   unmappedKeys:[],
   reviews:[{id:'00000000-0000-4000-8000-000000000898',source_version:2,
    source_status:'submitted',source_updated_at:updated,created_at:'2026-11-10T09:10:00Z',
    reviewed:true,clinical_answers:{counseling_reason:'PRIVATE_FICTIONAL_HISTORY'},
    clinician_notes:{presenting:'PRIVATE_FICTIONAL_CLINICIAN_NOTE'}}]
  });
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('invalid saved-row provenance');
 for(const secret of ['PRIVATE_FICTIONAL_CURRENT_SOURCE','PRIVATE_FICTIONAL_HISTORY','PRIVATE_FICTIONAL_CLINICIAN_NOTE'])
  expect(document.body.textContent).not.toContain(secret);
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(writes).toBe(0);
});


test('clinician BPS rejects an answered source field with explicit source visibility but no patient-reported provenance',async()=>{
 const patient='00000000-0000-4000-8000-000000000821';
 const privateReport='PRIVATE_UNATTESTED_FICTIONAL_STATEMENT';
 const sections=Array.from({length:21},(_,index)=>({
  title:'Fictional source section '+index,domain:'Clinical history',disposition:'clinical',
  fields:index===0?[{
   key:'counseling_reason',label:'Claimed patient answer',type:'text',
   sourceOnly:false,value:privateReport
  }]:[],answered:index===0?1:0
 }));
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({
  patientId:patient,
  source:{accountId:patient,status:'submitted',version:3,
   updatedAt:'2026-11-14T12:00:00Z',submittedAt:'2026-11-14T12:00:00Z'},
  sections,unmappedKeys:[],reviews:[]
 })));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toMatch(/mapping is malformed; patient statements are withheld/);
 expect(document.body.textContent).not.toContain(privateReport);
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
});


test('clinician save readback cannot verify a changed questionnaire packet at the same source revision',async()=>{
 const patient='00000000-0000-4000-8000-000000000961';
 const account='00000000-0000-4000-8000-000000000962';
 const reviewId='00000000-0000-4000-8000-000000000963';
 const stamp='2026-11-15T16:00:00Z';
 const legacySections=mapIntakeToBps({}).sections;
 const directorySections=mapIntakeToBps({legal_packet_version:'2026-11-02-directory-1'}).sections;
 let reads=0,posts=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options?:RequestInit)=>{
  if(options?.method==='POST'){
   posts++;
   return Response.json({saved:true,id:reviewId},{status:201});
  }
  reads++;
  return Response.json({
   patientId:patient,
   source:{accountId:account,status:'submitted',version:4,
    updatedAt:stamp,submittedAt:stamp,
    questionnairePacketVersion:reads===1?'2026-10-11':'2026-11-02-directory-1'},
   sections:reads===1?legacySections:directorySections,unmappedKeys:[],
   reviews:reads===1?[]:[{
    id:reviewId,reviewed:true,source_version:4,source_status:'submitted',
    source_updated_at:stamp,created_at:stamp,clinical_answers:{},clinician_notes:{}
   }]
  });
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Questionnaire packet provenance/);
 expect(screen.getByText('2026-10-11')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.change(screen.getByLabelText('Presenting concerns and functional impact'),{
  target:{value:'Independent fictional clinician review context'}
 });
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 const unverified=await screen.findByText(/linked intake source changed during chart-history verification/);
 expect(unverified.textContent).toContain('NOT independently verified');
 expect(screen.queryByText(/snapshot saved AND independently verified/)).toBeNull();
 expect(reads).toBe(2);
 expect(posts).toBe(1);
});

test('unknown source section cannot impersonate an approved clinical category or authorize a BPS review',async()=>{
 const patient='00000000-0000-4000-8000-000000000861';
 const account='00000000-0000-4000-8000-000000000862';
 const stamp='2026-11-12T12:00:00Z';
 const sections=intakeSectionsForVersion('2026-11-02-directory-1').map(section=>({
  title:section.title,
  domain:bpsSectionClassification[section.title].domain,
  disposition:bpsSectionClassification[section.title].disposition,
  answered:0,
  fields:[] as {key:string;label:string;type:string;reported:boolean;sourceOnly:boolean;value:string}[]
 }));
 const presenting=sections.find(section=>section.title==='Presenting concerns and functional impact');
 expect(presenting).toBeDefined();
 presenting!.title='Forged BPS source section';
 presenting!.answered=1;
 presenting!.fields=[{key:'counseling_reason',label:'Patient-reported concern',type:'text',
  reported:true,sourceOnly:false,value:'PRIVATE_FICTIONAL_CLINICAL_STATEMENT'}];
 let writes=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init?:RequestInit)=>{
  if(init?.method==='POST')writes++;
  return Response.json({patientId:patient,source:{
   accountId:account,status:'submitted',version:3,updatedAt:stamp,submittedAt:stamp,
   questionnairePacketVersion:'2026-11-02-directory-1'
  },sections,unmappedKeys:[],reviews:[]});
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('21-section intake mapping is malformed');
 expect(document.body.textContent).not.toContain('PRIVATE_FICTIONAL_CLINICAL_STATEMENT');
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(writes).toBe(0);
});


test.each([
 ['directory metadata on an old communications packet','2026-11-02-directory-1',false],
 ['old metadata on a legal-directory packet','2026-10-11',true],
] as const)('clinician review withholds the entire mismatched 21-section packet: %s',async(_caseName,version,useDirectory)=>{
 const id='00000000-0000-4000-8000-000000000801';
 const reported:Record<string,string>=useDirectory?{legal_packet_version:'2026-11-02-directory-1'}:{};
 const sections=mapIntakeToBps(reported).sections;
 expect(sections).toHaveLength(21);
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({
  patientId:id,source:{
   accountId:'00000000-0000-4000-8000-000000000802',status:'submitted',
   version:7,updatedAt:'2026-11-10T12:00:00Z',
   submittedAt:'2026-11-10T12:00:00Z',questionnairePacketVersion:version
  },sections,unmappedKeys:[],reviews:[]
 })));
 render(<PatientBpsIntakeReview patientId={id}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('layout does not match its questionnaire version');
 expect(screen.queryByText(/Sections audited:/)).toBeNull();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
});

test('matching legal-directory questionnaire and section layout remain available for explicit clinician review',async()=>{
 const id='00000000-0000-4000-8000-000000000801';
 const sections=mapIntakeToBps({legal_packet_version:'2026-11-02-directory-1'}).sections;
 expect(sections.some(section=>section.title==='Legal forms directory and questionnaire')).toBe(true);
 expect(sections.some(section=>section.title==='Communication and confidential-contact preferences')).toBe(false);
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({
  patientId:id,source:{
   accountId:'00000000-0000-4000-8000-000000000802',status:'submitted',
   version:7,updatedAt:'2026-11-10T12:00:00Z',
   submittedAt:'2026-11-10T12:00:00Z',
   questionnairePacketVersion:'2026-11-02-directory-1'
  },sections,unmappedKeys:[],reviews:[]
 })));
 render(<PatientBpsIntakeReview patientId={id}/>);
 await screen.findByText(/Sections audited:/);
 expect(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeTruthy();
});

test('clinician refuses a nominal 21/21 source packet that omits an unanswered original question',async()=>{
 const patient='00000000-0000-4000-8000-000000000951';
 const account='00000000-0000-4000-8000-000000000952';
 const version='2026-11-02-directory-1';
 const sections=mapIntakeToBps({legal_packet_version:version,
  counseling_reason:'FICTIONAL_REPORTED_CONCERN_MUST_BE_WITHHELD'}).sections;
 const section=sections.find(item=>item.fields.length>1&&
  item.fields.some(field=>field.reported===false))!;
 expect(section).toBeDefined();
 const missing=section.fields.findIndex(field=>field.reported===false);
 section.fields.splice(missing,1);
 let writes=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init?:RequestInit)=>{
  if(init?.method==='POST')writes++;
  return Response.json({patientId:patient,source:{
   accountId:account,status:'submitted',version:7,
   updatedAt:'2026-11-12T12:00:00Z',submittedAt:'2026-11-12T12:00:00Z',
   questionnairePacketVersion:version
  },sections,unmappedKeys:[],reviews:[]});
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('question inventory does not match');
 expect(document.body.textContent).not.toContain('FICTIONAL_REPORTED_CONCERN_MUST_BE_WITHHELD');
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(writes).toBe(0);
});
