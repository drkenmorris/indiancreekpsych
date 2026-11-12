import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {reportedRiskFields} from '@/lib/patient/risk-screening';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});
export async function GET(request:Request){
 const ctx=await emrAccess();if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const id=new URL(request.url).searchParams.get('patient');if(!uuid(id))return reply({error:'Valid central patient ID required.'},400);
 const {data:patient,error:patientError}=await ctx.supabase.from('clinical_patients').select('id,account_id').eq('id',id).maybeSingle();
 if(patientError)return reply({error:'Patient authorization could not be verified.'},503);
 if(!patient)return reply({error:'Patient unavailable.'},404);
 if(!patient.account_id)return reply({patientId:id,source:null,reason:'No website patient account is linked to this chart. Link the correct account before transferring an intake.'});
 const {data:intake,error}=await ctx.supabase.from('patient_intakes').select('answers,status,version,updated_at,submitted_at').eq('patient_id',patient.account_id).eq('status','submitted').maybeSingle();
 if(error)return reply({error:'Submitted risk-screening source could not be loaded.'},503);
 if(!intake)return reply({patientId:id,source:null,reason:'No submitted patient intake is available for this linked account. Draft or missing answers are not negative findings.'});
 // Fail closed if a response ever violates the explicit source-state filter.
 if(intake.status!=='submitted')return reply({error:'The intake is not a submitted patient report.'},409);
 return reply({patientId:id,source:{status:intake.status,version:intake.version,updatedAt:intake.updated_at,submittedAt:intake.submitted_at},fields:reportedRiskFields(intake.answers??{})});
}
