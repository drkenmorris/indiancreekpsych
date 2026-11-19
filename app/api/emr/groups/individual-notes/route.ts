import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
export const dynamic='force-dynamic';
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:privateHeaders});
const templates:Record<string,string[]>={DAP:['data','assessment','plan'],SOAP:['subjective','objective','assessment','plan'],Narrative:['narrative']};
function validPayload(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Individual note is required.');
 const p=value as Record<string,unknown>;
 if(!uuid(p.patient_id)||!(p.session_id===null||uuid(p.session_id))||p.reviewed!==true)throw Error('A reviewed note and central patient/session IDs are required.');
 if(typeof p.template!=='string'||!Object.hasOwn(templates,p.template))throw Error('Choose a progress-note template.');
 const keys=templates[p.template];
 if(!p.sections||typeof p.sections!=='object'||Array.isArray(p.sections))throw Error('Note sections are required.');
 const sections=p.sections as Record<string,unknown>;
 if(Object.keys(sections).length!==keys.length||Object.keys(sections).some(key=>!keys.includes(key)))throw Error('Only the selected note sections are accepted.');
 const normalized:Record<string,string>={};
 for(const key of keys){
  const s=sections[key];
  if(typeof s!=='string'||s.trim().length<2||s.trim().length>4000)throw Error('Complete every note section within 2–4000 characters.');
  normalized[key]=s.trim();
 }
 if(p.session_id===null){
  if(typeof p.group_name!=='string'||p.group_name.trim().length<2||p.group_name.trim().length>160||typeof p.encounter_at!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(p.encounter_at)||!Number.isFinite(Date.parse(p.encounter_at)))throw Error('Group name and session date/time with timezone required.');
  return {patient_id:p.patient_id,group_name:p.group_name.trim(),encounter_at:p.encounter_at,template:p.template,sections:normalized,reviewed:true};
 }
 return {patient_id:p.patient_id,session_id:p.session_id,template:p.template,sections:normalized,reviewed:true};
}
export async function GET(request:Request){
 const ctx=await emrAccess();
 if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const query=new URL(request.url).searchParams;
 const patientId=query.get('patient'),sessionId=query.get('session')==='independent'?null:query.get('session');
 const independent=query.get('session')==='independent';
 if(!uuid(patientId)||!(independent||uuid(sessionId)))return reply({error:'Valid patient and group session IDs are required.'},400);
 if(independent){const patient=await ctx.supabase.from('clinical_patients').select('id').eq('id',patientId).maybeSingle();if(patient.error)return reply({error:'Patient verification unavailable.'},503);if(!patient.data)return reply({error:'Central patient unavailable.'},404);}
 let notesQuery=ctx.supabase.from('emr_group_individual_notes').select(independent?'id,patient_id,session_id,template,sections,created_at,group_name,encounter_at':'id,patient_id,session_id,template,sections,created_at').eq('patient_id',patientId);
 notesQuery=independent?notesQuery.is('session_id',null):notesQuery.eq('session_id',sessionId);
 const {data,error}=await notesQuery.order('created_at',{ascending:false}).limit(50);
 if(error)return reply({error:'Individual group notes unavailable.'},503);
 return reply({patientId,sessionId,notes:data??[]});
}
export async function POST(request:Request){
 const ctx=await emrAccess();
 if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);
 try{
  const raw=await request.text();
  if(Buffer.byteLength(raw)>18000)return reply({error:'Individual note too large.'},413);
  const p=validPayload(JSON.parse(raw));
  const {data,error}=await ctx.supabase.rpc('session_id' in p?'save_emr_group_individual_note':'save_independent_group_note',{p_payload:p});
  if(error)return reply({error:error.code==='42501'?'Group note authorization denied.':error.code==='22023'||error.code==='23514'?('session_id' in p?'Check the patient, attendance and note content.':'Check the patient, group name, session time and note content.'):'Group note save was not confirmed.'},
   error.code==='42501'?403:error.code==='22023'||error.code==='23514'?400:503);
  if(!uuid(data))return reply({error:'Group note save was not confirmed.'},503);
  return reply({id:data,saved:true,unsigned:true},201);
 }catch(e){return reply({error:e instanceof Error?e.message:'Invalid individual group note.'},400);}
}
