import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {bpsNoteDomains,mapIntakeToBps,sanitizeBpsClinicianNotes,sanitizeBpsSnapshotAnswers,validBpsTimestamp,validBpsSubmissionChronology,validBpsReviewChronology,validBpsHistoricalSourceBoundary,recognizedBpsQuestionnaireVersion,bpsTimestampInstantNanoseconds,equalBpsTimestampInstants,hasIndependentBpsReviewNote} from '@/lib/emr/intake-bps';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:privateHeaders});
const sourceFields='patient_id,answers,status,version,updated_at,submitted_at';
const maxBpsReviewBytes=35_000;
/** Bound the clinical POST body before materializing it. A Content-Length header
 * is only an early hint; chunked or dishonest clients must meet the same limit.
 * Never include rejected patient-supplied bytes in a response or log.
 */
async function limitedBpsReviewBody(request:Request):Promise<string|null|undefined>{
 const declared=request.headers.get('content-length');
 if(declared!==null&&/^[0-9]+$/.test(declared)&&Number(declared)>maxBpsReviewBytes)return null;
 if(!request.body)return '';
 const reader=request.body.getReader();
 const chunks:Uint8Array[]=[];
 let bytes=0;
 try{
  while(true){
   const {value,done}=await reader.read();
   if(done)break;
   bytes+=value.byteLength;
   if(bytes>maxBpsReviewBytes){
    await reader.cancel().catch(()=>undefined);
    return null;
   }
   chunks.push(value);
  }
  // Buffer.toString silently replaces invalid UTF-8 with U+FFFD, rewriting
  // clinical observations while still reporting a successful saved attestation.
  // Reject malformed wire bytes without echoing the rejected source.
  try{return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));}
  catch{return undefined;}
 }finally{reader.releaseLock();}
}
/** JSON can carry NUL and unmatched UTF-16 surrogates even after the wire
 * bytes pass strict UTF-8 decoding. PostgreSQL rejects NUL and downstream JSON
 * encoders may replace lone surrogates, changing a clinician's attested note.
 * Reject both before an append-only clinical save; valid emoji pairs remain safe.
 */
const invalidClinicalNoteText=(value:string):boolean=>
 value.includes('\u0000')||Array.from(value).some(char=>
  char.length===1&&char.charCodeAt(0)>=0xD800&&char.charCodeAt(0)<=0xDFFF);
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
  // Freeze the response's answer set before asynchronous history reads.
  // An out-of-band edit can alter answers without advancing source metadata.
  // Metadata-only rereads must not certify stale clinical source text.
  const originalAnswers={...(source.intake.answers as Record<string,string>)};
  const report=mapIntakeToBps(originalAnswers);
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
  const stableAnswers='code' in stable?null:stable.intake.answers as Record<string,string>;
  const originalAnswerKeys=Object.keys(originalAnswers);
  const answersUnchanged=!!stableAnswers&&Object.keys(stableAnswers).length===originalAnswerKeys.length&&
   originalAnswerKeys.every(key=>Object.prototype.hasOwnProperty.call(stableAnswers,key)&&
    stableAnswers[key]===originalAnswers[key]);
  if(!answersUnchanged||'code' in stable||stable.patient.account_id!==source.patient.account_id||
    stable.intake.patient_id!==source.intake.patient_id||
    stable.intake.version!==source.intake.version||
    stable.intake.status!==source.intake.status||
    !equalBpsTimestampInstants(stable.intake.updated_at,source.intake.updated_at)||
    (source.intake.submitted_at==null?stable.intake.submitted_at!=null:
      !equalBpsTimestampInstants(stable.intake.submitted_at,source.intake.submitted_at)))
   return reply({error:'Linked intake or central patient association changed during clinical history retrieval; reopen the chart.'},409);
  // The clinical history count can change after the final page but before
  // the source is revalidated. Check the exact count and newest row again.
  // Otherwise an append-only clinician review may be omitted even though the
  // linked intake and account are unchanged, inviting an obsolete review.
  const {data:latest,error:latestError,count:latestCount}=await ctx.supabase
   .from('emr_bps_intake_reviews')
   .select('id,patient_id,source_account_id,created_at',{count:'exact'})
   .eq('patient_id',id).eq('source_account_id',source.patient.account_id)
   .order('created_at',{ascending:false}).order('id',{ascending:false}).range(0,0);
  if(latestError||!Array.isArray(latest)||latestCount!==expectedReviewCount||
   latest.length!==(expectedReviewCount===0?0:1)||
   (expectedReviewCount>0&&(
    !latest[0]||!uuid(latest[0].id)||
    latest[0].id.toLowerCase()!==reviews[0].id.toLowerCase()||
    latest[0].patient_id!==id||
    latest[0].source_account_id!==source.patient.account_id||
    !equalBpsTimestampInstants(latest[0].created_at,reviews[0].created_at))))
   return reply({error:'BPS clinical review history changed after retrieval; reopen the chart for a complete source-verified history.'},409);
  // Original seven-page BPS forms need a live source/attestation indicator,
  // not a second copy of questionnaire or clinician-note PHI. This read-only
  // summary passes through all the same chart/link/history stability checks
  // above but returns only source provenance and current-revision review state.
  if(new URL(request.url).searchParams.get('summary')==='1'){
   const currentVersionReviewed=reviews.some(review=>
    // A historical checkbox-only row is not an independently documented review.
    // Match the full clinician review's note allowlist and substantive-text gate
    // so all seven original BPS pages cannot display a false reviewed status.
    review.reviewed===true&&
    // A partially withheld historical clinician note is not independently
    // verifiable as a complete clinical review, even if another note is legible.
    sanitizeBpsClinicianNotes(review.clinician_notes).excludedCount===0&&
    hasIndependentBpsReviewNote(sanitizeBpsClinicianNotes(review.clinician_notes).notes)&&
    review.source_version===source.intake.version&&
    review.source_status===source.intake.status&&
    equalBpsTimestampInstants(review.source_updated_at,source.intake.updated_at));
   return reply({patientId:id,source:{
    status:source.intake.status,version:source.intake.version,
    updatedAt:source.intake.updated_at,submittedAt:source.intake.submitted_at??null,
    questionnairePacketVersion:originalAnswers.legal_packet_version||null
   },currentVersionReviewed});
  }
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
    updatedAt:source.intake.updated_at,submittedAt:source.intake.submitted_at??null,
    // Patient questionnaire layout version is distinct from the editable source revision.
    // A missing historical marker must remain unrecorded rather than be inferred.
    questionnairePacketVersion:originalAnswers.legal_packet_version||null},...report,reviews:safeReviews});
 // Never echo database/provider exception messages: they may include patient identifiers, clinical JSON or internal SQL details.
 }catch{return reply({error:'Protected BPS intake unavailable; reopen the chart and try again.'},503);}
}
export async function POST(request:Request){
 const ctx=await emrAccess();
 if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);
 try{
  const raw=await limitedBpsReviewBody(request);
  if(raw===null)return reply({error:'BPS review request too large.'},413);
  if(raw===undefined)return reply({error:'Invalid BPS review text encoding.'},400);
  // Never reflect parser exception text: malformed requests may contain PHI.
  let body:Record<string,unknown>;
  try{body=JSON.parse(raw) as Record<string,unknown>;}
  catch{return reply({error:'Invalid BPS review JSON payload.'},400);}
  if(!body||!uuid(body.patientId)||!uuid(body.sourceAccountId)||body.reviewed!==true||!Number.isSafeInteger(body.sourceVersion)||
    typeof body.sourceVersion!=='number'||body.sourceVersion<1||
    (body.sourceStatus!=='draft'&&body.sourceStatus!=='submitted')||
    !validBpsTimestamp(body.sourceUpdatedAt)||
    // Bind clinical attestation to the exact patient submission receipt.
    (body.sourceStatus==='submitted'?!validBpsTimestamp(body.sourceSubmittedAt):body.sourceSubmittedAt!==null))
   return reply({error:'Valid linked patient, source version and explicit clinical review required.'},400);
  if(!body.notes||typeof body.notes!=='object'||Array.isArray(body.notes))return reply({error:'Clinical notes are required.'},400);
  const fields=Object.keys(bpsNoteDomains);
  if(Object.keys(body.notes).some(key=>!fields.includes(key)))return reply({error:'Unsupported BPS notes field.'},400);
  const notes:Record<string,string>={};
  for(const key of fields){
   // Missing optional domains default to empty, but an explicitly supplied null
   // is invalid: never silently erase an attested clinician note.
   const value=Object.prototype.hasOwnProperty.call(body.notes,key)?
    (body.notes as Record<string,unknown>)[key]:'';
   if(typeof value!=='string'||value.length>4000||invalidClinicalNoteText(value))
    return reply({error:'Clinical notes must contain valid Unicode text without NUL characters, at most 4,000 characters each.'},400);
   // Preserve the clinician's exact entered text, including line breaks and
   // intentional leading/trailing whitespace; validation must not rewrite it.
   notes[key]=value;
  }
  // An empty note set is not evidence of an independently documented clinician review.
  // Reject before the privileged RPC so a checkbox-only request cannot create a
  // permanent, source-version-locked clinical attestation.
  if(!hasIndependentBpsReviewNote(notes))
   return reply({error:'Document at least one independent clinician observation or follow-up need before saving the reviewed BPS history.'},400);
  // The database RPC remains the atomic authority for a version-locked save.
  // Independently inspect the live linked patient and complete questionnaire
  // before calling it: unresolved/unknown patient-reported fields cannot be
  // silently omitted from a clinician's final source-version attestation.
  // The UI may display these as read-only source warnings, but not approve them.
  const live=await linkedSource(ctx.supabase,body.patientId as string);
  if('code' in live)return reply({error:live.error},live.code);
  if(live.patient.account_id!==body.sourceAccountId||
   live.intake.version!==body.sourceVersion||
   live.intake.status!==body.sourceStatus||
   !equalBpsTimestampInstants(live.intake.updated_at,body.sourceUpdatedAt)||
   // A submission receipt can change without a source version/edit-time change.
   // Never attest to a source different from the clinician-opened submission.
   (body.sourceStatus==='submitted'?
    !equalBpsTimestampInstants(live.intake.submitted_at,body.sourceSubmittedAt):
    live.intake.submitted_at!==null))
   return reply({error:'Linked BPS source changed; reopen the patient chart before clinical review.'},409);
  if(mapIntakeToBps(live.intake.answers as Record<string,string>).unmappedKeys.length>0)
   return reply({error:'Linked intake includes unrecognized reported fields; reconcile the protected original intake before clinician BPS review.'},409);
  const {data,error}=await ctx.supabase.rpc('save_emr_bps_intake_review',{p_payload:{
   patient_id:body.patientId,source_account_id:body.sourceAccountId,source_version:body.sourceVersion,source_status:body.sourceStatus,
   source_updated_at:body.sourceUpdatedAt,source_submitted_at:body.sourceSubmittedAt,
   // The RPC checks these exact live answers under the patient intake row lock;
   // version, status and timestamps alone do not prevent out-of-band edits.
   source_answers:live.intake.answers,reviewed:true,clinician_notes:notes
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
