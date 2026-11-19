import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {treatmentPlanIdentity,type PlanApproval} from '@/lib/emr/treatment-plan-report';
export const dynamic='force-dynamic';
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:privateHeaders});
export async function GET(request:Request){const ctx=await emrAccess();if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);const patient=new URL(request.url).searchParams.get('patient');if(!uuid(patient))return reply({error:'Choose a central patient.'},400);
 const [{data:person,error:pError},{data:plans,error:rError}]=await Promise.all([ctx.supabase.from('clinical_patients').select('id,demographics,profiles!clinical_patients_account_id_fkey(full_name)').eq('id',patient).is('directory_deleted_at',null).single(),ctx.supabase.from('emr_treatment_plans').select('id,revision,updated_at').eq('patient_id',patient).eq('owner_id',ctx.user.id).order('updated_at',{ascending:false}).limit(100)]);
 if(pError||!person||person.id!==patient)return reply({error:'Patient unavailable.'},404);if(rError)return reply({error:'Plan directory unavailable.'},503);
 const ids=(plans??[]).map(p=>p.id);let versions:unknown[]=[];if(ids.length){const result=await ctx.supabase.from('emr_treatment_plan_versions').select('id,plan_id,revision,snapshot,created_at').in('plan_id',ids).order('created_at',{ascending:false}).limit(200);if(result.error)return reply({error:'Saved plan history unavailable.'},503);versions=result.data??[];}
 try{
  const workspace=await ctx.supabase.from('emr_workspaces').select('patient_id,state').eq('patient_id',patient).eq('owner_id',ctx.user.id).maybeSingle();
  if(workspace.error||(workspace.data&&workspace.data.patient_id!==patient))throw Error('Chart identity unavailable.');
  const records=workspace.data?.state?.records??[];if(!Array.isArray(records)||records.some(row=>row.patient_id!==patient))throw Error('Chart identity mismatch.');
  const profile=Array.isArray(person.profiles)?person.profiles[0]:person.profiles;
  const identity=treatmentPlanIdentity(person.demographics??{},records,patient,profile?.full_name??'');
  const versionIds=new Set((versions as {id:string}[]).map(v=>v.id)),seen=new Set<string>(),approvals:PlanApproval[]=[];
  if(versionIds.size)for(let offset=0;;offset+=200){
   const history:{data:{patient_id:string;revision:number;recorded_at:string;reference:string;participants:unknown}[]|null;error:unknown}=await ctx.supabase.from('emr_treatment_response_versions').select('patient_id,revision,recorded_at,reference:response->>planReference,participants:response->participants').eq('patient_id',patient).order('revision',{ascending:false}).range(offset,offset+199);
   if(history.error)throw Error('Patient approval history unavailable.');
   const rows=history.data??[];
   for(const row of rows){
    if(row.patient_id!==patient)throw Error('Approval identity mismatch.');
    const id=typeof row.reference==='string'&&row.reference.startsWith('plan-version:')?row.reference.slice(13):'';
    if(!versionIds.has(id)||seen.has(id))continue;
    if(!Array.isArray(row.participants))throw Error('Approval history unavailable.');
    seen.add(id);approvals.push({versionId:id,revision:row.revision,recordedAt:row.recorded_at,participants:row.participants.map(p=>{if(!p||typeof p.role!=='string'||typeof p.name!=='string'||!['yes','no','unanswered'].includes(p.approval))throw Error('Approval history unavailable.');return {role:p.role,name:p.name,approval:p.approval};})});
   }
   if(rows.length<200)break;
  }
  return reply({patient:identity,plans:plans??[],versions,approvals});
 }catch{return reply({error:'Chart demographics or patient approval history could not be verified. Reload before printing.'},503);}
}
export async function POST(request:Request){const ctx=await emrAccess();if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);try{const text=await request.text();if(Buffer.byteLength(text)>1000000)throw Error('Plan is too large.');const b=JSON.parse(text);if(!uuid(b.patientId)||(b.id!==null&&!uuid(b.id))||!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<0||!Number.isSafeInteger(b.libraryRevision)||b.libraryRevision<1)throw Error('Invalid patient, plan, or revision.');
 const {data,error}=await ctx.supabase.rpc('save_emr_treatment_plan',{p_id:b.id,p_patient:b.patientId,p_expected:b.expectedRevision,p_library_revision:b.libraryRevision,p_input:b.input});
 if(error)return reply({error:error.code==='40001'?'The plan or library changed in another session. Your draft is retained; reload and review before saving again.':error.code==='42501'?'This plan is unavailable to your account.':error.message||'Plan save was not confirmed.'},error.code==='40001'?409:400);return reply({saved:true,...data});
 }catch(e){return reply({error:e instanceof Error?e.message:'Invalid plan request.'},400);}}
