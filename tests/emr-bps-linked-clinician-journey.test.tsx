import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import PatientBpsIntakeReview from '@/app/emr/PatientBpsIntakeReview';
import {GET,POST} from '@/app/api/emr/bps-intake/route';
import {intakeSections} from '@/lib/patient/intake';
import {bpsSnapshotClinicalKeys} from '@/lib/emr/intake-bps';

// An in-memory, fictional source-to-review-to-history integration test.
// This runs the real HTTP route handlers and real clinician React review form.
// It does NOT establish authenticated production browser/database acceptance.
const access=vi.hoisted(()=>({emrAccess:vi.fn(),sameOrigin:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({
 emrAccess:access.emrAccess,sameOrigin:access.sameOrigin,
 privateHeaders:{'Cache-Control':'private, no-store'}
}));
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals();});

test.each([['lowercase receipt',false,false],['uppercase receipt',true,false],['uppercase central-chart UUID',false,true]] as const)('fictional 21-section linked intake traverses the protected BPS API, clinician save and independently verified history without mixing patient charts (%s)',async(_case,receiptUppercase,chartUppercase)=>{
 const patient='00000000-0000-4000-8000-0000000009a1';
 const otherPatient='00000000-0000-4000-8000-000000000902';
 // Uppercase UUIDs in chart URLs identify the SAME PostgreSQL UUID, not a new patient.
 const selectedPatientId=chartUppercase?patient.toUpperCase():patient;
 const account='00000000-0000-4000-8000-000000000903';
 const otherAccount='00000000-0000-4000-8000-000000000904';
 const reviewId='00000000-0000-4000-8000-0000000009a5';
 const stamp='2026-11-12T12:00:00Z';
 const sourceAnswers:Record<string,string>={legal_packet_version:'2026-11-02-directory-1'};
 for(const section of intakeSections)for(const [key] of section.fields){
  if(key!=='legal_packet_version')sourceAnswers[key]='FICTIONAL_'+key;
 }
 sourceAnswers.counseling_reason='FICTIONAL_PATIENT_PRESENTING_CONCERN';
 sourceAnswers.medication_entries='PRIVATE_FICTIONAL_MEDICATION';
 sourceAnswers.medication_allergy_notes='PRIVATE_FICTIONAL_ALLERGY';
 sourceAnswers.trauma_history='PRIVATE_FICTIONAL_TRAUMA_NARRATIVE';
 sourceAnswers.trauma_history_checklist='PRIVATE_FICTIONAL_TRAUMA';
 sourceAnswers.insurance_member='PRIVATE_FICTIONAL_INSURANCE';
 sourceAnswers.roi_authorize='PRIVATE_FICTIONAL_LEGAL_AUTHORIZATION';
 const otherSourceAnswers={...sourceAnswers,counseling_reason:'FICTIONAL_SECOND_CHART_CONCERN'};
 let secondIntakeAvailable=false;
 const reviews:Record<string,unknown>[]=[];
 const queries:{table:string;filters:[string,unknown][]}[]=[];
 let writes=0;
 const supabase={
  from:(table:string)=>{
   const record:{table:string;filters:[string,unknown][]}={table,filters:[]};
   queries.push(record);
   const query:any={
    select:()=>query,
    eq:(column:string,value:unknown)=>{record.filters.push([column,value]);return query;},
    is:(column:string,value:unknown)=>{record.filters.push([column,value]);return query;},
    order:()=>query,
    maybeSingle:async()=>{
     if(table==='emr_bps_intake_reviews'){
      const selected=reviews.find(row=>record.filters.every(([key,value])=>
       key==='id'?String(row.id).toLowerCase()===String(value).toLowerCase():row[key]===value));
      return {data:selected??null,error:null};
     }
     if(table==='clinical_patients'){
      const id=record.filters.find(([key])=>key==='id')?.[1];
      const row=id===patient?{id:patient,account_id:account,directory_deleted_at:null}:id===otherPatient?
       {id:otherPatient,account_id:otherAccount,directory_deleted_at:null}:null;
      return {data:row,error:null};
     }
     if(table==='patient_intakes'){
      const id=record.filters.find(([key])=>key==='patient_id')?.[1];
      return {data:id===account?{
       patient_id:account,answers:sourceAnswers,status:'submitted',version:7,updated_at:stamp,submitted_at:stamp
      }:id===otherAccount&&secondIntakeAvailable?{
       patient_id:otherAccount,answers:otherSourceAnswers,status:'submitted',version:8,updated_at:stamp,submitted_at:stamp
      }:null,error:null};
     }
     throw Error('Unexpected single-row table '+table);
    },
    range:async(from:number,to:number)=>{
     if(table!=='emr_bps_intake_reviews')throw Error('Unexpected review query');
     const selected=reviews.filter(row=>record.filters.every(([key,value])=>row[key]===value));
     return {data:selected.slice(from,to+1),count:selected.length,error:null};
    }
   };
   return query;
  },
  rpc:async(name:string,request:{p_payload:Record<string,any>})=>{
   expect(name).toBe('save_emr_bps_intake_review');
   const saved=request.p_payload;
   if(saved.patient_id!==patient||saved.source_account_id!==account||
      saved.source_version!==7||saved.source_status!=='submitted'||
      saved.source_updated_at!==stamp||saved.source_submitted_at!==stamp||saved.reviewed!==true)
    return {data:null,error:{code:'22023'}};
   writes++;
   reviews.push({
    id:reviewId,patient_id:patient,source_account_id:account,
    source_version:7,source_status:'submitted',source_updated_at:stamp,
    // Mirror the new DB-owned submission receipt, not an invented review timestamp.
    source_submitted_at:stamp,created_at:stamp,reviewed:true,
    // Simulate DB-owned complete immutable clinical snapshot. The protected
    // GET API redacts trauma/other restricted content only on readback, AFTER
    // checking that the saved original contains the complete approved source.
    clinical_answers:Object.fromEntries(Object.entries(sourceAnswers).filter(
     ([key,value])=>bpsSnapshotClinicalKeys.has(key)&&value.replace(/^ +| +$/g,'')!=='')),
    clinician_notes:saved.clinician_notes
   });
   return {data:receiptUppercase?reviewId.toUpperCase():reviewId,error:null};
  }
 };
 access.emrAccess.mockResolvedValue({supabase});
 access.sameOrigin.mockReturnValue(true);
 vi.stubGlobal('fetch',vi.fn(async(url:string,options?:RequestInit)=>{
  const absolute=new URL(String(url),'https://www.indiancreekpsych.com');
  if(options?.method==='POST')return POST(new Request(absolute.toString(),{
   method:'POST',headers:{Origin:'https://www.indiancreekpsych.com','Content-Type':'application/json'},
   body:options.body
  }));
  return GET(new Request(absolute.toString()));
 }));
 render(<PatientBpsIntakeReview patientId={selectedPatientId}/>);
 await screen.findByText(/Version 7/);
 const receipt=screen.getByText(/Patient submission attested:/);
 expect(receipt.querySelector('time')?.getAttribute('datetime')).toBe(stamp);
 expect(receipt.textContent).toContain('not a clinician signature');
 expect(screen.getByText(/Sections audited: 21\/21/)).toBeTruthy();
 const before=document.body.textContent||'';
 expect(before).toContain('FICTIONAL_PATIENT_PRESENTING_CONCERN');
 for(const protectedValue of [
  'PRIVATE_FICTIONAL_MEDICATION','PRIVATE_FICTIONAL_ALLERGY',
  'PRIVATE_FICTIONAL_TRAUMA','PRIVATE_FICTIONAL_INSURANCE',
  'PRIVATE_FICTIONAL_LEGAL_AUTHORIZATION'
 ])expect(before).not.toContain(protectedValue);

 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 const saveButton=()=>screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}) as HTMLButtonElement;
 expect(saveButton().disabled).toBe(true);
 expect(screen.getByText(/A checkbox alone does not document a clinical review/)).toBeTruthy();
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 expect(saveButton().disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Presenting concerns and functional impact'),{
  target:{value:'  '}
 });
 expect(saveButton().disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Presenting concerns and functional impact'),{
  target:{value:'Independent fictional clinician observation'}
 });
 expect(saveButton().disabled).toBe(true); // editing clinician notes clears prior acknowledgment
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 expect(saveButton().disabled).toBe(false);
 fireEvent.click(saveButton());
 await screen.findByText(/snapshot saved AND independently verified in the protected chart history/);
 expect(writes).toBe(1);
 expect(reviews).toHaveLength(1);
 expect((reviews[0].clinician_notes as Record<string,string>).presenting).toBe(
  'Independent fictional clinician observation'
 );
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 const history=await GET(new Request('https://www.indiancreekpsych.com/api/emr/bps-intake?patient='+patient));
 expect(history.status).toBe(200);
 const historyData=await history.json();
 expect(historyData.reviews[0].id).toBe(reviewId);
 expect(historyData.reviews[0].reviewed).toBe(true);
 expect(historyData.reviews[0].clinician_note_domains_complete).toBe(true);
 expect(historyData.reviews[0].clinical_answers.counseling_reason).toBe(
  'FICTIONAL_PATIENT_PRESENTING_CONCERN'
 );
 expect(historyData.reviews[0].current_source_snapshot_verified).toBe(true);
 expect(reviews[0].source_submitted_at).toBe(stamp);
 const summaryUrl='https://www.indiancreekpsych.com/api/emr/bps-intake?patient='+patient+'&summary=1';
 const verifiedSummary=await GET(new Request(summaryUrl));
 expect(verifiedSummary.status).toBe(200);
 expect((await verifiedSummary.json()).currentVersionReviewed).toBe(true);
 // Missing legacy or altered persisted receipts must not certify current review.
 // The historical note remains readable, and no additional write is attempted.
 for(const invalidReceipt of [null,'2026-11-12T11:59:59Z']){
  reviews[0].source_submitted_at=invalidReceipt;
  const historical=await GET(new Request('https://www.indiancreekpsych.com/api/emr/bps-intake?patient='+patient));
  expect(historical.status).toBe(200);
  expect((await historical.json()).reviews[0].current_source_snapshot_verified).toBe(false);
  const summary=await GET(new Request(summaryUrl));
  expect(summary.status).toBe(200);
  expect((await summary.json()).currentVersionReviewed).toBe(false);
  expect(writes).toBe(1);
 }
 reviews[0].source_submitted_at=stamp;
 expect((reviews[0].clinical_answers as Record<string,string>).trauma_history).toBeUndefined();
 expect(historyData.reviews[0].clinical_answers.trauma_history).toBeUndefined();
 expect(JSON.stringify(historyData)).not.toContain('PRIVATE_FICTIONAL_TRAUMA_NARRATIVE');
 expect(historyData.reviews[0].clinical_answers.medication_entries).toBeUndefined();
 expect(historyData.reviews[0].clinical_answers.roi_authorize).toBeUndefined();
 expect(queries.some(q=>q.table==='emr_bps_intake_reviews'&&
  q.filters.some(([key,value])=>key==='patient_id'&&value===patient)&&
  q.filters.some(([key,value])=>key==='source_account_id'&&value===account))).toBe(true);
 // A legacy reviewed=true row without independent clinical notes is not a
 // documented BPS review. Preserve its history/version lock, do not rewrite it.
 reviews[0].clinician_notes={};
 cleanup();
 render(<PatientBpsIntakeReview patientId={selectedPatientId}/>);
 await screen.findByText(/Documented clinician reviews: 0/);
 expect(screen.getByText(/Some saved history records lack confirmed clinician-review attestation or independent clinical documentation/)).toBeTruthy();
 expect(screen.getByText(/This historical row lacks confirmed clinician-review attestation or independently documented clinical observations/)).toBeTruthy();
 expect(screen.getByText(/version remains locked; investigate chart provenance/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(writes).toBe(1);
 // A legacy row can contain one valid independent observation but omit the
 // other six original BPS clinician-note domains. It remains visible and
 // version-locked, but it must NOT count as a completed seven-page review.
 // This matches the protected BPS summary endpoint's cardinality rule.
 reviews[0].clinician_notes={presenting:'FICTIONAL_APPROVED_OBSERVATION'};
 cleanup();
 render(<PatientBpsIntakeReview patientId={selectedPatientId}/>);
 await screen.findByText(/Documented clinician reviews: 0/);
 expect(screen.getByText(/Some saved history records lack confirmed clinician-review attestation or independent clinical documentation/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(writes).toBe(1);
 // Even when one legible clinical note remains, hidden malformed or
 // unapproved note keys make the historical record non-attestable.
 reviews[0].clinician_notes={presenting:'FICTIONAL_APPROVED_OBSERVATION',
  unapproved:'FICTIONAL_REDACTED_CLINICAL_TEXT'};
 cleanup();
 render(<PatientBpsIntakeReview patientId={selectedPatientId}/>);
 await screen.findByText(/Documented clinician reviews: 0/);
 expect(screen.getByText(/Some saved history records lack confirmed clinician-review attestation or independent clinical documentation/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
 expect(document.body.textContent).not.toContain('FICTIONAL_REDACTED_CLINICAL_TEXT');
 expect(writes).toBe(1);
 cleanup();
 render(<PatientBpsIntakeReview patientId={otherPatient}/>);
 await screen.findByRole('alert');
 // A 404 never reflects raw protected API/database detail in a different chart.
  expect(screen.getByRole('alert').textContent).toContain('Linked central chart or intake was not found. Verify the patient link.');
  expect(screen.getByRole('alert').textContent).not.toContain('No linked patient intake found');
 expect(document.body.textContent).not.toContain('FICTIONAL_PATIENT_PRESENTING_CONCERN');
 expect(writes).toBe(1);
 // A missing second intake is not enough to establish cross-patient isolation.
 // Reopen a second chart with its own submitted intake and verify the actual
 // protected route and clinician UI return only its source and empty history.
 secondIntakeAvailable=true;
 cleanup();
 render(<PatientBpsIntakeReview patientId={otherPatient}/>);
 await screen.findByText(/Version 8/);
 const secondText=document.body.textContent||'';
 expect(secondText).toContain('FICTIONAL_SECOND_CHART_CONCERN');
 expect(secondText).not.toContain('FICTIONAL_PATIENT_PRESENTING_CONCERN');
 expect(secondText).not.toContain('FICTIONAL_APPROVED_OBSERVATION');
 expect(secondText).not.toContain('FICTIONAL_REDACTED_CLINICAL_TEXT');
 expect(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeTruthy();
 const secondHistory=await GET(new Request('https://www.indiancreekpsych.com/api/emr/bps-intake?patient='+otherPatient));
 expect(secondHistory.status).toBe(200);
 const secondData=await secondHistory.json();
 expect(secondData.patientId).toBe(otherPatient);
 expect(secondData.source.accountId).toBe(otherAccount);
 expect(secondData.source.version).toBe(8);
 expect(secondData.reviews).toEqual([]);
 expect(JSON.stringify(secondData)).not.toContain('FICTIONAL_PATIENT_PRESENTING_CONCERN');
 const secondSummary=await GET(new Request('https://www.indiancreekpsych.com/api/emr/bps-intake?patient='+otherPatient+'&summary=1'));
 expect(secondSummary.status).toBe(200);
 expect((await secondSummary.json()).currentVersionReviewed).toBe(false);
 expect(writes).toBe(1);
});
