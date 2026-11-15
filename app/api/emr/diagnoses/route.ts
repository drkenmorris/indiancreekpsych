import { NextResponse } from 'next/server';
import { modalityAccess } from '@/lib/emr/modality-access';
import { privateHeaders, sameOrigin } from '@/lib/emr/access';
import { uuid } from '@/lib/emr/demographics';
import { diagnosisCatalog, validDiagnoses } from '@/lib/emr/diagnoses';

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
 const record = await ctx.supabase.from('emr_treatment_modalities').select('revision,diagnoses').eq('patient_id',patientId).maybeSingle();
 if (record.error) return { error: reply({ error: 'Diagnoses could not be loaded.' },503) };
 if (!ctx.admin && !record.data) return { error: reply({ error: 'Patient unavailable or outside your assigned charts.' },404) };
 return { ctx, patientId, record: record.data };
}
export async function GET(request: Request) {
 const result = await access(new URL(request.url).searchParams.get('patient'));
 if (result.error) return result.error;
 const history = await result.ctx.supabase.from('emr_diagnosis_versions').select('revision,diagnoses,recorded_at')
  .eq('patient_id',result.patientId).order('revision',{ascending:false}).limit(50);
 if (history.error) return reply({error:'Diagnosis history could not be loaded.'},503);
 return reply({ patientId:result.patientId, revision:result.record?.revision ?? 0,
  diagnoses:result.record?.diagnoses ?? [], history:history.data, catalog:diagnosisCatalog });
}
export async function POST(request: Request) {
 if (!sameOrigin(request)) return denied();
 try {
  const raw = await request.text();
  if (Buffer.byteLength(raw)>60000) return reply({error:'Diagnosis request is too large.'},400);
  const { patientId, revision, diagnoses } = JSON.parse(raw);
  const result = await access(patientId);
  if (result.error) return result.error;
  if (!Number.isSafeInteger(revision) || revision<0 || !validDiagnoses(diagnoses))
   return reply({error:'Choose valid, different diagnosis codes and at most one primary diagnosis.'},400);
  const patch = {diagnoses, revision:revision+1};
  const query = revision===0 && result.ctx.admin
   ? result.ctx.supabase.from('emr_treatment_modalities').insert({...patch,patient_id:patientId})
   : result.ctx.supabase.from('emr_treatment_modalities').update(patch).eq('patient_id',patientId).eq('revision',revision);
  const saved = await query.select('revision').maybeSingle();
  if (!saved.data && (!saved.error || ['40001','23505'].includes(saved.error.code)))
   return reply({error:'The chart changed. Reload Diagnosis and review before saving again.'},409);
  if (saved.error || !saved.data) return reply({error:'Diagnoses could not be saved.'},400);
  const history = await result.ctx.supabase.from('emr_diagnosis_versions').select('revision,diagnoses,recorded_at')
   .eq('patient_id',patientId).order('revision',{ascending:false}).limit(50);
  return reply({revision:saved.data.revision,history:history.error?null:history.data});
 } catch { return reply({error:'Invalid diagnosis request.'},400); }
}
