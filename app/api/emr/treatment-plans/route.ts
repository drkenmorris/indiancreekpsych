import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
export const dynamic='force-dynamic';
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:privateHeaders});
export async function GET(request:Request){const ctx=await emrAccess();if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);const patient=new URL(request.url).searchParams.get('patient');if(!uuid(patient))return reply({error:'Choose a central patient.'},400);
 const [{data:person,error:pError},{data:plans,error:rError}]=await Promise.all([ctx.supabase.from('clinical_patients').select('id,demographics').eq('id',patient).single(),ctx.supabase.from('emr_treatment_plans').select('id,revision,updated_at').eq('patient_id',patient).eq('owner_id',ctx.user.id).order('updated_at',{ascending:false}).limit(100)]);
 if(pError||!person)return reply({error:'Patient unavailable.'},404);if(rError)return reply({error:'Plan directory unavailable.'},503);
 const ids=(plans??[]).map(p=>p.id);let versions:unknown[]=[];if(ids.length){const result=await ctx.supabase.from('emr_treatment_plan_versions').select('id,plan_id,revision,snapshot,created_at').in('plan_id',ids).order('created_at',{ascending:false}).limit(200);if(result.error)return reply({error:'Saved plan history unavailable.'},503);versions=result.data??[];}
 return reply({patient:{id:person.id,name:[person.demographics.first_name,person.demographics.last_name].filter(Boolean).join(' '),dob:person.demographics.dob??''},plans:plans??[],versions});
}
export async function POST(request:Request){const ctx=await emrAccess();if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);try{const text=await request.text();if(Buffer.byteLength(text)>1000000)throw Error('Plan is too large.');const b=JSON.parse(text);if(!uuid(b.patientId)||(b.id!==null&&!uuid(b.id))||!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<0||!Number.isSafeInteger(b.libraryRevision)||b.libraryRevision<1)throw Error('Invalid patient, plan, or revision.');
 const {data,error}=await ctx.supabase.rpc('save_emr_treatment_plan',{p_id:b.id,p_patient:b.patientId,p_expected:b.expectedRevision,p_library_revision:b.libraryRevision,p_input:b.input});
 if(error)return reply({error:error.code==='40001'?'The plan or library changed in another session. Your draft is retained; reload and review before saving again.':error.code==='42501'?'This plan is unavailable to your account.':error.message||'Plan save was not confirmed.'},error.code==='40001'?409:400);return reply({saved:true,...data});
 }catch(e){return reply({error:e instanceof Error?e.message:'Invalid plan request.'},400);}}
