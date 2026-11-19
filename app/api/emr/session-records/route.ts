import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {validSections} from '@/lib/emr/session-records';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});
export async function GET(request:Request){
 const ctx=await emrAccess();if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const params=new URL(request.url).searchParams,pid=params.get('patient'),page=Number(params.get('page')??0);
 if(!uuid(pid)||!Number.isSafeInteger(page)||page<0||page>100000)return reply({error:'Valid patient and page required.'},400);
 const patient=await ctx.supabase.from('clinical_patients').select('id,demographics,profiles!clinical_patients_account_id_fkey(full_name)').eq('id',pid).maybeSingle();
 if(patient.error)return reply({error:'Patient identity unavailable.'},503);if(!patient.data)return reply({error:'Active patient unavailable.'},404);
 const d=patient.data.demographics??{},profile=Array.isArray(patient.data.profiles)?patient.data.profiles[0]:patient.data.profiles;
 const patientName=[d.first_name,d.middle_name,d.last_name].filter(Boolean).join(' ')||profile?.full_name||'Name not recorded in this chart';
 const notes=await ctx.supabase.from('emr_individual_progress_notes').select('id,patient_id,encounter_at,encounter_type,template,sections,created_at',{count:'exact'}).eq('patient_id',pid).in('template',['SOAP','DAP']).order('encounter_at',{ascending:false}).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*50,page*50+49);
 if(notes.error||notes.count===null)return reply({error:'Session records unavailable.'},503);
 const ids=(notes.data??[]).map(row=>row.id);
 async function history(table:string,columns:string,orderColumn='created_at'){
  const rows:Record<string,unknown>[]=[];
  if(!ids.length)return rows;
  for(let offset=0;offset<=10000;offset+=1000){
   const result=await ctx!.supabase.from(table).select(columns).in('note_id',ids).order(orderColumn,{ascending:true}).order('id',{ascending:true}).range(offset,offset+999);
   if(result.error)throw Error('Session amendment history unavailable.');
   const batch=result.data as unknown as Record<string,unknown>[];rows.push(...batch);if(batch.length<1000)return rows;
  }throw Error('Session history is too large to load completely. Contact the administrator.');
 }
 try{const [revisions,addenda,attestations]=await Promise.all([
  history('emr_individual_progress_note_revisions','id,note_id,prior_id,revision,reason,before_sections,sections,after_window,created_at'),
  history('emr_individual_progress_note_addenda','id,note_id,reason,amendment,created_at'),
  history('emr_individual_progress_note_attestations','id,note_id,signer_name,signed_at','signed_at'),
 ]);return reply({patientId:pid,patientName,notes:notes.data??[],revisions,addenda,attestations,total:notes.count,page,serverNow:new Date().toISOString()});}
 catch(error){return reply({error:error instanceof Error?error.message:'Session history unavailable.'},503);}
}
export async function POST(request:Request){
 const ctx=await emrAccess();if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);
 try{
  const raw=await request.text();if(Buffer.byteLength(raw)>100000)return reply({error:'Revision request too large.'},413);
  const body=JSON.parse(raw);
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==7||Object.keys(body).some(k=>!['patient_id','note_id','expected_prior_id','sections','reason','reviewed','template'].includes(k))||!uuid(body.patient_id)||!uuid(body.note_id)||!(body.expected_prior_id===null||uuid(body.expected_prior_id))||body.reviewed!==true||!validSections(body.sections,body.template)||typeof body.reason!=='string'||body.reason.trim().length<5||body.reason.trim().length>200)return reply({error:'Valid patient, note, prior revision, sections and reviewed reason required.'},400);
  const {template,...payload}=body;
  const {data,error}=await ctx.supabase.rpc('revise_emr_session_note',{p_payload:payload});
  if(error)return reply({error:error.code==='40001'?'This note changed. Reload saved records before revising. Your draft is retained.':error.code==='42501'?'Session revision authorization denied.':'Session revision was not saved. Check the note and correction reason.'},error.code==='40001'?409:error.code==='42501'?403:error.code==='22023'?400:503);
  if(!uuid(data))return reply({error:'Revision save was not confirmed. Reload saved records before retrying.'},503);
  return reply({id:data,saved:true,unsigned:true,kind:'revision'},201);
 }catch{return reply({error:'Invalid session revision.'},400);}
}
