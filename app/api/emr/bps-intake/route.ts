import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {bpsNoteDomains,mapIntakeToBps,sanitizeBpsClinicianNotes,sanitizeBpsSnapshotAnswers,validBpsTimestamp,validBpsSubmissionChronology,validBpsReviewChronology,validBpsHistoricalSourceBoundary,recognizedBpsQuestionnaireVersion,bpsTimestampInstantNanoseconds,equalBpsTimestampInstants} from '@/lib/emr/intake-bps';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});
const sourceFields='patient_id,answers,status,version,updated_at,submitted_at';
async function linkedSource(supabase:NonNullable<Awaited<ReturnType<typeof emrAccess>>>['supabase'],id:string){
 const patient=await supabase.from('clinical_patients').select('id,account_id,directory_deleted_at').eq('id',id).is('directory_deleted_at',null).maybeSingle();
 if(patient.error)throw Error('Central patient repository unavailable.');
 if(!patient.data)return {code:404 as const,error:'Central patient not found.'};
 // Do not trust a filtered database response unless the returned central row
 // actually belongs to the requested chart. Never fall back to name matching.
 if(patient.data.id!==id)return {code:409 as const,error:'Central patient source does not match the requested chart.'};
 // Archived central charts retain their records, but no new BPS source may be disclosed.
 // The returned row must also be checked if a stale adapter ignores the filter.
 if(patient.data.directory_deleted_at!==null)return {code:409 as const,error:'This central patient chart is archived; BPS intake reconciliation is unavailable.'};
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
   // A submitted patient report edited AFTER its attestation receipt is not
   // an immutable clinical source, even if status still says "submitted".
   // Drafts may legitimately have no submission receipt.
   !validBpsSubmissionChronology(intake.data.status,intake.data.updated_at,intake.data.submitted_at))
  return {code:409 as const,error:'Linked intake source metadata is invalid; reopen the protected original intake.'};
 // A malformed JSONB answer payload must not silently turn a 21-section
 // clinical intake into an apparently valid blank questionnaire. Only the
 // versioned flat string-answer format is safe for this clinical mapping.
 // Reject the entire source before reading or disclosing clinician history.
 const answers=intake.data.answers;
 if(!answers||typeof answers!=='object'||Array.isArray(answers)||
   Object.values(answers).some(value=>typeof value!=='string'))
  return {code:409 as const,error:'Linked intake answers are malformed; reopen the protected original intake.'};
 // An unknown packet marker is not proof that the legacy questionnaire applies.
 // Reject before any source fields or clinician history can be disclosed.
 if(!recognizedBpsQuestionnaireVersion(answers.legal_packet_version))
  return {code:409 as const,error:'Unrecognized intake questionnaire version; verify the protected original source.'};
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
  // An append-only review can be older than the default query row limit.
  // Verify the COMPLETE patient-scoped history, including exact count and stable
  // ordering across pages, before allowing another clinician review.
  const reviewFields='id,patient_id,source_account_id,source_version,source_status,source_updated_at,clinical_answers,clinician_notes,reviewed,created_at';
  const reviewPageSize=100,maxReviewRows=1000;
  const reviews: Array<Record<string,any>>=[];
  const seenReviewIds=new Set<string>();
  // Count and unique IDs alone do not prove page continuity: a stale or
  // incorrectly ordered page may silently omit an older clinician review.
  // Verify the exact descending (created_at, id) cursor order promised by SQL.
  let previousReviewInstant:bigint|null=null,previousReviewId='';
  let expectedReviewCount:number|null=null;
  for(let offset=0;offset<maxReviewRows;offset+=reviewPageSize){
   const {data:page,error,count}=await ctx.supabase.from('emr_bps_intake_reviews')
    .select(reviewFields,{count:'exact'})
    .eq('patient_id',id).eq('source_account_id',source.patient.account_id)
    .order('created_at',{ascending:false}).order('id',{ascending:false})
    .range(offset,offset+reviewPageSize-1);
   // Never interpret an absent count or a truncated page as an empty history.
   if(error||!Array.isArray(page)||page.length>reviewPageSize||
    count===null||!Number.isSafeInteger(count)||count<0)
    return reply({error:'BPS review history unavailable or invalid; cannot verify prior clinician review.'},503);
   if(count>maxReviewRows)
    return reply({error:'BPS review history exceeds the 1,000-row verified retrieval cap; use the full protected clinical history before additional review.'},409);
   if(expectedReviewCount!==null&&count!==expectedReviewCount)
    return reply({error:'BPS review history changed during retrieval; reopen the chart before clinical review.'},409);
   expectedReviewCount=count;
   for(const row of page){
    if(!row||typeof row!=='object'||!uuid(row.id)||seenReviewIds.has(row.id.toLowerCase()))
     return reply({error:'BPS review history contains a repeated or invalid review identity; reopen the chart.'},409);
    const instant=bpsTimestampInstantNanoseconds(row.created_at);
    const rowId=row.id.toLowerCase();
    if(instant===null||(previousReviewInstant!==null&&
      (instant>previousReviewInstant||(instant===previousReviewInstant&&rowId>=previousReviewId))))
     return reply({error:'BPS review history ordering could not be verified; reopen the chart before clinical review.'},409);
    previousReviewInstant=instant;previousReviewId=rowId;
    seenReviewIds.add(rowId);reviews.push(row);
   }
   if(reviews.length===expectedReviewCount)break;
   // A partial page before the expected last row means omitted history.
   if(page.length!==reviewPageSize)
    return reply({error:'BPS review history retrieval was truncated; reopen the protected chart.'},409);
  }
  if(expectedReviewCount===null||reviews.length!==expectedReviewCount)
   return reply({error:'BPS review history was not retrieved completely; reopen the protected chart.'},409);
  // A central chart may be relinked to another website account. Never display historical
  // snapshots from the former account under the newly linked patient's clinical source.
  if((reviews??[]).some(review=>review.patient_id!==id||review.source_account_id!==source.patient.account_id))
   return reply({error:'BPS review provenance does not match the current linked patient account.'},409);
  // Historical review metadata is also protected clinical provenance. A database
  // scope filter cannot establish that a returned row is an identifiable,
  // versioned clinical snapshot. Withhold the entire response if any returned
  // row is malformed rather than expose its answers under a fabricated date.
  // Missing or malformed attestation is not an explicitly unreviewed clinical row.
  // Withhold the entire history rather than silently converting unknown to false.
  if((reviews??[]).some(review=>typeof review.reviewed!=='boolean'||!uuid(review.id)||
    !Number.isSafeInteger(review.source_version)||review.source_version<1||
    (review.source_status!=='draft'&&review.source_status!=='submitted')||
    !validBpsTimestamp(review.source_updated_at)||
    !validBpsTimestamp(review.created_at)||
     !validBpsReviewChronology(review.source_updated_at,review.created_at,
      review.source_version===source.intake.version&&review.source_status==='submitted'
       ?source.intake.submitted_at:undefined)||
    !validBpsHistoricalSourceBoundary(review.source_version,review.source_status,review.source_updated_at,
     source.intake.version,source.intake.status,source.intake.updated_at)))
   return reply({error:'BPS historical review provenance could not be verified.'},409);
  // Historical rows can be individually well-formed even if a central chart is
  // relinked or its website intake changes while paginated history is loading.
  // Re-read both protected scopes immediately before returning any patient text.
  // Do not release an earlier account's clinical report under a new chart link.
  const stable=await linkedSource(ctx.supabase,id);
  if('code' in stable||stable.patient.account_id!==source.patient.account_id||
    stable.intake.patient_id!==source.intake.patient_id||
    stable.intake.version!==source.intake.version||
    stable.intake.status!==source.intake.status||
    !equalBpsTimestampInstants(stable.intake.updated_at,source.intake.updated_at)||
    (source.intake.submitted_at==null?stable.intake.submitted_at!=null:
      !equalBpsTimestampInstants(stable.intake.submitted_at,source.intake.submitted_at)))
   return reply({error:'Linked intake or central patient association changed during clinical history retrieval; reopen the chart.'},409);
  const safeReviews=reviews.map(review=>{
   // Return an explicit allowlist, not a spread of the database adapter row.
   // A stale adapter or future schema can add columns with unrelated patient
   // identifiers, insurance details or PHI: none may cross this API boundary.
   const clean=sanitizeBpsSnapshotAnswers(review.clinical_answers);
   const safeNotes=sanitizeBpsClinicianNotes(review.clinician_notes);
   return {
    id:review.id,source_version:review.source_version,source_status:review.source_status,
    source_updated_at:review.source_updated_at,created_at:review.created_at,
    reviewed:review.reviewed===true,clinical_answers:clean.answers,clinician_notes:safeNotes.notes,
    excluded_clinical_fields:clean.excludedCount,excluded_clinician_notes:safeNotes.excludedCount
   };
  });
  return reply({patientId:id,linked:true,source:{accountId:source.patient.account_id,status:source.intake.status,version:source.intake.version,
    updatedAt:source.intake.updated_at,submittedAt:source.intake.submitted_at??null},...report,reviews:safeReviews});
 // Never echo database/provider exception messages: they may include patient identifiers, clinical JSON or internal SQL details.
 }catch{return reply({error:'Protected BPS intake unavailable; reopen the chart and try again.'},503);}
}
export async function POST(request:Request){
 const ctx=await emrAccess();
 if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);
 try{
  const raw=await request.text();if(Buffer.byteLength(raw)>35000)return reply({error:'BPS review request too large.'},413);
  // Never reflect parser exception text: malformed requests may contain PHI.
  let body:Record<string,unknown>;
  try{body=JSON.parse(raw) as Record<string,unknown>;}
  catch{return reply({error:'Invalid BPS review JSON payload.'},400);}
  if(!body||!uuid(body.patientId)||!uuid(body.sourceAccountId)||body.reviewed!==true||!Number.isSafeInteger(body.sourceVersion)||
    typeof body.sourceVersion!=='number'||body.sourceVersion<1||
    (body.sourceStatus!=='draft'&&body.sourceStatus!=='submitted')||
    !validBpsTimestamp(body.sourceUpdatedAt))
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
 }catch{return reply({error:'BPS review processing failed; reopen chart history before retrying.'},503);}
}
