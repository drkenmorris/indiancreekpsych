import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {bpsNoteDomains,mapIntakeToBps} from '@/lib/emr/intake-bps';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});
const sourceFields='answers,status,version,updated_at';
async function linkedSource(supabase:NonNullable<Awaited<ReturnType<typeof emrAccess>>>['supabase'],id:string){
 const patient=await supabase.from('clinical_patients').select('id,account_id').eq('id',id).maybeSingle();
 if(patient.error)throw Error('Central patient repository unavailable.');
 if(!patient.data)return {code:404 as const,error:'Central patient not found.'};
 if(!patient.data.account_id)return {code:409 as const,error:'Patient account is not explicitly linked; name matching is prohibited.'};
 const intake=await supabase.from('patient_intakes').select(sourceFields).eq('patient_id',patient.data.account_id).maybeSingle();
 if(intake.error)throw Error('Linked intake source unavailable.');
 if(!intake.data)return {code:404 as const,error:'No linked patient intake found.'};
 return {patient:patient.data,intake:intake.data};
}
export async function GET(request:Request){
 const ctx=await emrAccess();if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const id=new URL(request.url).searchParams.get('patient');
 if(!uuid(id))return reply({error:'Valid central patient ID required.'},400);
 try{
  const source=await linkedSource(ctx.supabase,id);
  if('code' in source)return reply({error:source.error},source.code);
  const report=mapIntakeToBps(source.intake.answers as Record<string,string>);
  const {data:reviews,error}=await ctx.supabase.from('emr_bps_intake_reviews')
   .select('id,source_version,source_status,source_updated_at,clinical_answers,clinician_notes,created_at')
   .eq('patient_id',id).order('created_at',{ascending:false}).limit(20);
  if(error)return reply({error:'BPS review history unavailable; nonproduction migration may not yet be applied.'},503);
  return reply({patientId:id,linked:true,source:{status:source.intake.status,version:source.intake.version,
    updatedAt:source.intake.updated_at},...report,reviews:reviews??[]});
 }catch(e){return reply({error:e instanceof Error?e.message:'Protected intake unavailable.'},503);}
}
export async function POST(request:Request){
 const ctx=await emrAccess();
 if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);
 try{
  const raw=await request.text();if(Buffer.byteLength(raw)>35000)return reply({error:'BPS review request too large.'},413);
  const body=JSON.parse(raw) as Record<string,unknown>;
  if(!body||!uuid(body.patientId)||body.reviewed!==true||!Number.isInteger(body.sourceVersion)||
    typeof body.sourceVersion!=='number'||body.sourceVersion<1||
    (body.sourceStatus!=='draft'&&body.sourceStatus!=='submitted')||
    typeof body.sourceUpdatedAt!=='string'||!Number.isFinite(Date.parse(body.sourceUpdatedAt)))
   return reply({error:'Valid linked patient, source version and explicit clinical review required.'},400);
  if(!body.notes||typeof body.notes!=='object'||Array.isArray(body.notes))return reply({error:'Clinical notes are required.'},400);
  const fields=Object.keys(bpsNoteDomains);
  if(Object.keys(body.notes).some(key=>!fields.includes(key)))return reply({error:'Unsupported BPS notes field.'},400);
  const notes:Record<string,string>={};
  for(const key of fields){
   const value=(body.notes as Record<string,unknown>)[key]??'';
   if(typeof value!=='string'||value.length>4000)return reply({error:'Each clinical note must be at most 4,000 characters.'},400);
   notes[key]=value.trim();
  }
  const {data,error}=await ctx.supabase.rpc('save_emr_bps_intake_review',{p_payload:{
   patient_id:body.patientId,source_version:body.sourceVersion,source_status:body.sourceStatus,
   source_updated_at:body.sourceUpdatedAt,reviewed:true,clinician_notes:notes
  }});
  if(error)return reply({error:error.code==='42501'?'BPS review authorization denied.':
   error.code==='23505'?'This intake version was already reviewed; refresh the chart.':
   error.code==='22023'?'Intake was changed, unlinked or invalid; reopen and review the current source.':
   'BPS review save was not confirmed.'},
   error.code==='42501'?403:error.code==='23505'?409:error.code==='22023'?409:503);
  if(!uuid(data))return reply({error:'BPS review save was not confirmed.'},503);
  return reply({id:data,saved:true,unsigned:true,diagnosisCreated:false},201);
 }catch(e){return reply({error:e instanceof Error?e.message:'Invalid BPS review request.'},400);}
}
