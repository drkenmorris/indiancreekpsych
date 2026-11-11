import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';

export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});

/** Read only the selected central patient's own group attendance.
 * The MFA-authenticated Supabase client still enforces owner-scoped RLS.
 * Never return another group member's identity or patient-specific notes.
 */
export async function GET(request:Request){
  const ctx=await emrAccess();
  if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
  const patientId=new URL(request.url).searchParams.get('patient');
  if(!uuid(patientId))return reply({error:'A valid central patient ID is required.'},400);

  const patient=await ctx.supabase.from('clinical_patients').select('id').eq('id',patientId).maybeSingle();
  if(patient.error)return reply({error:'Patient repository unavailable.'},503);
  if(!patient.data)return reply({error:'Patient unavailable.'},404);

  const settings=await ctx.supabase.from('appointment_settings').select('timezone').eq('id',true).maybeSingle();
  const timezone=settings.data?.timezone;
  if(settings.error||typeof timezone!=='string'||!timezone)return reply({error:'Clinic timezone unavailable.'},503);
  try {new Intl.DateTimeFormat('en-US',{timeZone:timezone});}
  catch {return reply({error:'Clinic timezone invalid.'},503);}

  // Filter on the participant table before joining to shared session metadata.
  // The inner join never exposes any other participant, their attendance or notes.
  const {data,error}=await ctx.supabase.from('emr_group_participation')
    .select('attendance,session:emr_group_sessions!inner(id,group_name,scheduled_start,duration_minutes,shared_topic,created_at)')
    .eq('patient_id',patientId)
    .order('session(scheduled_start)',{ascending:false})
    .limit(100);
  if(error)return reply({error:'Patient group history unavailable.'},503);
  const sessions=[];
  for(const row of data??[]){
    const session=Array.isArray(row.session)?row.session[0]:row.session;
    if(!session)return reply({error:'Patient group history unavailable.'},503);
    sessions.push({id:session.id,group_name:session.group_name,scheduled_start:session.scheduled_start,
      duration_minutes:session.duration_minutes,shared_topic:session.shared_topic,
      created_at:session.created_at,attendance:row.attendance});
  }
  sessions.sort((a,b)=>Date.parse(b.scheduled_start)-Date.parse(a.scheduled_start));
  return reply({patientId,timezone,sessions});
}
