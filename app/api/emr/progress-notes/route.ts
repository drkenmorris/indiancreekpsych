import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';

export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});
const templates:Record<string,readonly string[]>={DAP:['data','assessment','plan'],SOAP:['subjective','objective','assessment','plan'],Narrative:['narrative']};
const encounterTypes=['Individual therapy','Initial evaluation','Follow-up','Other clinical encounter'] as const;
const isoDate=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/;
function parse(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Progress-note payload required.');
 const body=value as Record<string,unknown>;
 if(!uuid(body.patient_id)||body.reviewed!==true)throw Error('Reviewed note and valid central patient ID required.');
 if(body.action==='addendum'){
  if(!uuid(body.note_id))throw Error('Valid original progress note required.');
  if(typeof body.reason!=='string'||body.reason.trim().length<5||body.reason.trim().length>200
   ||typeof body.amendment!=='string'||body.amendment.trim().length<5||body.amendment.trim().length>4000)
   throw Error('Reason must be 5–200 characters, addendum 5–4000 characters.');
  return {method:'save_emr_individual_progress_note_addendum',
   payload:{note_id:body.note_id,patient_id:body.patient_id,reason:body.reason.trim(),amendment:body.amendment.trim(),reviewed:true}};
 }
 if(body.action!=='note')throw Error('Select note or addendum.');
 if(typeof body.encounter_at!=='string'||!isoDate.test(body.encounter_at)||!Number.isFinite(Date.parse(body.encounter_at)))
  throw Error('Timestamp with explicit timezone required.');
 if(typeof body.encounter_type!=='string'||!encounterTypes.includes(body.encounter_type as typeof encounterTypes[number]))
  throw Error('Choose a supported clinical encounter type.');
 if(typeof body.template!=='string'||!Object.hasOwn(templates,body.template))
  throw Error('Choose a supported progress-note format.');
 if(!body.sections||typeof body.sections!=='object'||Array.isArray(body.sections))
  throw Error('Progress-note sections required.');
 const sections=body.sections as Record<string,unknown>;
 const keys=templates[body.template];
 if(Object.keys(sections).length!==keys.length||Object.keys(sections).some(key=>!keys.includes(key)))
  throw Error('Only selected template sections are accepted.');
 const normalized:Record<string,string>={};
 for(const key of keys){
  const value=sections[key];
  if(typeof value!=='string'||value.trim().length<2||value.trim().length>4000)
   throw Error('Every note section requires 2–4000 characters.');
  normalized[key]=value.trim();
 }
 return {method:'save_emr_individual_progress_note',
  payload:{patient_id:body.patient_id,encounter_at:body.encounter_at,encounter_type:body.encounter_type,
   template:body.template,sections:normalized,reviewed:true}};
}
export async function GET(request:Request){
 const ctx=await emrAccess();
 if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const patientId=new URL(request.url).searchParams.get('patient');
 if(!uuid(patientId))return reply({error:'Valid central patient ID required.'},400);
 const patient=await ctx.supabase.from('clinical_patients').select('id').eq('id',patientId).maybeSingle();
 if(patient.error)return reply({error:'Selected patient could not be verified.'},503);
 if(!patient.data)return reply({error:'Selected central patient does not exist.'},404);
 const {data:notes,error}=await ctx.supabase.from('emr_individual_progress_notes')
  .select('id,patient_id,encounter_at,encounter_type,template,sections,created_at')
  .eq('patient_id',patientId).order('encounter_at',{ascending:false}).limit(100);
 if(error)return reply({error:'Individual progress notes unavailable.'},503);
 const ids=(notes??[]).map((note:{id:string})=>note.id);
 if(!ids.length)return reply({patientId,notes:[],addenda:[],attestations:[]});
 const [addendaResult,attestationResult]=await Promise.all([
  ctx.supabase.from('emr_individual_progress_note_addenda')
   .select('id,note_id,reason,amendment,created_at')
   .in('note_id',ids).order('created_at',{ascending:true}).limit(500),
  ctx.supabase.from('emr_individual_progress_note_attestations')
   .select('id,note_id,signer_name,signed_at')
   .in('note_id',ids).order('signed_at',{ascending:true}).limit(100),
 ]);
 if(addendaResult.error||attestationResult.error)
  return reply({error:'Progress-note history or attestation records unavailable.'},503);
 return reply({patientId,notes:notes??[],addenda:addendaResult.data??[],
  attestations:attestationResult.data??[]});
}
export async function POST(request:Request){
 const ctx=await emrAccess();
 if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);
 try{
  const raw=await request.text();
  if(Buffer.byteLength(raw)>18000)return reply({error:'Progress-note request too large.'},413);
  const {method,payload}=parse(JSON.parse(raw));
  const {data,error}=await ctx.supabase.rpc(method,{p_payload:payload});
  if(error)return reply({error:error.code==='42501'?'Progress-note authorization denied.':
    error.code==='22023'||error.code==='23514'?'Check patient, encounter and reviewed content.':
    'Progress-note save was not confirmed.'},
    error.code==='42501'?403:error.code==='22023'||error.code==='23514'?400:503);
  if(!uuid(data))return reply({error:'Progress-note save was not confirmed.'},503);
  return reply({id:data,saved:true,unsigned:true,kind:method.endsWith('_addendum')?'addendum':'note'},201);
 }catch(error){return reply({error:error instanceof Error?error.message:'Invalid progress note.'},400);}
}
