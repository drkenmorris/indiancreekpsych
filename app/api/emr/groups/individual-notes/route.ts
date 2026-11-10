import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
export const dynamic='force-dynamic';
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:privateHeaders});
const templates:Record<string,string[]>={DAP:['data','assessment','plan'],SOAP:['subjective','objective','assessment','plan'],Narrative:['narrative']};
function validPayload(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Individual note is required.');
 const p=value as Record<string,unknown>;
 if(!uuid(p.patient_id)||!uuid(p.session_id)||p.reviewed!==true)throw Error('A reviewed note and central patient/session IDs are required.');
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
 return {patient_id:p.patient_id,session_id:p.session_id,template:p.template,sections:normalized,reviewed:true};
}
export async function GET(request:Request){
 const ctx=await emrAccess();
 if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const query=new URL(request.url).searchParams;
 const patientId=query.get('patient'),sessionId=query.get('session');
 if(!uuid(patientId)||!uuid(sessionId))return reply({error:'Valid patient and group session IDs are required.'},400);
 const {data,error}=await ctx.supabase.from('emr_group_individual_notes')
  .select('id,patient_id,session_id,template,sections,created_at')
  .eq('patient_id',patientId).eq('session_id',sessionId).order('created_at',{ascending:false}).limit(50);
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
  const {data,error}=await ctx.supabase.rpc('save_emr_group_individual_note',{p_payload:p});
  if(error)return reply({error:error.code==='42501'?'Group note authorization denied.':error.code==='22023'||error.code==='23514'?'Check the patient, attendance and note content.':'Group note save was not confirmed.'},
   error.code==='42501'?403:error.code==='22023'||error.code==='23514'?400:503);
  if(!uuid(data))return reply({error:'Group note save was not confirmed.'},503);
  return reply({id:data,saved:true,unsigned:true},201);
 }catch(e){return reply({error:e instanceof Error?e.message:'Invalid individual group note.'},400);}
}
