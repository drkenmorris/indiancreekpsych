'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {bpsSectionClassification,approvedBpsQuestionSection,validBpsQuestionnaireTopology,bpsNoteDomains,emptyBpsNotes,mapSavedBpsReportedFields,bpsVisibleSourceKeys,sanitizeBpsClinicianNotes,validBpsTimestamp,bpsTimestampInstantNanoseconds,equalBpsTimestampInstants,validBpsSubmissionChronology,validBpsReviewChronology,validBpsHistoricalSourceBoundary,hasIndependentBpsReviewNote,type BpsNotes} from '@/lib/emr/intake-bps';
type Field={key:string;label:string;type:string;value:string;sourceOnly?:boolean;reported?:boolean};
type Section={title:string;domain:string;disposition:'clinical'|'separate-review'|'reference';fields:Field[];answered:number};
type Review={id:string;reviewed:boolean;source_version:number;source_status:string;source_updated_at:string;created_at:string;clinical_answers:Record<string,string>;clinician_notes:BpsNotes;excluded_clinical_fields?:number;withheld_protected_fields?:number;excluded_clinician_notes?:number;current_source_snapshot_verified?:boolean|null;clinician_note_domains_complete?:boolean};
type ResponseData={patientId:string;source:{accountId:string;status:string;version:number;updatedAt:string;submittedAt?:string|null;questionnairePacketVersion?:string|null};sections:Section[];unmappedKeys:string[];reviews:Review[]};
const focusedReviewLinks:Record<string,{label:string;anchor:string}[]>={
 'Mental health treatment history':[
  {label:'Review reported counseling and psychiatric treatment history in the central chart',anchor:'emr-intake-treatment-history-review'}],
 'Medications':[
  {label:'Review reported medications in the central chart',anchor:'emr-intake-medication-review'},
  {label:'Review reported medication allergies in the central chart',anchor:'emr-intake-allergy-review'}],
 'Medical & Substance Use History':[
  {label:'Review medical and substance-use history in the central chart',anchor:'emr-intake-medical-review'}],
 'Trauma, family, social, educational, and occupational history':[
  {label:'Review structured trauma history in the central chart',anchor:'emr-intake-trauma-review'}]
};
const protectedSourceTypes=new Set(['treatment-history','medications','medical-substance','trauma-history','legal-routing','dsm-version']);
const readable=(field:Field,disposition:Section['disposition'])=>
 // Only explicit patient-reported values may appear as clinical BPS source context.
 // An allowed key or upstream sourceOnly:false flag alone is not evidence of a patient response.
 disposition!=='clinical'||field.reported!==true||field.sourceOnly!==false||!bpsVisibleSourceKeys.has(field.key)||protectedSourceTypes.has(field.type)?
 'Structured questionnaire: use the protected original intake or the dedicated reconciliation module; raw content is not automatically imported.':field.value;
// A historical reviewed flag alone is not proof that a clinician documented
// an independent observation. Legacy checkbox-only rows remain immutable and
// visible, but must not be counted as documented clinical review.
const documentedClinicianReview=(review:Review):boolean=>
 review.reviewed===true&&
 // An independently entered clinical note does not certify a current-source
 // snapshot that omits/changes patient answers. Keep the append-only record
 // visible and its version locked, but do not count it as a documented,
 // source-verified clinical review. Null denotes older unverifiable revisions.
 // Only an affirmative CURRENT patient-source snapshot verification and
 // submitted patient attestation can count toward documented completed reviews.
 // Historical null/missing proofs and provisional draft notes remain visible
 // in append-only history but must not increase the verified review count.
 review.current_source_snapshot_verified===true&&review.source_status==='submitted'&&
 // The stored shape must be verified BEFORE sanitation backfills missing note
 // categories; the seven safe display slots alone cannot prove completion.
 review.clinician_note_domains_complete===true&&
 // The original seven BPS pages and their source-verified summary require a
 // complete seven-domain clinician note payload. A legacy single-note row can
 // contain substantive observations but cannot certify all seven pages.
 review.clinician_notes!==null&&typeof review.clinician_notes==='object'&&
 !Array.isArray(review.clinician_notes)&&
 Object.keys(review.clinician_notes).length===Object.keys(bpsNoteDomains).length&&
 (review.excluded_clinician_notes??0)===0&&
 sanitizeBpsClinicianNotes(review.clinician_notes).excludedCount===0&&
 hasIndependentBpsReviewNote(sanitizeBpsClinicianNotes(review.clinician_notes).notes);
async function json(response:Response){const data=await response.json();if(!response.ok)throw Error(data.error||'Protected BPS request failed.');return data;}
export default function PatientBpsIntakeReview({patientId:requestedPatientId}:{patientId:string}){
 // PostgreSQL and the protected GET route normalize UUIDs to lowercase. Keep
 // every local chart scope, save lock and API readback on that same identity so
 // a mixed-case central-chart URL cannot hide a correctly linked patient.
 const patientId=requestedPatientId.toLowerCase();
 const [data,setData]=useState<ResponseData|null>(null),[error,setError]=useState(''),[status,setStatus]=useState(''),
 [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[prepared,setPrepared]=useState(false),
 [notes,setNotes]=useState<BpsNotes>(emptyBpsNotes),[reviewed,setReviewed]=useState(false),
 [acknowledgedVersion,setAcknowledgedVersion]=useState<number|null>(null),
 [uncertainVersion,setUncertainVersion]=useState<number|null>(null);
 // A save may finish after the clinician switches patients. Never allow its result
 // to update a different chart (including A → B → A navigation).
 // Prevent a background intake refresh from changing a clinician's source-version
 // context during preparation, an uncertain transmitted save, or chart-history verification.
 // A duplicate submit event must not create a second clinical review RPC before
 // React renders the saving state; only one source-version write may be in flight.
 const reviewSaveInFlight=useRef(false);
 const reviewInProgress=useRef(false);
 reviewInProgress.current=prepared||saving||uncertainVersion!==null||acknowledgedVersion!==null;
 const chartScope=useRef({patientId,generation:0});
 // The database allows only one append-only review per clinician, central chart and
 // source version. Show that invariant before another submit, and keep it enforced
 // locally after an acknowledged save even if the read-back request fails.
 const sourceVersionHasUnverifiedReview=!!data&&data.reviews.some(review=>review.source_version===data.source.version&&!documentedClinicianReview(review));
 const versionAlreadyReviewed=!!data&&(data.reviews.some(review=>review.source_version===data.source.version)||
   acknowledgedVersion===data.source.version||uncertainVersion===data.source.version);
 // A lost POST response does not prove the database rejected the write. Keep
 // that source version locked locally until the clinician reopens chart history.
 const uncertainSave=!!data&&uncertainVersion===data.source.version&&
  acknowledgedVersion!==data.source.version&&
  !data.reviews.some(review=>review.source_version===data.source.version);
 async function load(id:string){
  const value=await json(await fetch('/api/emr/bps-intake?patient='+encodeURIComponent(id),{cache:'no-store'}));
  if(value.patientId!==id||!Array.isArray(value.sections)||value.sections.length!==21)throw Error('BPS source did not match the selected chart.');
  // The clinician review is an independent PHI and attestation boundary, not just
  // a copy of the original BPS preview. Never render answers or enable review
  // when a malformed/stale API response lacks verified linked source metadata.
  const source=value.source;
  if(!source||typeof source.accountId!=='string'||
   !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(source.accountId)||
   (source.status!=='draft'&&source.status!=='submitted')||
   !Number.isSafeInteger(source.version)||source.version<1||
   // A stale or malformed protected API must never present a submitted
   // packet edited after its attestation as immutable clinician source.
   !validBpsSubmissionChronology(source.status,source.updatedAt,source.submittedAt)||
   // Never trust a malformed or future questionnaire layout marker even when
   // the source revision and timestamps appear valid.
   (source.questionnairePacketVersion!=null&&source.questionnairePacketVersion!=='2026-10-11'&&
    source.questionnairePacketVersion!=='2026-11-02-directory-1')||
   !Array.isArray(value.reviews)||!Array.isArray(value.unmappedKeys))
   throw Error('Linked patient intake provenance or clinical review history could not be verified. Reopen the protected source.');
  // A correct patient ID does not make a malformed 21-section source safe to
  // render. Reject an incomplete or incorrectly typed section before mapping
  // any patient-reported statements into the clinician review interface.
  // This is independent of the API contract and leaves original BPS forms intact.
  const seenSectionTitles=new Set<string>();
  // A question may not be attributed to more than one clinical section.
  // Withhold the entire source if a stale API repeats an identity across sections.
  const seenFieldKeys=new Set<string>();
  const validSections=value.sections.every((entry:unknown)=>{
   if(!entry||typeof entry!=='object'||Array.isArray(entry))return false;
   const section=entry as Partial<Section>;
   // Twenty entries can be repeated and still masquerade as a 21-section
   // clinical audit. Withhold patient data and review controls if titles repeat.
   // Independent field-level and separate-review privacy gates remain active.
   if(typeof section.title!=='string'||!section.title||seenSectionTitles.has(section.title))return false;
   seenSectionTitles.add(section.title);
   // A known clinical, legal, coverage or separately reconciled section must
   // retain BOTH its approved route and clinical-domain label. A stale or
   // malformed API must not reattribute a patient report to another domain,
   // including when the disposition alone happens to remain plausible.
   const approvedSection=bpsSectionClassification[section.title];
   // All 21 titles must be from a known intake layout. Previously an unknown
   // title skipped the domain/disposition and question-section checks, allowing
   // a stale or malformed API response to display approved clinical keys under
   // a fabricated source category and potentially enable a clinician review.
   if(!approvedSection||section.disposition!==approvedSection.disposition||
      section.domain!==approvedSection.domain)return false;
   // Repeated source field identities can conceal a missing question or
   // conflicting patient reports despite a nominally complete 21-section audit.

   return typeof section.domain==='string'&&section.domain.length>0&&
    (section.disposition==='clinical'||section.disposition==='separate-review'||section.disposition==='reference')&&
    Number.isSafeInteger(section.answered)&&Number(section.answered)>=0&&
    Array.isArray(section.fields)&&Number(section.answered)<=section.fields.length&&section.fields.every((candidate:unknown)=>{
     if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))return false;
     const field=candidate as Partial<Field>;
     if(typeof field.key!=='string'||!field.key||seenFieldKeys.has(field.key))return false;
     seenFieldKeys.add(field.key);
     // The field itself must belong to the approved question section. A
     // malformed 21-section response must not turn a presenting-concern
     // answer into a safety finding or a legal/medication section answer.
     if(approvedSection&&!approvedBpsQuestionSection(section.title!,field.key))return false;
     // Match the original seven-page BPS trust boundary: even correctly
     // attributed protected medication, trauma, medical or legal responses
     // must carry an explicit source-only marker. Withhold the whole packet
     // rather than permitting an attestation of contradictory PHI routing.
     // A sourceOnly marker does not authorize the API to send raw protected
     // PHI in the field value. Require the exact opaque placeholder produced
     // by the server for all withheld reports, even if a stale adapter retains
     // a correct disposition or type tag. Unknown/new keys remain withheld.
     const mustRemainProtected=section.disposition!=='clinical'||
      protectedSourceTypes.has(field.type??'')||!bpsVisibleSourceKeys.has(field.key);
     if(field.sourceOnly===true&&
      (field.reported!==true||
       field.value!=='Recorded in protected source; not copied into BPS.'))return false;
     if(field.reported===true&&mustRemainProtected&&field.sourceOnly!==true)return false;
     // Labels are patient-source attribution, never clinician-authored findings.
     // Reject visual line breaks, bidirectional controls and oversized labels
     // rather than rendering forged clinical headings from a malformed source.
     if(typeof field.label!=='string'||!field.label.trim()||field.label.length>200||
      /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u.test(field.label))return false;
     return typeof field.key==='string'&&field.key.length>0&&
      typeof field.label==='string'&&typeof field.type==='string'&&
      typeof field.value==='string'&&
      (field.reported===undefined||typeof field.reported==='boolean')&&
      (field.sourceOnly===undefined||typeof field.sourceOnly==='boolean');
    });
  });
  // The server counts only explicitly patient-reported answers. A stale or
  // malformed API must not say "No response recorded" while also displaying a
  // positive patient statement, or understate how many source fields need review.
  // Legacy empty-field fixtures have no reported flags; whenever flags are
  // supplied, require them for every field and verify the exact count.
  const accurateReportedCounts=validSections&&value.sections.every((entry:Section)=>{
   const tagged=entry.fields.filter(field=>field.reported!==undefined);
   // Older blank-source fixtures may omit reported flags, but a source that
   // explicitly marks a field renderable cannot claim a patient answer without
   // an equally explicit patient-reported flag. Do not show contradictory
   // answered totals or permit clinician review of such a packet.
   return tagged.length===0?
    !(entry.answered>0&&entry.fields.some(field=>field.sourceOnly===false)):
    // A field cannot count as patient-reported when its source value is
     // empty or whitespace. Fail closed rather than inflating intake completeness.
     tagged.length===entry.fields.length&&
     tagged.filter(field=>field.reported===true).length===entry.answered&&
     tagged.every(field=>{
      // A stale adapter cannot claim an absent patient response while carrying
      // nonblank text, or omit/reverse the exact protected-source routing flag.
      // Otherwise the reviewed 21-section count could conceal source content
      // and later attest an incomplete clinical interpretation.
      const protectedAnswer=field.reported===true&&
       (entry.disposition!=='clinical'||protectedSourceTypes.has(field.type)||
        !bpsVisibleSourceKeys.has(field.key));
      return field.sourceOnly===protectedAnswer&&
       (field.reported===true?field.value.trim().length>0:field.value.trim().length===0);
     });
  });
  if(!validSections||!accurateReportedCounts||
   !value.unmappedKeys.every((key:unknown)=>typeof key==='string'))
   throw Error('Linked 21-section intake mapping is malformed; patient statements are withheld. Reopen the protected source.');
  // Source packet version and section identities must agree at the actual
  // clinician review screen, not only at the original BPS read-only panel.
  // A 21-section result can otherwise swap the historical communications
  // section for the newer legal-directory section while preserving every
  // individual field's approved domain. Reject that packet before presenting
  // patient statements or permitting an append-only clinician attestation.
  const directoryPacket=source.questionnairePacketVersion==='2026-11-02-directory-1';
  const hasDirectory=seenSectionTitles.has('Legal forms directory and questionnaire');
  const hasCommunications=seenSectionTitles.has('Communication and confidential-contact preferences');
  if(directoryPacket?(!hasDirectory||hasCommunications):(!hasCommunications||hasDirectory))
   throw Error('Linked 21-section intake layout does not match its questionnaire version; patient statements are withheld. Reopen the protected source.');
  // A nominal 21/21 section audit is not complete if a source adapter omits
  // unanswered questions, relabels them, swaps their types, or injects
  // unsanctioned legacy entries. Keep all statements and save controls hidden.
  if(!validBpsQuestionnaireTopology(value.sections,source.questionnairePacketVersion??''))
   throw Error('Linked 21-section intake question inventory does not match its approved questionnaire version; patient statements are withheld. Reopen the protected source.');
  // The protected API validates historical attestation provenance. Repeat the
  // identity/version/date checks at this UI trust boundary so a malformed,
  // stale or cross-chart history response cannot be displayed as clinical truth.
  // Never silently discard a bad history row and imply that review never existed.
  const seenHistoryIds=new Set<string>();
  let previousHistoryInstant:bigint|null=null,previousHistoryId='';
  const validHistory=value.reviews.every((entry:unknown)=>{
   if(!entry||typeof entry!=='object'||Array.isArray(entry))return false;
   const review=entry as Partial<Review>;
   const id=typeof review.id==='string'?review.id.toLowerCase():'';
   const instant=bpsTimestampInstantNanoseconds(review.created_at);
   // Repeat the API's verified descending (created_at, id) ordering check
   // at the clinician UI boundary. A stale/malformed API response must not
   // duplicate or reorder append-only clinical history while appearing complete.
   if(!id||instant===null||seenHistoryIds.has(id)||
    (previousHistoryInstant!==null&&(instant>previousHistoryInstant||
     (instant===previousHistoryInstant&&id>=previousHistoryId))))return false;
   seenHistoryIds.add(id);previousHistoryInstant=instant;previousHistoryId=id;
   return typeof review.id==='string'&&typeof review.reviewed==='boolean'&&
    /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(review.id)&&
    Number.isSafeInteger(review.source_version)&&Number(review.source_version)>=1&&
    (review.source_status==='draft'||review.source_status==='submitted')&&
    validBpsTimestamp(review.source_updated_at)&&validBpsTimestamp(review.created_at)&&
    validBpsReviewChronology(review.source_updated_at,review.created_at,
      review.source_version===source.version&&review.source_status==='submitted'
       ?source.submittedAt:undefined)&&
    validBpsHistoricalSourceBoundary(review.source_version,review.source_status,review.source_updated_at,
     source.version,source.status,source.updatedAt)&&
    !!review.clinical_answers&&typeof review.clinical_answers==='object'&&!Array.isArray(review.clinical_answers)&&
    !!review.clinician_notes&&typeof review.clinician_notes==='object'&&!Array.isArray(review.clinician_notes)&&
    // These counts are safety disclosures: malformed/negative values could
    // suppress the warning that historical PHI was withheld from this view.
    (review.excluded_clinical_fields===undefined||
     (Number.isSafeInteger(review.excluded_clinical_fields)&&review.excluded_clinical_fields>=0))&&
    (review.withheld_protected_fields===undefined||
     (Number.isSafeInteger(review.withheld_protected_fields)&&review.withheld_protected_fields>=0&&
      review.withheld_protected_fields<=(review.excluded_clinical_fields??0)))&&
    (review.excluded_clinician_notes===undefined||
     (Number.isSafeInteger(review.excluded_clinician_notes)&&review.excluded_clinician_notes>=0));
  });
  if(!validHistory)throw Error('Linked patient clinical review history has invalid saved-row provenance; answers are withheld. Reopen the chart and investigate.');
  return value as ResponseData;
 }
 useEffect(()=>{let active=true;
  if(chartScope.current.patientId!==patientId)chartScope.current={patientId,generation:chartScope.current.generation+1};
  setData(null);setError('');setStatus('');setLoading(true);setPrepared(false);setSaving(false);
  setReviewed(false);setNotes(emptyBpsNotes());setAcknowledgedVersion(null);setUncertainVersion(null);
  reviewInProgress.current=false;
  let pending=false;
  async function refresh(){
   if(pending||reviewInProgress.current)return;
   pending=true;
   try{
    const value=await load(patientId);
    if(active&&!reviewInProgress.current){setData(value);setError('');}
   }catch(e){
    // A failed validation must remove old PHI rather than leave a stale, apparently
    // current linked intake on screen. The original BPS remains independently usable.
    if(active&&!reviewInProgress.current){setData(null);setError(e instanceof Error?e.message:'BPS intake unavailable.');}
   }finally{pending=false;if(active)setLoading(false);}
  }
  void refresh();
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh();},5000);
  const onFocus=()=>{void refresh();};
  window.addEventListener('focus',onFocus);
  return ()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',onFocus);};
 },[patientId]);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(reviewSaveInFlight.current||!data||data.patientId!==patientId||!reviewed||saving||!prepared||versionAlreadyReviewed||data.unmappedKeys.length>0||!hasIndependentBpsReviewNote(notes))return;
  reviewSaveInFlight.current=true;
  // Preserve the exact independently entered clinician note text sent for attestation.
  // An ID/metadata match must not certify a different note returned by chart history.
  const submittedNotes={...notes};
  const generation=chartScope.current.generation;
  const stillOnChart=()=>chartScope.current.patientId===patientId&&chartScope.current.generation===generation;
  setSaving(true);setStatus('');
  // The request may commit even if the response is lost. Never permit a blind
  // same-version retry after any transmitted submission with uncertain outcome.
  setUncertainVersion(data.source.version);
  try{
   const result=await json(await fetch('/api/emr/bps-intake',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({patientId,sourceAccountId:data.source.accountId,sourceVersion:data.source.version,sourceStatus:data.source.status,
     sourceUpdatedAt:data.source.updatedAt,sourceSubmittedAt:data.source.submittedAt??null,notes:submittedNotes,reviewed:true})}));
   if(!stillOnChart())return;
   if(result?.saved!==true||typeof result.id!=='string'||
    !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(result.id))
    throw Error('BPS save response lacks a valid database acknowledgment and review ID.');
   // The database has acknowledged this append-only write. A subsequent read failure
   // must never be described as an unsaved review or invite a duplicate save.
   setAcknowledgedVersion(data.source.version);
   setUncertainVersion(null);
   setPrepared(false);setReviewed(false);setNotes(emptyBpsNotes());
   setStatus('BPS save acknowledged; verifying the saved review ID and source provenance against this patient chart history. Do not submit again.');
   try{
    const next=await load(patientId);
    if(stillOnChart()){
     // A successful write receipt alone does not prove the new review is readable
     // under the same chart, source status, version and timestamp. Do not report
     // clinician-history readback as verified until the exact saved row is present.
     // A source can change or its chart can be relinked between the initial
     // intake GET, the save RPC and this history GET. An old review matching
     // its original version is NOT verification of the currently linked source.
     const sameSource=next.source.accountId===data.source.accountId&&
      next.source.version===data.source.version&&next.source.status===data.source.status&&
      // A packet-layout switch without a source revision increment must never
      // independently verify the earlier clinician's questionnaire review.
      next.source.questionnairePacketVersion===data.source.questionnairePacketVersion&&
      equalBpsTimestampInstants(next.source.updatedAt,data.source.updatedAt)&&
      // The patient's actual submission attestation is part of the immutable
      // source receipt. A changed receipt must not verify an earlier clinician
      // review even when account, status, version and edit timestamp agree.
      (data.source.submittedAt==null?next.source.submittedAt==null:
       equalBpsTimestampInstants(next.source.submittedAt,data.source.submittedAt));
     // Retain the acknowledged old version and its duplicate-save lock if the
     // linked source changed mid-flight. Reopening the chart is required.
     if(sameSource)setData(next);
     const verified=sameSource&&typeof result.id==='string'&&next.reviews.some(review=>
      review.id.toLowerCase()===result.id.toLowerCase()&&review.reviewed===true&&review.source_version===data.source.version&&
      // The database receipt and reviewed flag do not constitute a genuine
      // documented clinical review if the independently read history row has
      // blank, invisible-only, or malformed clinician notes.
      review.source_status===data.source.status&&
      // A matching ID, notes and source timestamp are not affirmative proof
      // that the DB-owned patient-answer snapshot survived unchanged. A missing
      // or null verification flag is NOT success, even in a stale API reply.
      review.current_source_snapshot_verified===true&&documentedClinicianReview(review)&&
      // Matching review ID and provenance alone do not prove that the clinician's
      // submitted narrative survived persistence unchanged. Check every approved
      // note domain, including intentionally blank domains; a new save cannot
      // be certified if additional unknown/malformed stored notes were withheld.
      (review.excluded_clinician_notes??0)===0&&
      (Object.keys(bpsNoteDomains) as (keyof BpsNotes)[]).every(key=>
       review.clinician_notes[key]===submittedNotes[key])&&
      equalBpsTimestampInstants(review.source_updated_at,data.source.updatedAt));
     if(verified)setStatus('Clinician-reviewed, unsigned BPS intake snapshot saved AND independently verified in the protected chart history. Patient statements remain patient-reported; no diagnosis, authorization, or signature was created.');
     else if(!sameSource)setStatus('BPS save was acknowledged, but the linked intake source changed during chart-history verification (account, questionnaire packet, source revision, status or timestamp). This source is NOT independently verified. Reopen the chart and reconcile the new intake before further review; do not resubmit the prior version.');
     else setStatus('BPS save was acknowledged, but the exact saved review, clinician note text and source provenance were NOT verified in chart history. Reopen this chart and investigate before relying on the new review; do not submit it again.');
    }
   }catch(e){
    if(stillOnChart()){
     // Source/review provenance can become inconsistent between a successful
     // write receipt and readback. Do not expose the bad history or describe
     // it as a successful verification, while retaining the version save lock.
     const mismatchedHistory=e instanceof Error&&e.message.includes('invalid saved-row provenance');
     setStatus(mismatchedHistory?
      'BPS save was acknowledged, but the linked intake source changed during chart-history verification or saved history no longer matches its source. The exact clinician review was NOT independently verified. Reopen this chart and investigate; do not submit it again.':
      'BPS save was acknowledged by the database, but the exact clinician review was NOT verified in chart history because the readback failed. Reopen this patient chart and investigate; do not submit it again.');
    }
   }
  }catch(e){if(stillOnChart())setStatus((e instanceof Error?e.message:'BPS intake save was not confirmed.')+
   ' The outcome of this submission is unknown; no clinical save is claimed. Reopen this chart and inspect protected review history before considering another submission.');}
  finally{reviewSaveInFlight.current=false;if(stillOnChart())setSaving(false);}
 }
 return <article className="centralCard" aria-label="Intake biopsychosocial reconciliation">
  <h2>Biopsychosocial assessment — 21-section intake reconciliation</h2>
  <p>Review the exact linked website patient's patient-reported intake. Clinical history is not an independently verified fact, diagnosis, signed assessment or risk clearance. Legal consent decisions and insurance remain in their own records. Medication, allergy, substance-use and structured trauma entries require their existing dedicated reconciliation modules.</p>
  {loading?<p role="status">Checking protected BPS intake…</p>:error?<p role="alert">{error}</p>:data?.patientId===patientId&&<>
   <p>Source: <strong>{data.source.status==='submitted'?'Submitted intake (immutable source)':'Draft intake (may change)'}</strong> · Version {data.source.version} · Last updated {new Date(data.source.updatedAt).toLocaleString()}</p>
   <p>Questionnaire packet provenance: <strong>{data.source.questionnairePacketVersion??'Not recorded for historical intake'}</strong>. This identifies the question layout, separately from patient intake revision {data.source.version}.</p>
   {data.source.status==='submitted'&&data.source.submittedAt&&<p>Patient submission attested: <time dateTime={data.source.submittedAt}>{new Date(data.source.submittedAt).toLocaleString()}</time>. This is a patient submission receipt, not a clinician signature.</p>}
   {data.source.status==='draft'&&<p role="status">This intake remains unsubmitted and lacks a patient submission attestation. Review it only as changeable draft source context.</p>}
   <p>Saved patient-reported source answers refresh when this chart is idle and visible. Preparing a clinician review freezes the opened source version; discard and reopen if the patient's intake changes.</p>
   <p>Sections audited: {data.sections.length}/21 · Documented clinician reviews: {data.reviews.filter(documentedClinicianReview).length}. {data.reviews.some(review=>!documentedClinicianReview(review))&&'Some saved history records lack confirmed clinician-review attestation or independent clinical documentation; investigate provenance. Current-source clinical snapshot mismatches are also unverified.'}</p>
   {data.unmappedKeys.length>0&&<p role="alert">The source contains {data.unmappedKeys.length} additional historical or unrecognized field(s) were recorded. Their raw field names are withheld from this BPS view. These are NOT silently transferred. Review the protected original intake and resolve their mapping.</p>}
   <nav aria-label="Patient-scoped clinical reconciliation shortcuts">
    <p><strong>Open dedicated clinician reviews for this patient:</strong> These existing central-chart workflows keep medications, allergies, medical/substance-use history and structured trauma separate from unsigned BPS notes. Following a link does not save or approve any patient report.</p>
    {Object.values(focusedReviewLinks).flat().map(target=><a key={target.anchor}
     href={'/emr/patients?patient='+encodeURIComponent(patientId)+'&review='+encodeURIComponent(target.anchor)+'#'+target.anchor}>{target.label}</a>)}
   </nav>
   {data.sections.map((section,i)=><details key={i}>
    <summary>{i+1}. {section.title} — {section.answered}/{section.fields.length} answered · {section.disposition}</summary>
    <p><strong>BPS routing:</strong> {section.domain}. {section.disposition==='reference'?'Reference only; no legal document or administrative decision is copied into BPS.':
       section.disposition==='separate-review'?'Use the existing dedicated medication, medical or structured-history reconciliation; BPS does not silently duplicate these entries.':'Potential clinical history; clinician review is mandatory before any snapshot.'}</p>
    {focusedReviewLinks[section.title]?.length>0&&<nav aria-label={section.title+' clinician reconciliation'}>
     {focusedReviewLinks[section.title].map(target=><a key={target.anchor} href={'/emr/patients?patient='+encodeURIComponent(patientId)+'&review='+encodeURIComponent(target.anchor)+'#'+target.anchor}>{target.label}</a>)}
     <p>Opens the existing clinician-review workflow for this exact central patient. Opening a link never copies, approves or saves patient statements.</p>
    </nav>}
    <dl>{section.fields.filter(field=>typeof field.value==='string'&&field.value.trim()).map(field=><div key={field.key}>
      <dt>{field.label}</dt><dd style={{whiteSpace:'pre-wrap'}}>{readable(field,section.disposition)}</dd>
     </div>)}</dl>{section.answered===0&&<p>No response recorded. Blank is not equivalent to a negative clinical finding.</p>}
   </details>)}
   {data.reviews.length>0&&<details><summary>Previously saved immutable clinician reviews ({data.reviews.length})</summary>
    {data.reviews.map(review=>{
     const frozen=mapSavedBpsReportedFields(review.clinical_answers??{});
     const safeNotes=sanitizeBpsClinicianNotes(review.clinician_notes);
     const omittedNotes=safeNotes.excludedCount+(typeof review.excluded_clinician_notes==='number'&&review.excluded_clinician_notes>0?review.excluded_clinician_notes:0);
     const count=frozen.sections.reduce((sum,section)=>sum+section.fields.length,0);
      const policyWithheld=review.withheld_protected_fields??0;
      const anomalousWithheld=(review.excluded_clinical_fields??0)-policyWithheld;
     return <section key={review.id}>
      <h3>{new Date(review.created_at).toLocaleString()} — source v{review.source_version} ({review.source_status})</h3>
      {review.source_status==='draft'&&<p role="status">This historical clinician review documents a patient DRAFT intake version, not an attested final patient submission. Reconcile the subsequently submitted intake independently; this draft snapshot must not be represented as a patient-submitted final report.</p>}
      {!documentedClinicianReview(review)&&<p role="alert">This historical row lacks confirmed clinician-review attestation or independently documented clinical observations. A current-source snapshot mismatch also invalidates verification. Its stored reviewed flag, if present, is not sufficient evidence of a documented BPS review. Investigate chart provenance before clinical use.</p>}
      <p>Linked intake source last updated {new Date(review.source_updated_at).toLocaleString()}. This is an immutable historical snapshot of patient-reported information, not a new import, verified clinical finding, diagnosis or signature.</p>
      {policyWithheld>0&&<p role="status">{policyWithheld} protected trauma narrative field(s) were intentionally withheld from general BPS history. Consult the dedicated protected trauma reconciliation workflow; this does not itself indicate corrupt source data.</p>}
       {anomalousWithheld>0&&<p role="alert">{anomalousWithheld} unapproved or malformed historical field(s) were withheld by the protected server. Review source provenance before clinical use.</p>}
      {omittedNotes>0&&<p role="alert">{omittedNotes} unapproved or malformed historical clinician-note field(s) were withheld from this BPS view. Investigate provenance before clinical use.</p>}
      <details><summary>View saved patient-reported BPS history ({count} clinical fields)</summary>
       {count===0&&<p>No eligible patient-reported clinical history fields were saved in this review. Blank is not a negative clinical finding.</p>}
       {frozen.sections.map(section=><div key={section.title}><h4>{section.domain}</h4>
        <dl>{section.fields.map(field=><div key={field.key}><dt>{field.label} (patient reported)</dt><dd style={{whiteSpace:'pre-wrap'}}>{field.value}</dd></div>)}</dl>
       </div>)}
       {frozen.unmappedKeys.length>0&&<p role="alert">This stored snapshot has {frozen.unmappedKeys.length} unrecognized field(s), intentionally excluded from the BPS view. Review the source mapping before clinical use.</p>}
      </details>
      <h4>Separate clinician contextual notes — unsigned</h4>
      <dl>{Object.entries(safeNotes.notes).filter(([,value])=>value).map(([key,value])=><div key={key}><dt>{bpsNoteDomains[key as keyof BpsNotes]||key}</dt><dd style={{whiteSpace:'pre-wrap'}}>{value}</dd></div>)}</dl>
     </section>;
    })}
   </details>}
   {data.unmappedKeys.length>0?<p role="alert">Clinician BPS attestation is blocked: reconcile unrecognized reported intake fields in the protected original questionnaire before preparing a reviewed source snapshot.</p>:versionAlreadyReviewed?<p role="status">{uncertainSave?
    'A BPS review submission was attempted, but no save receipt was verified. This source version is locked in this session. Reopen the chart and check protected history before another attempt; do not assume the review was saved.':sourceVersionHasUnverifiedReview?
    'A BPS history record for this source version lacks confirmed clinician-review attestation or independent clinical documentation. A clinical snapshot mismatch also invalidates source verification. Its version remains locked; investigate chart provenance before clinical use or another submission.':
    'A clinician-reviewed BPS snapshot for this source version has already been saved. Its immutable history can be reopened above; a second save of the same version is not permitted. If the source changed without a new version, resolve the intake provenance before saving.'}</p>:!prepared?<button type="button" disabled={saving} onClick={()=>{setPrepared(true);setReviewed(false);setNotes(emptyBpsNotes());setStatus('');}}>Prepare clinician-reviewed BPS intake draft</button>:
    <form onSubmit={save} autoComplete="off">
     <h3>Clinician review and contextual assessment notes</h3>
     <p>The patient source is read-only. Enter your independent observations and follow-up needs here. Safety screening is not a substitute for an immediate clinical risk assessment.</p>
     {(Object.entries(bpsNoteDomains) as [keyof BpsNotes,string][]).map(([key,label])=><label key={key}>{label}
      <textarea rows={3} maxLength={4000} value={notes[key]} onChange={e=>{setNotes({...notes,[key]:e.target.value});setReviewed(false);}}/>
     </label>)}
     <label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>
      I reviewed this intake in the context of the selected patient's chart, distinguished patient reports from clinical findings, and understand that this saves an unsigned, append-only BPS history snapshot rather than a diagnosis, signature or consent.</label>
     {!hasIndependentBpsReviewNote(notes)&&<p role="status">Document at least one independent clinical observation or follow-up need before this reviewed snapshot can be saved. A checkbox alone does not document a clinical review.</p>}
     <button type="submit" disabled={!reviewed||saving||!hasIndependentBpsReviewNote(notes)}>Save reviewed BPS history snapshot</button>
     <button type="button" disabled={saving} onClick={()=>{setPrepared(false);setReviewed(false);}}>Discard unsaved draft</button>
    </form>}
   {status&&<p role="status">{status}</p>}
  </>}
 </article>;
}
