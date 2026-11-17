import { NextResponse } from 'next/server';
import { modalityAccess } from '@/lib/emr/modality-access';
import { privateHeaders, sameOrigin } from '@/lib/emr/access';
import { uuid } from '@/lib/emr/demographics';
import {validTreatmentResponse,responsePlanReference} from '@/lib/emr/treatment-response';

export const dynamic = 'force-dynamic';
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: privateHeaders });
const denied = () => reply({ error: 'Clinic sign-in and MFA required.' }, 403);
async function access(patientId: unknown) {
 const ctx = await modalityAccess();
 if (!ctx) return { error: denied() };
 if (!uuid(patientId)) return { error: reply({ error: 'Select a patient.' }, 400) };
 if (ctx.admin) {
  const patient = await ctx.supabase.from('clinical_patients').select('id,demographics')
   .eq('id',patientId).is('directory_deleted_at',null).maybeSingle();
  if (patient.error || !patient.data || patient.data.demographics?.active === false)
   return { error: reply({ error: 'Patient unavailable.' },404) };
 }
 const record = await ctx.supabase.from('emr_treatment_modalities').select('revision,treatment_response').eq('patient_id',patientId).maybeSingle();
 if (record.error) return { error: reply({ error: 'Response could not be loaded.' },503) };
 if (!ctx.admin && !record.data) return { error: reply({ error: 'Patient unavailable or outside your assigned charts.' },404) };
 const context=await ctx.supabase.rpc('emr_treatment_response_context',{p_patient:patientId});
 if(context.error||context.data?.patientId!==patientId||typeof context.data.patientName!=='string'||!Array.isArray(context.data.plans))
  return {error:reply({error:'Chart identity and treatment plan choices could not be loaded.'},503)};
 return { ctx, patientId, record: record.data, context:context.data };
}
export async function GET(request: Request) {
 const result = await access(new URL(request.url).searchParams.get('patient'));
 if (result.error) return result.error;
 const history = await result.ctx.supabase.from('emr_treatment_response_versions').select('revision,response,recorded_at,recorded_by')
  .eq('patient_id',result.patientId).order('revision',{ascending:false}).limit(50);
 if (history.error) return reply({error:'Response history could not be loaded.'},503);
 return reply({ patientId:result.patientId, revision:result.record?.revision ?? 0,
  patientName:result.context.patientName,plans:result.context.plans,
  response:result.record?.treatment_response?{...result.record.treatment_response,participants:result.record.treatment_response.participants.map((row:any)=>row.role==='patient'?{...row,name:result.context.patientName}:row)}:null, history:history.data });
}
export async function POST(request: Request) {
 if (!sameOrigin(request)) return denied();
 try {
  const raw = await request.text();
  if (Buffer.byteLength(raw)>450000) return reply({error:'Response request is too large.'},400);
  const { patientId, revision, response } = JSON.parse(raw);
  const result = await access(patientId);
  if (result.error) return result.error;
  if (!Number.isSafeInteger(revision) || revision<0 || !validTreatmentResponse(response))
   return reply({error:'Check the approval rows and optional narrative formatting. Name each additional person whose approval is recorded.'},400);
  if(response.planReference&&response.planReference!==result.record?.treatment_response?.planReference&&!result.context.plans.some((plan:{id:string})=>response.planReference===responsePlanReference(plan.id)))
   return reply({error:'Choose a saved treatment plan available for this patient.'},400);
  const canonical={...response,participants:response.participants.map((row:any)=>row.role==='patient'?{...row,name:result.context.patientName}:row)};
  if(!validTreatmentResponse(canonical))return reply({error:'The patient name in the chart cannot be recorded in this response. Review the chart demographics.'},400);
  const patch = {treatment_response:canonical, revision:revision+1};
  const query = revision===0 && result.ctx.admin
   ? result.ctx.supabase.from('emr_treatment_modalities').insert({...patch,patient_id:patientId})
   : result.ctx.supabase.from('emr_treatment_modalities').update(patch).eq('patient_id',patientId).eq('revision',revision);
  const saved = await query.select('revision').maybeSingle();
  if (!saved.data && (!saved.error || ['40001','23505'].includes(saved.error.code)))
   return reply({error:'The chart changed. Reload Response and review before saving again.'},409);
  if (saved.error || !saved.data) return reply({error:'Response could not be saved.'},400);
  const history = await result.ctx.supabase.from('emr_treatment_response_versions').select('revision,response,recorded_at,recorded_by')
   .eq('patient_id',patientId).order('revision',{ascending:false}).limit(50);
  return reply({revision:saved.data.revision,response:canonical,history:history.error?null:history.data});
 } catch { return reply({error:'Invalid response request.'},400); }
}
