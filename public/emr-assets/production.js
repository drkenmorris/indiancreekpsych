'use strict';

// The original BPS form stays the primary workspace. Show its linked website
// intake in a read-only, explicitly patient-reported panel; clinical review and
// saving remain in the protected clinician workflow, never in this preview.
let linkedIntakeRenderGeneration=0;
// Independently enforce the versioned clinical domain/disposition allowlist in
// the original seven-page BPS renderer. Do not trust upstream section labels to
// reclassify medication, insurance or legal answers as clinical findings.
// Keep this declaration aligned with bpsSectionClassification in lib/emr/intake-bps.ts.
const originalBpsSectionRules=Object.freeze({
 "Demographics and contact information": {
  "domain": "Identity and contact (central demographics)",
  "disposition": "reference"
 },
 "Emergency contact, guardian, and responsible party": {
  "domain": "Family, support and legal decision-making context",
  "disposition": "clinical"
 },
 "Insurance and benefits information": {
  "domain": "Administrative coverage (not BPS)",
  "disposition": "reference"
 },
 "Presenting concerns and functional impact": {
  "domain": "Presenting problems, functioning and goals",
  "disposition": "clinical"
 },
 "Mental health treatment history": {
  "domain": "Prior behavioral-health care",
  "disposition": "clinical"
 },
 "Medications": {
  "domain": "Medication/allergy reconciliation (separate chart review)",
  "disposition": "separate-review"
 },
 "Medical & Substance Use History": {
  "domain": "Medical and substance-use reconciliation (separate chart review)",
  "disposition": "separate-review"
 },
 "Safety and risk screening": {
  "domain": "Patient-reported safety and protective factors",
  "disposition": "clinical"
 },
 "Trauma, family, social, educational, and occupational history": {
  "domain": "Trauma and social history (separate trauma checklist review)",
  "disposition": "clinical"
 },
 "Communication and confidential-contact preferences": {
  "domain": "Confidential communications (not BPS)",
  "disposition": "reference"
 },
 "Legal forms directory and questionnaire": {
  "domain": "Protected legal directory (not clinical authorization)",
  "disposition": "reference"
 },
 "Consent to Counseling and Informed Treatment": {
  "domain": "Informed treatment consent (legal record only)",
  "disposition": "reference"
 },
 "Financial Agreement and Good Faith Estimate": {
  "domain": "Financial agreement (not BPS)",
  "disposition": "reference"
 },
 "Telehealth Informed Consent": {
  "domain": "Telehealth consent (legal record only)",
  "disposition": "reference"
 },
 "Electronic Communications and Patient Portal": {
  "domain": "Electronic communication consent (legal record only)",
  "disposition": "reference"
 },
 "Legal Representative and Minor Consent": {
  "domain": "Representative authority (legal record only)",
  "disposition": "reference"
 },
 "Notice of Privacy Practices acknowledgment": {
  "domain": "Privacy acknowledgment (legal record only)",
  "disposition": "reference"
 },
 "Authorization to share health information": {
  "domain": "Release-of-information authorization (legal record only)",
  "disposition": "reference"
 },
 "Optional consent for Part 2 substance-use records": {
  "domain": "Part 2 consent (legal record only)",
  "disposition": "reference"
 },
 "Separate consent for SUD counseling notes": {
  "domain": "SUD counseling-notes consent (legal record only)",
  "disposition": "reference"
 },
 "Separate authorization for psychotherapy notes": {
  "domain": "Psychotherapy-notes authorization (legal record only)",
  "disposition": "reference"
 },
 "Patient attestation and consent to submit": {
  "domain": "Patient attestation (not clinician attestation)",
  "disposition": "reference"
 }
});
function validOriginalBpsTimestamp(value) {
 if(typeof value!=='string')return false;
 const match=/^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
 if(!match||!Number.isFinite(Date.parse(value)))return false;
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 return month>=1&&month<=12&&day>=1&&day<=new Date(Date.UTC(year,month,0)).getUTCDate();
}
// Match the database's microsecond-capable source receipts. Date.parse alone
// truncates fractional seconds and can falsely label a changed intake as reviewed.
function originalBpsInstantNanoseconds(value){
 if(!validOriginalBpsTimestamp(value))return null;
 const fraction=/\.(\d{1,9})(?=Z$|[+-]\d{2}:\d{2}$)/.exec(value)?.[1]||'';
 return BigInt(Math.floor(Date.parse(value)/1000))*1000000000n+
  BigInt(fraction.padEnd(9,'0')||'0');
}
// Match the protected BPS API's note gate: a reviewed checkbox without actual
 // clinician documentation must never appear as a verified clinical review.
 const originalBpsNoteKeys=new Set(["presenting","treatment","medical","safety","family","goals","limitations"]);
 // Keep independent clinical-note verification aligned with the protected API
 // and database attestation. A control-only note, unknown note key, or partially
 // withheld history must not show as an independently documented review on the
 // original seven-page BPS interface.
 const originalBpsInvisibleNoteCharacters=/[\u00ad\u034f\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufe00-\ufe0f\ufeff\u{E0100}-\u{E01EF}]/gu;
 const originalBpsDocumentedReview=(review,currentVersion)=>
  // A current clinician review requires affirmative DB-owned verification of
  // the complete current patient source. Missing/null is not attestation.
  // Historical revisions retain their documented notes, but are not current.
  review?.reviewed===true&&
  (review.source_version===currentVersion?
   review.current_source_snapshot_verified===true:
   review.source_version<currentVersion&&review.current_source_snapshot_verified==null)&&
  (review.excluded_clinician_notes??0)===0&&review.clinician_notes&&
  typeof review.clinician_notes==='object'&&!Array.isArray(review.clinician_notes)&&
  // Sanitized history can pad missing note domains with blanks. A sparse
  // historical review must not count as completed on ANY original BPS page.
  // Verify the protected API's stored-shape receipt and all seven keys here.
  review.clinician_note_domains_complete===true&&
  Object.keys(review.clinician_notes).length===originalBpsNoteKeys.size&&
  Object.entries(review.clinician_notes).every(([key,value])=>
   originalBpsNoteKeys.has(key)&&typeof value==='string'&&value.length<=4000)&&
  Object.values(review.clinician_notes).some(value=>
   value.replace(originalBpsInvisibleNoteCharacters,'')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g,'').trim().length>0);
 async function populateOriginalBpsIntake(panel,requestedId,generation){
 // The protected API returns canonical lowercase UUIDs. An uppercase UUID in
 // an otherwise valid original-BPS patient URL must not appear unlinked, and
 // the generation/scope guard must still reject a genuinely different chart.
 const id=typeof requestedId==='string'?requestedId.toLowerCase():'';
 const stillCurrent=()=>generation===linkedIntakeRenderGeneration&&
  typeof patientId==='string'&&patientId.toLowerCase()===id&&panel.isConnected;
 try{
  const response=await fetch('/api/emr/bps-intake?patient='+encodeURIComponent(id),
   {cache:'no-store',credentials:'same-origin'});
  const result=await response.json();
  if(!stillCurrent())return;
  if(!response.ok)throw Error(result.error||'Linked intake is unavailable.');
  if(result.patientId!==id||!Array.isArray(result.sections)||result.sections.length!==21)
   throw Error('The linked intake did not match this patient or the expected 21 sections.');
  // A stale, malformed or cross-account response must never be presented as a
  // current clinical source. The protected API validates the linkage as well;
  // the original seven-page BPS workspace independently rejects bad provenance.
  const source=result.source;
  const editedInstant=originalBpsInstantNanoseconds(source?.updatedAt);
  const submittedInstant=originalBpsInstantNanoseconds(source?.submittedAt);
  if(!source||typeof source.accountId!=='string'||
   !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(source.accountId)||
   !['draft','submitted'].includes(source.status)||
   !Number.isSafeInteger(source.version)||source.version<1||
   editedInstant===null||
   // A patient draft cannot retain a final submission receipt. A submitted
   // source must not have been edited even one microsecond after attestation.
   (source.status==='draft'&&source.submittedAt!=null)||
   (source.status==='submitted'&&(submittedInstant===null||editedInstant>submittedInstant))||
   (source.submittedAt!=null&&submittedInstant===null)||
   (source.questionnairePacketVersion!=null&&
    !['2026-10-11','2026-11-02-directory-1'].includes(source.questionnairePacketVersion)))
   throw Error('Linked intake source identity, status, version or timestamp could not be verified.');
  // The original seven-page BPS workspace must reject malformed mapped sections,
  // independently of the newer React clinician review. A missing fields array,
  // nested PHI object or spoofed section routing is not a valid patient report.
  // Withhold the entire source before rendering any source answer; leave existing
  // clinician-authored BPS forms and their unsaved values untouched.
  // A nominal 21-section count does not prove an intact source audit.
  // Repeated section titles/answer identities or contradictory reported totals
  // can misattribute a patient's words in the original clinician workspace.
  const seenSectionTitles=new Set();
  const seenFieldKeys=new Set();
  const validSections=result.sections.every(section=>{
   if(!section||typeof section!=='object'||Array.isArray(section)||
      typeof section.title!=='string'||!section.title||
      seenSectionTitles.has(section.title)||
      !Object.prototype.hasOwnProperty.call(originalBpsSectionRules,section.title)||
      originalBpsSectionRules[section.title].domain!==section.domain||
      originalBpsSectionRules[section.title].disposition!==section.disposition||
      typeof section.domain!=='string'||!section.domain||
      !['clinical','separate-review','reference'].includes(section.disposition)||
      !Number.isSafeInteger(section.answered)||section.answered<0||
      !Array.isArray(section.fields)||section.answered>section.fields.length)return false;
   seenSectionTitles.add(section.title);
   const tagged=section.fields.filter(field=>field&&field.reported!==undefined);
   // A partially tagged source must not claim a different count of answered
   // questions; otherwise it could conceal missing or conflicting reports.
   if(tagged.length&&(tagged.length!==section.fields.length||
      tagged.filter(field=>field.reported===true).length!==section.answered))return false;
   // A partially legacy source with no reported flags cannot claim completed
   // patient responses through sourceOnly:false hints alone.
   if(!tagged.length&&section.answered>0&&section.fields.some(field=>field?.sourceOnly===false))return false;
   return section.fields.every(field=>{
    if(!field||typeof field!=='object'||Array.isArray(field)||
       typeof field.key!=='string'||!field.key||seenFieldKeys.has(field.key)||
       // Only application-defined, single-line labels may enter the clinician's
       // source attribution. A forged newline, Unicode paragraph break or
       // bidirectional override in a mislabeled API response could otherwise
       // create a line that appears to be a clinician finding or signature.
       typeof field.label!=='string'||!field.label.trim()||
       field.label.length>200||
       /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u.test(field.label)||
       typeof field.type!=='string'||
       typeof field.value!=='string'||
       (field.reported!==undefined&&typeof field.reported!=='boolean')||
       (field.sourceOnly!==undefined&&typeof field.sourceOnly!=='boolean')||
       (field.reported===true&&!field.value.trim()))return false;
    // A reported medication, allergy, structured-history, legal or insurance
    // answer must NEVER be classed as a BPS-readable free-text report by a
    // malformed/stale API response. The protected source is authoritative;
    // refuse this entire source audit before rendering or drafting anything.
    // Even a false "text" field type cannot override a reference-only or
    // separate-review section boundary.
    const protectedFieldTypes=new Set(['treatment-history','medications','medical-substance',
     'trauma-history','legal-routing','dsm-version']);
    const protectedFieldKeys=new Set(['trauma_history','prior_psychiatric_medications','legal_history']);
    if(field.reported===true&&
     (section.disposition!=='clinical'||protectedFieldTypes.has(field.type)||
      protectedFieldKeys.has(field.key))&&field.sourceOnly!==true)return false;
    seenFieldKeys.add(field.key);
    return true;
   });
  });
  if(!validSections)
   throw Error('Linked 21-section intake mapping is malformed; patient statements are withheld.');
  // The legacy packet contains the communications section; the directory
  // packet replaces it with the legal-form router. Both are recognized
  // historical titles, but never valid together or in the wrong version.
  // Otherwise a 21-item array can silently substitute one allowlisted section
  // for another and mislead the clinician about completeness.
  const legalDirectory='Legal forms directory and questionnaire';
  const legacyCommunications='Communication and confidential-contact preferences';
  const directoryPacket=source.questionnairePacketVersion==='2026-11-02-directory-1';
  if(directoryPacket?
     (!seenSectionTitles.has(legalDirectory)||seenSectionTitles.has(legacyCommunications)):
     (!seenSectionTitles.has(legacyCommunications)||seenSectionTitles.has(legalDirectory)))
   throw Error('Linked 21-section intake layout does not match its questionnaire version; patient statements are withheld.');
  // A partial or malformed clinical history is NOT an empty review history. Refuse
  // to display source answers or claim an attested review until provenance is sound.
  // A malformed history must never create a reassuring but false clinician
  // review indicator. Validate unique IDs, revisions and receipt chronology at
  // the original BPS trust boundary independently of the API.
  const reviewIds=new Set();
  let priorReviewTime=null,priorReviewId='';
  const validReviewHistory=Array.isArray(result.reviews)&&result.reviews.every(review=>{
   if(!review||typeof review!=='object'||Array.isArray(review)||
      typeof review.id!=='string'||
      !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(review.id)||
      reviewIds.has(review.id.toLowerCase())||
      typeof review.reviewed!=='boolean'||
      !Number.isSafeInteger(review.source_version)||review.source_version<1||
      review.source_version>source.version||
      !['draft','submitted'].includes(review.source_status)||
      // A malformed historical row is not equivalent to empty BPS history.
      // Never count it as a clinician review or expose related patient reports.
      !review.clinical_answers||typeof review.clinical_answers!=='object'||
      Array.isArray(review.clinical_answers)||
      !review.clinician_notes||typeof review.clinician_notes!=='object'||
      Array.isArray(review.clinician_notes)||
      (review.excluded_clinical_fields!==undefined&&
       (!Number.isSafeInteger(review.excluded_clinical_fields)||review.excluded_clinical_fields<0))||
      (review.withheld_protected_fields!==undefined&&
       (!Number.isSafeInteger(review.withheld_protected_fields)||
        review.withheld_protected_fields<0||
        review.withheld_protected_fields>(review.excluded_clinical_fields??0)))||
      (review.excluded_clinician_notes!==undefined&&
       (!Number.isSafeInteger(review.excluded_clinician_notes)||review.excluded_clinician_notes<0)))return false;
   const reviewId=review.id.toLowerCase();
   const sourceAt=originalBpsInstantNanoseconds(review.source_updated_at);
   const createdAt=originalBpsInstantNanoseconds(review.created_at);
   // Enforce descending (created_at,id) history ordering, as in the protected
   // API and clinician review. Stale, shuffled responses are not attestation.
   if(createdAt===null||
      (priorReviewTime!==null&&
       (createdAt>priorReviewTime||(createdAt===priorReviewTime&&reviewId>=priorReviewId))))return false;
   priorReviewTime=createdAt;priorReviewId=reviewId;reviewIds.add(reviewId);
   return sourceAt!==null&&
    sourceAt<=editedInstant&&createdAt>=sourceAt&&
    // The original BPS cannot trust a review that claims the current source
    // revision but has a different source status or exact edit receipt.
    // Historical revisions remain independently traceable by their own dates.
    (review.source_version!==source.version||
     (review.source_status===source.status&&sourceAt===editedInstant))&&
    // A final patient submission cannot be certified before its attestation.
    (review.source_version!==source.version||source.status!=='submitted'||
     createdAt>=submittedInstant);
  });
  if(!validReviewHistory||!Array.isArray(result.unmappedKeys)||
     !result.unmappedKeys.every(key=>typeof key==='string'))
   throw Error('Linked intake review history provenance or unmapped-field audit could not be verified.');
  panel.replaceChildren();
  const heading=document.createElement('h2');heading.textContent='Linked patient intake — BPS source context';
  panel.append(heading);
  const provenance=document.createElement('p');
  provenance.textContent='Patient-reported '+source.status+
   ' intake · source version '+source.version+
   ' · last updated '+new Date(source.updatedAt).toLocaleString()+
   ' · exact revision receipt '+source.updatedAt+
   (source.status==='submitted'?' · patient submission receipt '+source.submittedAt+
    ' (patient attestation only; not a clinician signature)':' · no patient submission receipt (draft)')+
   ' · '+result.sections.length+'/21 sections · '+
   result.reviews.filter(review=>originalBpsDocumentedReview(review,source.version)).length+' independently documented unsigned clinician review(s).';
  panel.append(provenance);
  const guidance=document.createElement('p');
  guidance.textContent='Read-only patient statements are not verified clinician findings. No diagnosis, signature, medication/allergy reconciliation or clinical save occurs here.';
  panel.append(guidance);
  // A clinician may be reviewing a chart while its linked website intake is
  // submitted or amended. Refresh only the read-only source context, never the
  // original BPS form, its unsaved values, or the currently selected patient.
  const refresh=document.createElement('button');
  refresh.type='button';
  refresh.textContent='Refresh linked patient intake from protected source';
  refresh.addEventListener('click',()=>{
   if(!stillCurrent())return;
   const nextGeneration=++linkedIntakeRenderGeneration;
   const loading=document.createElement('p');
   loading.setAttribute('role','status');
   loading.textContent='Refreshing linked intake for the selected patient…';
   panel.replaceChildren(loading);
   void populateOriginalBpsIntake(panel,id,nextGeneration);
  });
  panel.append(refresh);
  // A prior review is NOT proof that the current intake was reviewed. Keep
  // immutable snapshot provenance visible in the owner's primary BPS workspace
  // without re-exposing historical clinical/medication/legal answer payloads.
  const reviews=Array.isArray(result.reviews)?result.reviews:[];
  const history=document.createElement('section');
  history.setAttribute('aria-label','Clinician-reviewed BPS intake snapshot history');
  const historyTitle=document.createElement('h3');
  historyTitle.textContent='Clinician-reviewed intake snapshot history';
  history.append(historyTitle);
  if(reviews.length){
   const list=document.createElement('ol');
   for(const review of reviews){
    const item=document.createElement('li');
    const version=Number.isInteger(review.source_version)&&review.source_version>0?String(review.source_version):'unknown';
    const status=['draft','submitted'].includes(review.source_status)?review.source_status:'unverified';
    const at=Date.parse(review.created_at);
    const date=Number.isFinite(at)?new Date(at).toLocaleString():'date unavailable';
    item.textContent=(originalBpsDocumentedReview(review,source.version)?'Documented unsigned review of ':'Unverified review attestation for ')+status+' intake version '+version+' · saved '+date+'.';
    list.append(item);
   }
   history.append(list);
    // Protected trauma withholding is expected; do not call it corrupt history.
    const protectedWithheld=reviews.reduce((sum,review)=>sum+(review.withheld_protected_fields??0),0);
    if(protectedWithheld>0){
     const boundary=document.createElement('p');boundary.setAttribute('role','status');
     boundary.textContent=protectedWithheld+' protected trauma narrative field(s) intentionally withheld from general BPS history. Consult dedicated protected trauma reconciliation.';
     history.append(boundary);
    }
    if(reviews.some(review=>review.reviewed===true&&!originalBpsDocumentedReview(review,source.version))){
    const warning=document.createElement('p');warning.setAttribute('role','alert');
    warning.textContent='A historical BPS row has a reviewed checkbox but its independent clinical documentation or source-snapshot integrity could not be verified. It is NOT a verified clinical review. Investigate its provenance in the protected chart.';
    history.append(warning);
   }
  }else{
   const none=document.createElement('p');none.textContent='No saved clinician-reviewed BPS intake snapshots for this patient.';
   history.append(none);
  }
  // A matching version and substantive clinician note do not establish
  // reviewed clinical history if DB-owned patient answers are incomplete,
  // changed, or have unresolved fields. The protected API explicitly supplies
  // this verdict; missing evidence is never an affirmative review.
  // A source-verified provisional DRAFT review is not a completed patient
  // submission; never display the current-review clearance before the
  // patient's final submission receipt, even if a stale API says verified.
  const currentReviewed=source.status==='submitted'&&
   result.unmappedKeys.length===0&&reviews.some(review=>
   originalBpsDocumentedReview(review,source.version)&&
   review.current_source_snapshot_verified===true&&
   review.source_version===result.source?.version&&
   review.source_status===result.source?.status&&
   originalBpsInstantNanoseconds(review.source_updated_at)===editedInstant&&
   // A clinician review must occur no earlier than the real patient receipt.
   originalBpsInstantNanoseconds(review.created_at)>=submittedInstant);
  if(reviews.some(review=>review.source_version===source.version&&
      review.current_source_snapshot_verified===false)){
   const mismatch=document.createElement('p');mismatch.setAttribute('role','alert');
   mismatch.textContent='Saved clinician review does not match the complete current patient-reported clinical source. The reviewed badge is withheld; reconcile the protected intake and chart history before relying on this review.';
   history.append(mismatch);
  }
  if(!currentReviewed){
   const warning=document.createElement('p');warning.setAttribute('role','status');
   warning.textContent=reviews.length?
    'The current intake version has changed since the recorded clinician reviews, or has not yet been reviewed. Reopen the current source before saving another unsigned review.':
    'The current intake has not yet been saved as a clinician-reviewed BPS snapshot.';
   history.append(warning);
  }
  const historyLink=document.createElement('a');
  historyLink.href='/emr/bps-intake?patient='+encodeURIComponent(id);
  historyLink.textContent='Open protected clinician review, saved BPS source history and explicit snapshot save';
  history.append(historyLink);
  panel.append(history);
  const protectedSourceTypes=new Set(['treatment-history','medications','medical-substance','trauma-history','legal-routing','dsm-version']);
  // Defense-in-depth: mirror the server-approved BPS source keys, including
  // retired contextual reports. Wrongly relabeled legal/coverage keys stay hidden.
  // The Vitest parity assertion protects this list from drifting.
  const bpsVisibleSourceKeys=new Set(["guardian_relationship","custody_notes","counseling_reason","concern_onset","concern_duration","precipitating_events","symptom_frequency","symptom_severity","functional_impact","sleep","appetite","energy","concentration","work_school_impact","relationship_impact","daily_living_impact","counseling_goals","prior_mental_health_treatment","prior_therapists","prior_diagnoses","self_harm_history","suicide_attempt_history","suicidal_thoughts_current","suicidal_plan_current","homicidal_thoughts_current","violence_risk_details","abuse_neglect_current","weapons_access","protective_factors","psychiatric_hospitalizations","family_mental_health_history","family_household","social_supports","education_history","employment_history","military_history","cultural_spiritual_factors","strengths_interests"]);
  // A clinical key may be rendered only under its exact questionnaire section,
  // not under an API-supplied section title/disposition chosen independently.
  // These are read-only patient reports, never inferred BPS findings or saves.
  const originalBpsSourceKeysBySection=new Map(Object.entries({"Emergency contact, guardian, and responsible party":["guardian_relationship","custody_notes"],"Presenting concerns and functional impact":["counseling_reason","concern_onset","concern_duration","precipitating_events","symptom_frequency","symptom_severity","functional_impact","sleep","appetite","energy","concentration","work_school_impact","relationship_impact","daily_living_impact","counseling_goals"],"Mental health treatment history":["prior_mental_health_treatment","prior_therapists","prior_diagnoses","self_harm_history","suicide_attempt_history","psychiatric_hospitalizations"],"Safety and risk screening":["suicidal_thoughts_current","suicidal_plan_current","homicidal_thoughts_current","violence_risk_details","abuse_neglect_current","weapons_access","protective_factors"],"Trauma, family, social, educational, and occupational history":["trauma_history","family_mental_health_history","family_household","social_supports","education_history","employment_history","military_history","cultural_spiritual_factors","strengths_interests"]}).map(([title,keys])=>[title,new Set(keys)]));
  const approvedOriginalBpsAnswer=(section,field)=>
   section.disposition==='clinical'&&field&&field.reported===true&&
   field.sourceOnly===false&&typeof field.value==='string'&&!!field.value.trim()&&
   bpsVisibleSourceKeys.has(field.key)&&!protectedSourceTypes.has(field.type)&&
   originalBpsSourceKeysBySection.get(section.title)?.has(field.key)===true;
  // The original BPS stays fully editable. Provide source context relevant to its
  // currently selected clinical page without writing questionnaire responses into
  // clinician-authored fields or broadening medication/legal/trauma disclosure.
  // Each page uses an exact approved section-name map; unfamiliar page IDs fall
  // back to the complete 21-section source audit below.
  const originalBpsPageSources={
   symptoms:{label:'Current symptom checklist',titles:['Presenting concerns and functional impact','Safety and risk screening']},
   treatment_history:{label:'Counseling and psychiatric history',titles:['Mental health treatment history']},
   medications:{label:'Psychiatric medications',titles:['Medications']},
   family_origin:{label:'Family of origin',titles:['Emergency contact, guardian, and responsible party','Trauma, family, social, educational, and occupational history']},
   medical_substance:{label:'Medical and substance-use history',titles:['Medical & Substance Use History']},
   developmental_personal:{label:'Developmental and personal history',titles:['Trauma, family, social, educational, and occupational history']},
   trauma_history:{label:'Trauma history',titles:['Trauma, family, social, educational, and occupational history']}
  };
  const bpsPage=new URLSearchParams(location.search).get('bps_page')||'symptoms';
  const pageSource=Object.prototype.hasOwnProperty.call(originalBpsPageSources,bpsPage)?
   originalBpsPageSources[bpsPage]:null;
  if(pageSource){
   const pageContext=document.createElement('section');
   pageContext.setAttribute('aria-label','Source context for selected original BPS page');
   const pageHeading=document.createElement('h3');
   pageHeading.textContent='Patient-reported source context for '+pageSource.label;
   pageContext.append(pageHeading);
   const pageNotice=document.createElement('p');
   pageNotice.textContent='Read-only source reference for this BPS page, not a clinician finding or form entry. Clinician must independently review, enter and save all assessment findings.';
   pageContext.append(pageNotice);
   for(const section of result.sections.filter(section=>pageSource.titles.includes(section.title))){
    const subheading=document.createElement('h4');subheading.textContent=section.title;pageContext.append(subheading);
    if(section.disposition!=='clinical'){
     const separate=document.createElement('p');
     separate.textContent='Dedicated protected reconciliation required. No medication, allergy, structured history, legal or insurance values are copied into this BPS form.';
     pageContext.append(separate);
     continue;
    }
    const fields=(Array.isArray(section.fields)?section.fields:[]).filter(field=>approvedOriginalBpsAnswer(section,field));
    if(!fields.length){
     const blank=document.createElement('p');blank.textContent='No BPS-approved patient report available for this page; blank is not a negative clinical finding.';
     pageContext.append(blank);
     continue;
    }
    const answers=document.createElement('dl');
    for(const field of fields){
     const label=document.createElement('dt');label.textContent=String(field.label||field.key)+' (patient reported)';
     const value=document.createElement('dd');value.textContent=field.value;
     answers.append(label,value);
    }
    pageContext.append(answers);
   }
   // Start an original-form draft from a small, page-specific allowlist of
   // patient-reported social/developmental facts, never from medication,
   // allergy, trauma, insurance, legal, or risk-screening responses. This is
   // clinician-initiated source attribution, not a finding or an automatic save.
   const draftDestination=bpsPage==='developmental_personal'?{form:'biopsychosocial_developmental_personal',note:'source_notes',label:'developmental-history',keys:['family_household','social_supports','education_history','employment_history','military_history','cultural_spiritual_factors','strengths_interests']}:bpsPage==='family_origin'?{form:'biopsychosocial_family_origin',note:'other_notes',label:'family-of-origin',keys:['family_household','social_supports']}:null;
   if(draftDestination&&source.status==='submitted'&&result.unmappedKeys.length>0){
    // The intake may contain an unanswered or newly introduced field whose
    // clinical destination has not been approved. Its source can remain
    // available for read-only review, but NO draft placement is authorized
    // until the field audit is resolved. Equal repeated receipts are not
    // sufficient to override this boundary.
    const unresolved=document.createElement('p');
    unresolved.setAttribute('role','alert');
    unresolved.textContent='Unmapped intake fields require manual reconciliation before patient-reported source references can be placed into this original BPS draft. Existing clinician notes remain unchanged.';
    pageContext.append(unresolved);
   }
   if(draftDestination&&source.status==='submitted'&&result.unmappedKeys.length===0){
    const allowedDraftKeys=new Set(draftDestination.keys);
    const getDraftFields=sections=>{
     const section=Array.isArray(sections)?sections.find(entry=>
      entry?.title==='Trauma, family, social, educational, and occupational history'):null;
     return Array.isArray(section?.fields)?section.fields
      .filter(field=>allowedDraftKeys.has(field?.key)&&approvedOriginalBpsAnswer(section,field))
      .map(field=>({key:field.key,label:field.label,value:field.value})):[];
    };
    const fields=getDraftFields(result.sections);
    // Free-text patient reports may contain invisible control or bidirectional
    // formatting marks. These can visually reverse patient-source prefixes or
    // impersonate clinician-authored text even when every newline is labeled.
    // Preserve the protected patient report, but never copy such text into an
    // editable clinician note. Ordinary newlines and Unicode paragraph breaks
    // remain supported and are attributed separately below.
    const unsafeAttributedText=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
    const unsafeDraftField=fields.some(field=>unsafeAttributedText.test(field.value));
    if(unsafeDraftField){
     const warning=document.createElement('p');
     warning.setAttribute('role','alert');
     warning.textContent='Patient-reported source contains directional or control characters that cannot be safely attributed in editable BPS notes. Review the protected original intake; no source text was copied.';
     pageContext.append(warning);
    }
    if(fields.length&&!unsafeDraftField){
     // A patient may include newlines or Unicode paragraph separators in a
     // free-text answer. Attribute EACH physical line to the patient so a
     // continuation cannot visually impersonate a clinician-authored finding,
     // order, diagnosis or signature in the editable original BPS draft.
     // Raw patient wording remains available in the protected source view.
     const patientAttributedLines=field=>{
      const lines=field.value.split(/\r\n?|\n|\u2028|\u2029/);
      return lines.map((line,index)=>
       'Patient-reported '+field.label+
       (lines.length>1?' (line '+(index+1)+'/'+lines.length+')':'')+
       ': '+line).join('\n');
     };
     const draft=['Unverified patient-reported website intake, version '+source.version+
      ', submitted '+source.submittedAt+'. Clinician review required.',
      ...fields.map(patientAttributedLines)].join('\n');
     const notice=document.createElement('p');
     notice.setAttribute('role','status');
     const button=document.createElement('button');
     button.type='button';
     button.textContent='Place patient-reported source references in blank '+draftDestination.label+' draft notes';
     button.addEventListener('click',async()=>{
      if(!stillCurrent()||new URLSearchParams(location.search).get('bps_page')!==bpsPage)return;
      const target=document.querySelector('form[data-action="'+draftDestination.form+'"] textarea[name="'+draftDestination.note+'"]');
      if(!target||target.value!==''){
       notice.textContent='Existing clinician draft notes were preserved. Use the protected intake review for manual reconciliation.';
       return;
      }
      if(draft.length>target.maxLength&&target.maxLength>=0){
       notice.textContent='Patient report exceeds the original source-notes field limit; use the protected intake review instead. No text was copied.';
       return;
      }
      button.disabled=true;
      try{
       // A source may change after this page loads. Recheck the exact receipt
       // and safe field values before inserting anything into an editable form.
       const response=await fetch('/api/emr/bps-intake?patient='+encodeURIComponent(id),
        {cache:'no-store',credentials:'same-origin'});
       if(!response.ok)throw Error('Source verification failed.');
       const fresh=await response.json();
       // A BPS page may change while the protected receipt recheck is awaiting.
       // The old form can remain connected during navigation; never populate
       // a stale page's clinical draft even when the source is still valid.
       if(!stillCurrent()||!target.isConnected||
        new URLSearchParams(location.search).get('bps_page')!==bpsPage)return;
       if(fresh.patientId!==id||fresh.source?.accountId!==source.accountId||
        fresh.source?.status!=='submitted'||fresh.source?.version!==source.version||
        originalBpsInstantNanoseconds(fresh.source?.updatedAt)!==editedInstant||
        originalBpsInstantNanoseconds(fresh.source?.submittedAt)!==submittedInstant||
        fresh.source?.questionnairePacketVersion!==source.questionnairePacketVersion||
        // Full 21-section source parity must hold during draft placement;
        // matching only the selected social fields could miss a concurrently
        // altered risk, medication, legal or other patient-reported answer.
        !Array.isArray(fresh.sections)||fresh.sections.length!==21||
        JSON.stringify(fresh.sections)!==JSON.stringify(result.sections)||
        !Array.isArray(fresh.unmappedKeys)||
        JSON.stringify(fresh.unmappedKeys)!==JSON.stringify(result.unmappedKeys)||
        // The displayed clinician-review provenance may have changed during
        // this asynchronous read even when the questionnaire answers did not.
        // Require a fresh review of the source panel before placing draft notes.
        !Array.isArray(fresh.reviews)||
        JSON.stringify(fresh.reviews)!==JSON.stringify(result.reviews)||
        JSON.stringify(getDraftFields(fresh.sections))!==JSON.stringify(fields)){
        notice.textContent='The linked intake changed or could not be reverified. No text was copied; refresh this source.';
        return;
       }
       if(target.value!==''){
        notice.textContent='Clinician-entered draft notes were preserved. No text was copied.';
        return;
       }
       target.value=draft;
       target.dispatchEvent(new window.Event('input',{bubbles:true}));
       // Both original forms keep source notes inside a collapsed optional
       // disclosure. Reveal the filled field so the clinician can inspect it
       // before choosing whether to save the independent assessment.
       const noteDisclosure=target.closest('details');
       if(noteDisclosure)noteDisclosure.open=true;
       notice.textContent='Patient report placed in the unsaved original '+draftDestination.label+' draft. Review independently before explicit save; no clinician finding or signature was created.';
      }catch{
       if(stillCurrent())notice.textContent='The protected source could not be reverified; original clinical notes remain unchanged.';
      }finally{if(stillCurrent())button.disabled=false;}
     });
     pageContext.append(button,notice);
    }
   }
   panel.append(pageContext);
  }
  const details=document.createElement('details');
  const summary=document.createElement('summary');summary.textContent='Expand all 21 intake sections and patient-reported answers';
  details.append(summary);
  const list=document.createElement('ol');
  for(const section of result.sections){
   const item=document.createElement('li');
   const heading=document.createElement('strong');
   heading.textContent=String(section.title||'Unnamed section')+' — '+String(section.answered??0)+' answered';
   item.append(heading);
   const domain=document.createElement('p');
   domain.textContent='BPS routing: '+String(section.domain||'Unclassified')+' ('+String(section.disposition||'unclassified')+').';
   item.append(domain);
   if(section.disposition==='clinical'&&originalBpsSourceKeysBySection.has(section.title)&&Array.isArray(section.fields)){
    const reported=section.fields.filter(field=>field.reported===true);
    const answers=document.createElement('dl');
    for(const field of reported){
     const label=document.createElement('dt');label.textContent=String(field.label||field.key||'Patient response')+' (patient reported)';
     const value=document.createElement('dd');
     // A second presentation boundary: never expose structured or separate-review
     // values even if a malformed upstream response included them.
     value.textContent=!approvedOriginalBpsAnswer(section,field)?
      'Stored in the dedicated protected intake/reconciliation source.':String(field.value??'');
     answers.append(label,value);
    }
    item.append(answers);
   }else{
    const boundary=document.createElement('p');
    boundary.textContent='Separate protected source or administrative reference; no clinical content transferred.';
    item.append(boundary);
   }
   list.append(item);
  }
  details.append(list);panel.append(details);
  const action=document.createElement('a');
  action.href='/emr/bps-intake?patient='+encodeURIComponent(id)+
   '&bps_page='+encodeURIComponent(new URLSearchParams(location.search).get('bps_page')||'symptoms');
  action.textContent='Open protected clinician review and explicit BPS snapshot save';
  panel.append(action);
  if(Array.isArray(result.unmappedKeys)&&result.unmappedKeys.length){
   const warning=document.createElement('p');warning.setAttribute('role','alert');
   warning.textContent=result.unmappedKeys.length+' unmapped intake field(s) require manual review; none were automatically imported.';
   panel.append(warning);
  }
 }catch(error){
  if(stillCurrent()){
   panel.replaceChildren();
   const notice=document.createElement('p');notice.setAttribute('role','alert');
   notice.textContent='Linked intake cannot be reviewed in the original BPS workspace: '+
    (error instanceof Error?error.message:'Protected source unavailable.')+
    ' Existing clinical forms remain available; no intake data were imported.';
   panel.append(notice);
  }
 }
}
function showOriginalBpsIntake(){
 const generation=++linkedIntakeRenderGeneration;
 const host=document.querySelector('#content');
 // The original BPS navigation is the source of truth for the active clinical
 // page. Never query patient intake from other modules or an unselected chart.
 if(!host||!patientId||!host.querySelector('[data-bps-intake-review]'))return;
 const panel=document.createElement('section');
 panel.className='card';
 panel.setAttribute('aria-label','Patient intake context in original biopsychosocial workspace');
 const loading=document.createElement('p');loading.setAttribute('role','status');
 loading.textContent='Checking the linked 21-section intake for this patient…';
 panel.append(loading);host.prepend(panel);
 void populateOriginalBpsIntake(panel,patientId,generation);
}

const originalProductionRender=render;
render=function(){
 if(typeof activeSection!=='undefined'&&activeSection?.module==='group'){const query=new URLSearchParams({section:activeSection.key});if(patientId)query.set('patient',patientId);location.assign('/emr/groups?'+query.toString());return;}
 if(view==='groups'){location.assign('/emr/groups');return;}
 if(view==='schedule'){location.assign('/appointments');return;}
 const result=originalProductionRender();
 showOriginalBpsIntake();
 return result;
};
const centralOriginalSettings=settingsSection;
settingsSection=function(key,label){if(key==='database')return configCard(label,'<p>This chart is stored in the central patient repository with saved revision history. Database operations require clinic administration.</p>');return centralOriginalSettings(key,label);};
window.addEventListener('DOMContentLoaded',()=>{const billing=document.querySelector('a[href="/?module=billing"]');if(billing)billing.href='/emr/workspace?patient='+encodeURIComponent(new URLSearchParams(location.search).get('patient')||'')+'&module=billing';});
const centralOriginalMessage=message;
message=function(text,error=false){centralOriginalMessage(String(text).replace(/ locally\./g,' to the central patient record.').replace(/Saved locally/g,'Saved centrally'),error);};
