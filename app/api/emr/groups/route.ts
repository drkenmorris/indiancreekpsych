import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';

export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});

type Attendance='Present'|'Absent'|'Excused';
const validStatus=(v:unknown):v is Attendance=>v==='Present'||v==='Absent'||v==='Excused';
function text(value:unknown,max:number):string {
  if(typeof value!=='string'||value.trim().length<2||value.trim().length>max)throw Error('Complete all shared session fields within the character limits.');
  return value.trim();
}
function payload(value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Group session required.');
  const data=value as Record<string,unknown>;
  const group_name=text(data.group_name,160),facilitators=text(data.facilitators,250);
  const shared_topic=text(data.shared_topic,250),shared_content=text(data.shared_content,8000);
  const duration_minutes=data.duration_minutes,scheduled_start=data.scheduled_start;
  if(!Number.isInteger(duration_minutes)||typeof duration_minutes!=='number'||duration_minutes<15||duration_minutes>240)throw Error('Duration must be 15–240 minutes.');
  if(typeof scheduled_start!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(scheduled_start)||!Number.isFinite(Date.parse(scheduled_start))||scheduled_start.length>40)throw Error('Choose a valid session start time with an explicit timezone offset.');
  if(data.reviewed!==true)throw Error('Review the shared note and confirm it contains no individual patient details.');
  if(!Array.isArray(data.participants)||data.participants.length<2||data.participants.length>30)throw Error('Select 2–30 central patients.');
  const seen=new Set<string>();
  const participants=data.participants.map((item:unknown)=>{
    if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid group member.');
    const row=item as Record<string,unknown>;
    if(!uuid(row.patient_id)||!validStatus(row.attendance)||seen.has(row.patient_id))throw Error('Choose distinct patients with valid attendance.');
    seen.add(row.patient_id);
    return {patient_id:row.patient_id,attendance:row.attendance};
  });
  return {group_name,facilitators,shared_topic,shared_content,duration_minutes,scheduled_start:new Date(scheduled_start).toISOString(),reviewed:true,participants};
}
export async function GET(){
  const ctx=await emrAccess();
  if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
  const {data:settings,error:settingsError}=await ctx.supabase.from('appointment_settings').select('timezone').eq('id',true).maybeSingle();
  if(settingsError||typeof settings?.timezone!=='string'||!settings.timezone)return reply({error:'Clinic timezone is unavailable; group documentation cannot be dated safely.'},503);
  const {data:sessions,error}=await ctx.supabase.from('emr_group_sessions')
    .select('id,group_name,facilitators,scheduled_start,duration_minutes,shared_topic,shared_content,created_at')
    .order('scheduled_start',{ascending:false}).limit(100);
  if(error)return reply({error:'Group session repository unavailable.'},503);
  const ids=(sessions??[]).map(row=>row.id);
  if(!ids.length)return reply({timezone:settings.timezone,sessions:[]});
  const result=await ctx.supabase.from('emr_group_participation')
    .select('session_id,patient_id,attendance').in('session_id',ids);
  if(result.error)return reply({error:'Group attendance unavailable.'},503);
  return reply({timezone:settings.timezone,sessions:(sessions??[]).map(row=>({...row,participants:(result.data??[]).filter(x=>x.session_id===row.id).map(x=>({patient_id:x.patient_id,attendance:x.attendance}))}))});
}
export async function POST(request:Request){
  const ctx=await emrAccess();
  if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);
  try{
    const raw=await request.text();
    if(Buffer.byteLength(raw)>20000)return reply({error:'Group session too large.'},413);
    const input=payload(JSON.parse(raw));
    const {data,error}=await ctx.supabase.rpc('save_emr_group_session',{p_payload:input});
    if(error)return reply({error:error.code==='42501'?'Group session authorization denied.':error.code==='22023'||error.code==='23514'?'Check group attendance and required fields.':'Group save was not confirmed.'},error.code==='42501'?403:error.code==='22023'||error.code==='23514'?400:503);
    if(!uuid(data))return reply({error:'Group save was not confirmed.'},503);
    return reply({id:data,saved:true},201);
  }catch(e){return reply({error:e instanceof Error?e.message:'Invalid group session.'},400);}
}
