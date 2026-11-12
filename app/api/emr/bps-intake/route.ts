import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {bpsNoteDomains,mapIntakeToBps,sanitizeBpsClinicianNotes,sanitizeBpsSnapshotAnswers} from '@/lib/emr/intake-bps';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});
const sourceFields='patient_id,answers,status,version,updated_at';
async function linkedSource(supabase:NonNullable<Awaited<ReturnType<typeof emrAccess>>>['supabase'],id:string){
 const patient=await supabase.from('clinical_patients').select('id,account_id').eq('id',id).maybeSingle();
 if(patient.error)throw Error('Central patient repository unavailable.');
 if(!patient.data)return {code:404 as const,error:'Central patient not found.'};
 // Do not trust a filtered database response unless the returned central row
 // actually belongs to the requested chart. Never fall back to name matching.
 if(patient.data.id!==id)return {code:409 as const,error:'Central patient source does not match the requested chart.'};
 if(!uuid(patient.data.account_id))return {code:409 as const,error:'Patient account is not explicitly and validly linked; name matching is prohibited.'};
 const intake=await supabase.from('patient_intakes').select(sourceFields).eq('patient_id',patient.data.account_id).maybeSingle();
 if(intake.error)throw Error('Linked intake source unavailable.');
 if(!intake.data)return {code:404 as const,error:'No linked patient intake found.'};
 // A successful .eq() call is not proof of row provenance. Fail closed if an
 // incorrectly scoped, mocked or stale intake result belongs to another account.
 if(intake.data.patient_id!==patient.data.account_id)
  return {code:409 as const,error:'Linked intake source does not match the central patient account.'};
 // The server must verify source provenance before returning any questionnaire
 // answers. A presentation-layer safeguard is insufficient for protected API
 // consumers and cannot make malformed historical rows safe to disclose.
 if((intake.data.status!=='draft'&&intake.data.status!=='submitted')||
   !Number.isSafeInteger(intake.data.version)||intake.data.version<1||
   typeof intake.data.updated_at!=='string'||!Number.isFinite(Date.parse(intake.data.updated_at)))
  return {code:409 as const,error:'Linked intake source metadata is invalid; reopen the protected original intake.'};
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
   .select('id,patient_id,source_account_id,source_version,source_status,source_updated_at,clinical_answers,clinician_notes,reviewed,created_at')
   .eq('patient_id',id).eq('source_account_id',source.patient.account_id)
   .order('created_at',{ascending:false}).limit(20);
  if(error)return reply({error:'BPS review history unavailable; nonproduction migration may not yet be applied.'},503);
  // A central chart may be relinked to another website account. Never display historical
  // snapshots from the former account under the newly linked patient's clinical source.
  if((reviews??[]).some(review=>review.patient_id!==id||review.source_account_id!==source.patient.account_id))
   return reply({error:'BPS review provenance does not match the current linked patient account.'},409);
  const safeReviews=(reviews??[]).map(({patient_id:_patient,source_account_id:_account,...review})=>{
   // A malformed or historical review must never leak unapproved intake fields
   // in the API payload, even if the browser also filters its visible content.
   const clean=sanitizeBpsSnapshotAnswers(review.clinical_answers);
   const safeNotes=sanitizeBpsClinicianNotes(review.clinician_notes);
   return {...review,reviewed:review.reviewed===true,clinical_answers:clean.answers,clinician_notes:safeNotes.notes,
    excluded_clinical_fields:clean.excludedCount,excluded_clinician_notes:safeNotes.excludedCount};
  });
  return reply({patientId:id,linked:true,source:{accountId:source.patient.account_id,status:source.intake.status,version:source.intake.version,
    updatedAt:source.intake.updated_at},...report,reviews:safeReviews});
 }catch(e){return reply({error:e instanceof Error?e.message:'Protected intake unavailable.'},503);}
}
export async function POST(request:Request){
 const ctx=await emrAccess();
 if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);
 try{
  const raw=await request.text();if(Buffer.byteLength(raw)>35000)return reply({error:'BPS review request too large.'},413);
  const body=JSON.parse(raw) as Record<string,unknown>;
  if(!body||!uuid(body.patientId)||!uuid(body.sourceAccountId)||body.reviewed!==true||!Number.isInteger(body.sourceVersion)||
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
   patient_id:body.patientId,source_account_id:body.sourceAccountId,source_version:body.sourceVersion,source_status:body.sourceStatus,
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
