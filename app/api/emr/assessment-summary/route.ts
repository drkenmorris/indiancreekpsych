import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {assignedTestLabel} from '@/lib/clinical-tests/assignments';
import {isConnectedKey} from '@/lib/clinical-tests/connected/definition';
import {asqRoleLabels,type AsqRole} from '@/lib/clinical-tests/asq-forms';
import {dsmVersionLabel} from '@/lib/clinical-tests/dsm/entry-choice';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:privateHeaders});
export async function GET(request:Request){
 const ctx=await emrAccess();if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const patientId=new URL(request.url).searchParams.get('patient');if(!uuid(patientId))return reply({error:'Select an active patient.'},400);
 const patient=await ctx.supabase.from('clinical_patients').select('id').eq('id',patientId).is('directory_deleted_at',null).maybeSingle();
 if(patient.error)return reply({error:'The patient could not be verified.'},503);
 if(!patient.data||patient.data.id!==patientId)return reply({error:'Patient unavailable.'},404);
 try{
  const completed=[],seen=new Set<string>();
  for(let offset=0;;offset+=200){
   const assignments=await ctx.supabase.from('psych_test_assignments').select('id,patient_id,assigned_by,test_key,asq_role,dsm_version').eq('patient_id',patientId).eq('assigned_by',ctx.user.id).order('created_at',{ascending:false}).order('id').range(offset,offset+199);
   if(assignments.error)throw Error('Assessment history unavailable.');
   const page=assignments.data??[];
   const rows=page.filter(a=>{if(seen.has(a.id))return false;seen.add(a.id);return true;});
   if(rows.some(a=>a.patient_id!==patientId||a.assigned_by!==ctx.user.id||!uuid(a.id)))throw Error('Assessment identity mismatch.');
   const groups=await Promise.all((['asq','dsm','connected'] as const).map(async kind=>{
    const group=rows.filter(a=>kind==='connected'?isConnectedKey(a.test_key):a.test_key===kind);if(!group.length)return [];
    const result=await ctx.supabase.from(kind+'_assignment_responses').select('assignment_id,status,submitted_at,answered_count,revision').in('assignment_id',group.map(a=>a.id)).eq('status','submitted');
    if(result.error)throw Error('Completed responses unavailable.');
    if((result.data??[]).some(r=>!group.some(a=>a.id===r.assignment_id)||r.status!=='submitted'))throw Error('Response identity mismatch.');
    return (result.data??[]).map(r=>{
     const a=group.find(a=>a.id===r.assignment_id)!;
     const respondent=kind==='asq'?asqRoleLabels[a.asq_role as AsqRole]??'Respondent not recorded':kind==='dsm'?dsmVersionLabel(a.dsm_version):'Assigned recipient';
     return {id:a.id,title:assignedTestLabel(a.test_key),respondent,completedAt:r.submitted_at,answeredCount:r.answered_count,responseRevision:r.revision,result:'Submitted questionnaire — open responses and results',href:'/admin/assign-test/'+kind+'-responses/'+a.id};
    });
   }));
   completed.push(...groups.flat());if(page.length<200)break;
  }
  const workspace=await ctx.supabase.from('emr_workspaces').select('patient_id,state').eq('patient_id',patientId).eq('owner_id',ctx.user.id).maybeSingle();
  if(workspace.error)throw Error('Session check-in history unavailable.');
  if(workspace.data&&workspace.data.patient_id!==patientId)throw Error('Check-in patient mismatch.');
  const records=workspace.data?.state?.records??[];
  if(!Array.isArray(records)||records.some(r=>r.patient_id!==patientId))throw Error('Check-in chart identity mismatch.');
  const checkins=records.filter(r=>r.kind==='response').map(row=>{
   const body=typeof row.body==='string'?JSON.parse(row.body):row.body;
   if(!uuid(row.id)||!body||body.reviewed!==true)throw Error('Saved check-in source requires review.');
   return {id:row.id,title:body.definition?.title??'Session check-in',completedAt:row.created,total:typeof body.total==='number'&&Number.isFinite(body.total)?body.total:null,maximum:typeof body.maximum==='number'&&Number.isFinite(body.maximum)?body.maximum:null,version:body.instrument_version??'',scoringVersion:body.scoring_version??'',notice:body.definition?.notice??'Review the original instrument before interpreting results.',items:Array.isArray(body.definition?.items)?body.definition.items.map((item:{id:string;text:string})=>({label:item.text,value:Number.isInteger(body.answers?.[item.id])?body.answers[item.id]:null,answer:body.definition?.choices?.[body.answers?.[item.id]]??'Not recorded'})):[]};
  });
  completed.sort((a,b)=>(b.completedAt??'').localeCompare(a.completedAt??''));checkins.sort((a,b)=>b.completedAt.localeCompare(a.completedAt));
  return reply({patientId,assessments:completed,checkins});
 }catch{return reply({error:'Assessment or check-in results could not be loaded. Please retry; no results were changed.'},503);}
}
