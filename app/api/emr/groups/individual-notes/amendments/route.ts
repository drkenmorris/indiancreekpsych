import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});
const validIds=(p:Record<string,unknown>)=>uuid(p.note_id)&&uuid(p.patient_id)&&uuid(p.session_id);

export async function GET(request:Request){
 const ctx=await emrAccess();
 if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const search=new URL(request.url).searchParams;
 const noteId=search.get('note'),patientId=search.get('patient'),sessionId=search.get('session');
 if(!uuid(noteId)||!uuid(patientId)||!uuid(sessionId))return reply({error:'Valid note, patient and session IDs are required.'},400);
 const note=await ctx.supabase.from('emr_group_individual_notes').select('id')
  .eq('id',noteId).eq('patient_id',patientId).eq('session_id',sessionId).maybeSingle();
 if(note.error)return reply({error:'Original progress note unavailable.'},503);
 if(!note.data)return reply({error:'Original progress note not found in selected chart.'},404);
 const result=await ctx.supabase.from('emr_group_note_amendments')
  .select('id,note_id,reason,amendment,created_at')
  .eq('note_id',noteId).order('created_at',{ascending:true}).limit(100);
 if(result.error)return reply({error:'Progress-note amendments unavailable.'},503);
 return reply({noteId,patientId,sessionId,amendments:result.data??[]});
}

export async function POST(request:Request){
 const ctx=await emrAccess();
 if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);
 try{
  const raw=await request.text();
  if(Buffer.byteLength(raw)>10000)return reply({error:'Amendment request too large.'},413);
  const data:unknown=JSON.parse(raw);
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Amendment payload required.');
  const p=data as Record<string,unknown>;
  if(!validIds(p)||p.reviewed!==true)throw Error('Review and valid note, patient and session IDs are required.');
  if(typeof p.reason!=='string'||p.reason.trim().length<5||p.reason.trim().length>200
   ||typeof p.amendment!=='string'||p.amendment.trim().length<5||p.amendment.trim().length>4000)
   throw Error('Reason must be 5–200 characters; amendment must be 5–4000 characters.');
  const payload={note_id:p.note_id,patient_id:p.patient_id,session_id:p.session_id,
   reason:p.reason.trim(),amendment:p.amendment.trim(),reviewed:true};
  const result=await ctx.supabase.rpc('save_emr_group_note_amendment',{p_payload:payload});
  if(result.error)return reply({error:result.error.code==='42501'?'Amendment authorization denied.':
    result.error.code==='22023'||result.error.code==='23514'?'Check the note, attendance and amendment details.':
     'Progress-note amendment save was not confirmed.'},
   result.error.code==='42501'?403:result.error.code==='22023'||result.error.code==='23514'?400:503);
  if(!uuid(result.data))return reply({error:'Amendment save was not confirmed.'},503);
  return reply({id:result.data,saved:true,unsigned:true},201);
 }catch(e){return reply({error:e instanceof Error?e.message:'Invalid progress-note amendment.'},400);}
}
