import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import PatientBpsIntakeReview from '@/app/emr/PatientBpsIntakeReview';
import {GET,POST} from '@/app/api/emr/bps-intake/route';
import {intakeSections} from '@/lib/patient/intake';
import {sanitizeBpsSnapshotAnswers} from '@/lib/emr/intake-bps';

// An in-memory, fictional source-to-review-to-history integration test.
// This runs the real HTTP route handlers and real clinician React review form.
// It does NOT establish authenticated production browser/database acceptance.
const access=vi.hoisted(()=>({emrAccess:vi.fn(),sameOrigin:vi.fn()}));
vi.mock('@/lib/emr/access',()=>({
 emrAccess:access.emrAccess,sameOrigin:access.sameOrigin,
 privateHeaders:{'Cache-Control':'private, no-store'}
}));
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals();});

test('fictional 21-section linked intake traverses the protected BPS API, clinician save and independently verified history without mixing patient charts',async()=>{
 const patient='00000000-0000-4000-8000-000000000901';
 const otherPatient='00000000-0000-4000-8000-000000000902';
 const account='00000000-0000-4000-8000-000000000903';
 const otherAccount='00000000-0000-4000-8000-000000000904';
 const reviewId='00000000-0000-4000-8000-000000000905';
 const stamp='2026-11-12T12:00:00Z';
 const sourceAnswers:Record<string,string>={};
 for(const section of intakeSections)for(const [key] of section.fields){
  if(key!=='legal_packet_version')sourceAnswers[key]='FICTIONAL_'+key;
 }
 sourceAnswers.counseling_reason='FICTIONAL_PATIENT_PRESENTING_CONCERN';
 sourceAnswers.medication_entries='PRIVATE_FICTIONAL_MEDICATION';
 sourceAnswers.medication_allergy_notes='PRIVATE_FICTIONAL_ALLERGY';
 sourceAnswers.trauma_history_checklist='PRIVATE_FICTIONAL_TRAUMA';
 sourceAnswers.insurance_member='PRIVATE_FICTIONAL_INSURANCE';
 sourceAnswers.roi_authorize='PRIVATE_FICTIONAL_LEGAL_AUTHORIZATION';
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
      saved.source_updated_at!==stamp||saved.reviewed!==true)
    return {data:null,error:{code:'22023'}};
   writes++;
   reviews.push({
    id:reviewId,patient_id:patient,source_account_id:account,
    source_version:7,source_status:'submitted',source_updated_at:stamp,
    created_at:stamp,reviewed:true,
    clinical_answers:sanitizeBpsSnapshotAnswers(sourceAnswers).answers,
    clinician_notes:saved.clinician_notes
   });
   return {data:reviewId,error:null};
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
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Version 7/);
 expect(screen.getByText(/Sections audited: 21\/21/)).toBeTruthy();
 const before=document.body.textContent||'';
 expect(before).toContain('FICTIONAL_PATIENT_PRESENTING_CONCERN');
 for(const protectedValue of [
  'PRIVATE_FICTIONAL_MEDICATION','PRIVATE_FICTIONAL_ALLERGY',
  'PRIVATE_FICTIONAL_TRAUMA','PRIVATE_FICTIONAL_INSURANCE',
  'PRIVATE_FICTIONAL_LEGAL_AUTHORIZATION'
 ])expect(before).not.toContain(protectedValue);

 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.change(screen.getByLabelText('Presenting concerns and functional impact'),{
  target:{value:'Independent fictional clinician observation'}
 });
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
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
 expect(historyData.reviews[0].clinical_answers.counseling_reason).toBe(
  'FICTIONAL_PATIENT_PRESENTING_CONCERN'
 );
 expect(historyData.reviews[0].clinical_answers.medication_entries).toBeUndefined();
 expect(historyData.reviews[0].clinical_answers.roi_authorize).toBeUndefined();
 expect(queries.some(q=>q.table==='emr_bps_intake_reviews'&&
  q.filters.some(([key,value])=>key==='patient_id'&&value===patient)&&
  q.filters.some(([key,value])=>key==='source_account_id'&&value===account))).toBe(true);
 cleanup();
 render(<PatientBpsIntakeReview patientId={otherPatient}/>);
 await screen.findByRole('alert');
 expect(screen.getByRole('alert').textContent).toContain('No linked patient intake found');
 expect(document.body.textContent).not.toContain('FICTIONAL_PATIENT_PRESENTING_CONCERN');
 expect(writes).toBe(1);
});
