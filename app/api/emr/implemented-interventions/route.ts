import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {validImplementedInput} from '@/lib/emr/implemented-interventions';
export const dynamic='force-dynamic';
const columns='id,plan_version_id,library_revision,session_date,selection_ids,snapshot,created_at';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:privateHeaders});
export async function GET(request:Request){
 const ctx=await emrAccess();if(!ctx)return reply({error:'Clinic sign-in and MFA required.'},403);
 const patientId=new URL(request.url).searchParams.get('patient');if(!uuid(patientId))return reply({error:'Select a patient.'},400);
 const [person,plans,library,history]=await Promise.all([
  ctx.supabase.from('clinical_patients').select('id,demographics').eq('id',patientId).is('directory_deleted_at',null).maybeSingle(),
  ctx.supabase.from('emr_treatment_plans').select('id').eq('patient_id',patientId).eq('owner_id',ctx.user.id).order('updated_at',{ascending:false}).limit(1),
  ctx.supabase.from('emr_treatment_library').select('revision').eq('id','clinic').single(),
  ctx.supabase.from('emr_implemented_intervention_entries').select(columns).eq('patient_id',patientId).eq('owner_id',ctx.user.id).order('session_date',{ascending:false}).order('created_at',{ascending:false}).limit(50),
 ]);
 if(person.error||!person.data||person.data.demographics?.active===false)return reply({error:'Patient unavailable.'},404);
 if(plans.error||library.error||history.error)return reply({error:'Saved plan, intervention choices or session history could not be loaded.'},503);
 const [choices,version]=await Promise.all([
  ctx.supabase.from('emr_treatment_library_versions').select('nodes').eq('revision',library.data.revision).single(),
  plans.data?.length?ctx.supabase.from('emr_treatment_plan_versions').select('id,plan_id,revision,snapshot,created_at').eq('plan_id',plans.data[0].id).order('revision',{ascending:false}).limit(1):Promise.resolve({data:[],error:null}),
 ]);
 if(choices.error||version.error)return reply({error:'Saved plan or intervention library version is unavailable.'},503);
 return reply({patient:{id:patientId,name:[person.data.demographics?.first_name,person.data.demographics?.last_name].filter(Boolean).join(' ')},versions:version.data??[],nodes:choices.data.nodes,libraryRevision:library.data.revision,entries:history.data??[]});
}
export async function POST(request:Request){
 const ctx=await emrAccess();if(!ctx||!sameOrigin(request))return reply({error:'Clinic sign-in, MFA and same-origin request required.'},403);
 try{
  const raw=await request.text();if(Buffer.byteLength(raw)>30000)return reply({error:'Intervention entry is too large.'},400);
  const body=JSON.parse(raw);if(!validImplementedInput(body))return reply({error:'Choose a session date and at least one implemented intervention from this patient’s saved plan.'},400);
  const patch={id:body.id,patient_id:body.patientId,plan_version_id:body.planVersionId,library_revision:body.libraryRevision,session_date:body.sessionDate,selection_ids:body.selections.map(({problemId,implementedId})=>({problemId,implementedId}))};
  const prior=await ctx.supabase.from('emr_implemented_intervention_entries').select(columns).eq('id',body.id).eq('patient_id',body.patientId).eq('owner_id',ctx.user.id).maybeSingle();
  if(prior.error)return reply({error:'Prior save could not be checked. Your selections remain open.'},503);
  function same(saved:Record<string,unknown>){return saved.plan_version_id===patch.plan_version_id&&saved.library_revision===patch.library_revision&&saved.session_date===patch.session_date&&JSON.stringify(saved.selection_ids)===JSON.stringify(patch.selection_ids);}
  if(prior.data)return same(prior.data)?reply({saved:true,entry:prior.data}):reply({error:'This entry was already recorded with different selections. Reload before saving a new entry.'},409);
  const saved=await ctx.supabase.from('emr_implemented_intervention_entries').insert(patch).select(columns).single();
  if(saved.error?.code==='23505'){
   const retry=await ctx.supabase.from('emr_implemented_intervention_entries').select(columns).eq('id',body.id).eq('patient_id',body.patientId).eq('owner_id',ctx.user.id).maybeSingle();
   if(retry.data&&same(retry.data))return reply({saved:true,entry:retry.data});
   return reply({error:'This entry ID was already used. Reload the saved entries before creating another.'},409);
  }
  if(saved.error||!saved.data)return reply({error:saved.error?.code==='40001'?'The intervention library changed. Your selections are retained; refresh and review the choices before saving again.':saved.error?.code==='42501'?'This patient or saved plan is unavailable to your account.':'Interventions were not saved. Check the date and that every selection belongs to the problem and its planned interventions.'},saved.error?.code==='40001'?409:saved.error?.code==='42501'?403:400);
  return reply({saved:true,entry:saved.data});
 }catch{return reply({error:'Invalid implemented-intervention entry.'},400);}
}
