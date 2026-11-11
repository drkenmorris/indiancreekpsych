import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';

export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});

export async function GET(request:Request){
 const ctx=await emrAccess();
 if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const params=new URL(request.url).searchParams;
 const noteId=params.get('note'),patientId=params.get('patient'),sessionId=params.get('session');
 if(!uuid(noteId)||!uuid(patientId)||!uuid(sessionId))
  return reply({error:'Valid note, patient and session IDs required.'},400);
 const original=await ctx.supabase.from('emr_group_individual_notes').select('id')
  .eq('id',noteId).eq('patient_id',patientId).eq('session_id',sessionId).maybeSingle();
 if(original.error)return reply({error:'Original group note unavailable.'},503);
 if(!original.data)return reply({error:'Original group note not found in selected chart.'},404);
 const result=await ctx.supabase.from('emr_group_note_attestations')
  .select('id,note_id,signer_name,signed_at').eq('note_id',noteId).maybeSingle();
 if(result.error)return reply({error:'Group note author-attestation history unavailable.'},503);
 return reply({noteId,patientId,sessionId,attestation:result.data??null});
}

export async function POST(request:Request){
 const ctx=await emrAccess();
 if(!ctx||!sameOrigin(request))
  return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);
 try {
  const raw=await request.text();
  if(Buffer.byteLength(raw)>1500)return reply({error:'Attestation request too large.'},413);
  const value=JSON.parse(raw) as Record<string,unknown>;
  if(!value||typeof value!=='object'||Array.isArray(value)
    ||!uuid(value.note_id)||!uuid(value.patient_id)||!uuid(value.session_id)
    ||value.attested!==true||typeof value.typed_name!=='string'
    ||value.typed_name.trim().length<3||value.typed_name.trim().length>160)
   return reply({error:'Selected patient, group session, note, matching signer name and explicit attestation required.'},400);
  const {data,error}=await ctx.supabase.rpc('attest_emr_group_individual_note',{
   p_payload:{patient_id:value.patient_id,session_id:value.session_id,
    note_id:value.note_id,typed_name:value.typed_name.trim(),attested:true}
  });
  if(error){
   if(error.code==='42501')return reply({error:'Administrator authorization denied.'},403);
   if(error.code==='23505')return reply({error:'Original group note is already attested. Refresh the chart.'},409);
   if(error.code==='22023'||error.code==='23514')
    return reply({error:'Check note ownership, attendance, patient or matching profile name.'},400);
   return reply({error:'Group note attestation was not confirmed.'},503);
  }
  if(!uuid(data))return reply({error:'Group note attestation was not confirmed.'},503);
  return reply({id:data,signed:true,scope:'original-group-note-only'},201);
 }catch{return reply({error:'Invalid group attestation request.'},400);}
}
