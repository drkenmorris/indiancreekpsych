import { NextResponse } from 'next/server';
import { privateHeaders, sameOrigin } from '@/lib/emr/access';
import { uuid } from '@/lib/emr/demographics';
import { modalityAccess } from '@/lib/emr/modality-access';
import { maxCarePeriods, maxExpectedSessions, maxSessionRows, sessionFrequencies, sessionTypes, validCarePeriod, type CarePeriod } from '@/lib/emr/treatment-modality';

export const dynamic = 'force-dynamic';
const columns = 'patient_id,assigned_provider_id,revision,sessions,care_periods';
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: privateHeaders });
const denied = () => reply({ error: 'Clinic sign-in and MFA required.' }, 403);
const unavailable = () => reply({ error: 'Patient unavailable or outside your assigned charts.' }, 404);

async function activePatient(ctx: NonNullable<Awaited<ReturnType<typeof modalityAccess>>>, patientId: string) {
 const patient = await ctx.supabase.from('clinical_patients').select('id,demographics')
  .eq('id', patientId).is('directory_deleted_at', null).maybeSingle();
 return !patient.error && !!patient.data && patient.data.demographics?.active !== false;
}

export async function GET(request: Request) {
 const ctx = await modalityAccess();
 if (!ctx) return denied();

 const patientId = new URL(request.url).searchParams.get('patient');
 if (!uuid(patientId)) return reply({ error: 'Select a patient.' }, 400);
 if (ctx.admin && !await activePatient(ctx, patientId)) return unavailable();

 const record = await ctx.supabase.from('emr_treatment_modalities').select(columns)
  .eq('patient_id', patientId).maybeSingle();
 if (record.error) return reply({ error: 'Modality could not be loaded.' }, 503);
 if (!ctx.admin && !record.data) return unavailable();

 const directory = await ctx.supabase.rpc('emr_modality_directory', { p_include_staff: ctx.admin });
 if (directory.error) return reply({ error: 'Provider roster could not be loaded.' }, 503);
 return reply({ record: record.data, providers: directory.data, admin: ctx.admin, userId: ctx.user.id });
}

export async function POST(request: Request) {
 const ctx = await modalityAccess();
 if (!ctx || !sameOrigin(request)) return denied();
 try {
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 24000) return reply({ error: 'Modality request is too large.' }, 400);
  const body = JSON.parse(raw);
  if (body?.action === 'addProvider') {
   if (!ctx.admin) return denied();
   if (!uuid(body.providerId)) return reply({ error: 'Select a provider account.' }, 400);
   const { error } = await ctx.supabase.from('emr_modality_providers').insert({ provider_id: body.providerId });
   return error ? reply({ error: 'Provider could not be added. Reload the roster and try again.' }, 409) : reply({ saved: true });
  }

  const { patientId, revision, assignedProviderId, sessions, carePeriods } = body;
  if (!uuid(patientId) || !Number.isSafeInteger(revision) || revision < 0 ||
   (assignedProviderId !== null && !uuid(assignedProviderId)) || !Array.isArray(sessions) ||
   sessions.length > maxSessionRows || sessions.some(s => !s || typeof s.code !== 'string' ||
    !Object.hasOwn(sessionTypes, s.code) || typeof s.frequency !== 'string' ||
    !Object.hasOwn(sessionFrequencies, s.frequency) || !Number.isInteger(s.count) ||
    s.count < 1 || s.count > maxExpectedSessions || !uuid(s.providerId))) {
   return reply({ error: 'Complete the session type, count, frequency, and provider on each row.' }, 400);
  }
  if (carePeriods !== undefined && (!Array.isArray(carePeriods) || carePeriods.length > maxCarePeriods ||
   !carePeriods.every(validCarePeriod))) {
   return reply({ error: 'Choose a level and valid start date for each care period. A planned end date must be on or after its start.' }, 400);
  }
  if (ctx.admin && !await activePatient(ctx, patientId)) return unavailable();
  const patch = {
   sessions: sessions.map(({ code, count, frequency, providerId }) => ({ code, count, frequency, providerId })),
   ...(carePeriods === undefined ? {} : {
    care_periods: carePeriods.map(({ level, agreement, startDate, endDate }: CarePeriod) => ({ level, agreement, startDate, endDate })),
   }),
   revision: revision + 1,
   ...(ctx.admin ? { assigned_provider_id: assignedProviderId } : {}),
  };
  const query = revision === 0 && ctx.admin
   ? ctx.supabase.from('emr_treatment_modalities').insert({ ...patch, patient_id: patientId })
   : ctx.supabase.from('emr_treatment_modalities').update(patch).eq('patient_id', patientId).eq('revision', revision);
  const saved = await query.select(columns).maybeSingle();
  if (!saved.data && (!saved.error || ['40001', '23505'].includes(saved.error.code))) {
   return reply({ error: 'The plan or assignment changed. Reload Modality and review before saving again.' }, 409);
  }
  if (saved.error) return reply({ error: 'Modality could not be saved. Check that each provider is active.' }, 400);
  return reply({ record: saved.data });
 } catch {
  return reply({ error: 'Invalid Modality request.' }, 400);
 }
}
