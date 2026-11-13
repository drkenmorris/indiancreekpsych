import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {validBpsTimestamp} from '@/lib/emr/intake-bps';
import {reportedRiskFields} from '@/lib/patient/risk-screening';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});
export async function GET(request:Request){
 const ctx=await emrAccess();if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const id=new URL(request.url).searchParams.get('patient');if(!uuid(id))return reply({error:'Valid central patient ID required.'},400);
 const {data:patient,error:patientError}=await ctx.supabase.from('clinical_patients').select('id,account_id,directory_deleted_at').eq('id',id).is('directory_deleted_at',null).maybeSingle();
 if(patientError)return reply({error:'Patient authorization could not be verified.'},503);
 if(!patient)return reply({error:'Patient unavailable.'},404);
 // A scoped query is not sufficient proof of chart ownership if a database
 // adapter returns a stale or incorrectly scoped row.
 if(patient.id!==id)return reply({error:'Central patient does not match the requested chart.'},409);
 if(patient.directory_deleted_at!==null)return reply({error:'Archived central patient charts cannot be used for risk-screening reconciliation.'},409);
 if(patient.account_id&&!uuid(patient.account_id))return reply({error:'Invalid linked patient account.'},409);
 if(!patient.account_id)return reply({patientId:id,source:null,fields:reportedRiskFields({}),reason:'No website patient account is linked to this chart. Link the correct account before transferring an intake.'});
 const {data:intake,error}=await ctx.supabase.from('patient_intakes').select('patient_id,answers,status,version,updated_at,submitted_at').eq('patient_id',patient.account_id).maybeSingle();
 if(error)return reply({error:'Saved risk-screening source could not be loaded.'},503);
 if(!intake)return reply({patientId:id,source:null,fields:reportedRiskFields({}),reason:'No saved patient intake is available for this linked account.'});
 // Verify returned row identity, metadata and payload before releasing any
 // patient-reported safety statements through the protected EMR endpoint.
 if(intake.patient_id!==patient.account_id)return reply({error:'Risk-screening source does not match the linked account.'},409);
 if((intake.status!=='draft'&&intake.status!=='submitted')||
    !Number.isSafeInteger(intake.version)||intake.version<1||
    !validBpsTimestamp(intake.updated_at)||
    (intake.submitted_at!==null&&!validBpsTimestamp(intake.submitted_at))||
    !intake.answers||typeof intake.answers!=='object'||Array.isArray(intake.answers))
  return reply({error:'Risk-screening source provenance or answers are invalid.'},409);
 return reply({patientId:id,source:{status:intake.status,version:intake.version,updatedAt:intake.updated_at,submittedAt:intake.submitted_at},fields:reportedRiskFields(intake.answers??{})});
}
