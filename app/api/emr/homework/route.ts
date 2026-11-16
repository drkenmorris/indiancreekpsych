import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {stableHomeworkJson,validHomeworkInput} from '@/lib/emr/homework';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});
const columns='id,patient_id,plan_version_id,problem_id,objective_id,intervention_id,narrative,snapshot,created_at';
export async function GET(request:Request){
 const ctx=await emrAccess();if(!ctx)return reply({error:'Clinic sign-in and MFA required.'},403);
 const query=new URL(request.url).searchParams,patient=query.get('patient'),offset=Number(query.get('offset')??0);
 if(!uuid(patient)||!Number.isSafeInteger(offset)||offset<0||offset>100000)return reply({error:'Choose a patient and valid history page.'},400);
 const {data:person,error}=await ctx.supabase.from('clinical_patients').select('id,demographics').eq('id',patient).is('directory_deleted_at',null).maybeSingle();
 if(error||!person||person.demographics?.active===false)return reply({error:'Patient unavailable.'},404);
 const history=await ctx.supabase.from('emr_homework_assignments').select(columns).eq('patient_id',patient).eq('owner_id',ctx.user.id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+49);
 if(history.error)return reply({error:'Homework history could not be loaded.'},503);
 return reply({patientId:patient,assignments:history.data??[],offset,hasMore:history.data?.length===50});
}
export async function POST(request:Request){
 const ctx=await emrAccess();if(!ctx||!sameOrigin(request))return reply({error:'Clinic sign-in, MFA and same-origin request required.'},403);
 try{
  const raw=await request.text();if(Buffer.byteLength(raw)>160000)return reply({error:'Homework assignment is too large.'},400);
  const body=JSON.parse(raw);if(!validHomeworkInput(body))return reply({error:'Choose a problem, objective, and intervention, and enter the homework assignment.'},400);
  const patch={id:body.id,patient_id:body.patientId,plan_version_id:body.planVersionId,problem_id:body.problemId,objective_id:body.objectiveId,intervention_id:body.interventionId,narrative:body.narrative};
  const saved=await ctx.supabase.from('emr_homework_assignments').insert(patch).select(columns).single();
  if(saved.error?.code==='23505'){
   const prior=await ctx.supabase.from('emr_homework_assignments').select(columns).eq('id',body.id).eq('patient_id',body.patientId).eq('owner_id',ctx.user.id).maybeSingle();
   const existing=prior.data as Record<string,unknown>|null;
   if(existing&&Object.entries(patch).every(([key,value])=>stableHomeworkJson(existing[key])===stableHomeworkJson(value)))return reply({saved:true,assignment:prior.data});
   return reply({error:'This homework assignment was already saved with different content. Reload before creating another assignment.'},409);
  }
  if(saved.error||!saved.data)return reply({error:saved.error?.code==='42501'?'This patient or saved plan is unavailable to your account.':saved.error?.message||'Homework assignment could not be saved.'},saved.error?.code==='42501'?403:400);
  return reply({saved:true,assignment:saved.data});
 }catch{return reply({error:'Invalid homework assignment request.'},400);}
}
