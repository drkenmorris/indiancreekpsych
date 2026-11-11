import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';

export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});

export async function POST(request:Request){
 const ctx=await emrAccess();
 if(!ctx||!sameOrigin(request))
  return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);
 try{
  const raw=await request.text();
  if(Buffer.byteLength(raw)>1500)return reply({error:'Attestation request too large.'},413);
  const value=JSON.parse(raw) as Record<string,unknown>;
  if(!value||typeof value!=='object'||Array.isArray(value)
   ||!uuid(value.note_id)||!uuid(value.patient_id)||value.attested!==true
   ||typeof value.typed_name!=='string'||value.typed_name.trim().length<3
   ||value.typed_name.trim().length>160)
   return reply({error:'Selected patient, original note, matching signer name and explicit attestation required.'},400);
  const {data,error}=await ctx.supabase.rpc('attest_emr_individual_progress_note',{
   p_payload:{patient_id:value.patient_id,note_id:value.note_id,
    typed_name:value.typed_name.trim(),attested:true}
  });
  if(error){
   if(error.code==='42501')return reply({error:'Administrator authorization denied.'},403);
   if(error.code==='23505')return reply({error:'Original note was already attested. Refresh the chart.'},409);
   if(error.code==='22023'||error.code==='23514')
    return reply({error:'Attestation failed patient, author or name verification.'},400);
   return reply({error:'Clinical attestation could not be saved.'},503);
  }
  if(!uuid(data))return reply({error:'Clinical attestation could not be confirmed.'},503);
  return reply({id:data,signed:true,scope:'original-note-only'},201);
 }catch{return reply({error:'Invalid attestation request.'},400);}
}
