'use strict';

// The original BPS form stays the primary workspace. Show its linked website
// intake in a read-only, explicitly patient-reported panel; clinical review and
// saving remain in the protected clinician workflow, never in this preview.
let linkedIntakeRenderGeneration=0;
async function populateOriginalBpsIntake(panel,id,generation){
 const stillCurrent=()=>generation===linkedIntakeRenderGeneration&&patientId===id&&panel.isConnected;
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
  if(!source||typeof source.accountId!=='string'||
   !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(source.accountId)||
   !['draft','submitted'].includes(source.status)||
   !Number.isSafeInteger(source.version)||source.version<1||
   typeof source.updatedAt!=='string'||!Number.isFinite(Date.parse(source.updatedAt)))
   throw Error('Linked intake source identity, status, version or timestamp could not be verified.');
  // A partial or malformed clinical history is NOT an empty review history. Refuse
  // to display source answers or claim an attested review until provenance is sound.
  if(!Array.isArray(result.reviews)||!Array.isArray(result.unmappedKeys)||
   !result.reviews.every(review=>review&&typeof review==='object'&&
    /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(review.id)&&
    typeof review.reviewed==='boolean'&&
    Number.isSafeInteger(review.source_version)&&review.source_version>0&&
    ['draft','submitted'].includes(review.source_status)&&
    typeof review.source_updated_at==='string'&&Number.isFinite(Date.parse(review.source_updated_at))&&
    typeof review.created_at==='string'&&Number.isFinite(Date.parse(review.created_at)))||
   !result.unmappedKeys.every(key=>typeof key==='string'))
   throw Error('Linked intake review history provenance or unmapped-field audit could not be verified.');
  panel.replaceChildren();
  const heading=document.createElement('h2');heading.textContent='Linked patient intake — BPS source context';
  panel.append(heading);
  const provenance=document.createElement('p');
  provenance.textContent='Patient-reported '+source.status+
   ' intake · source version '+source.version+
   ' · last updated '+new Date(source.updatedAt).toLocaleString()+
   ' · '+result.sections.length+'/21 sections · '+
   (Array.isArray(result.reviews)?result.reviews.filter(review=>review.reviewed===true).length:0)+' attested clinician review(s).';
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
    item.textContent=(review.reviewed===true?'Unsigned review of ':'Unverified review attestation for ')+status+' intake version '+version+' · saved '+date+'.';
    list.append(item);
   }
   history.append(list);
  }else{
   const none=document.createElement('p');none.textContent='No saved clinician-reviewed BPS intake snapshots for this patient.';
   history.append(none);
  }
  const currentReviewed=reviews.some(review=>review.reviewed===true&&
   review.source_version===result.source?.version&&
   review.source_status===result.source?.status&&
   Number.isFinite(Date.parse(review.source_updated_at))&&
   Date.parse(review.source_updated_at)===Date.parse(result.source?.updatedAt));
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
  const bpsVisibleSourceKeys=new Set(["guardian_relationship","custody_notes","counseling_reason","concern_onset","concern_duration","precipitating_events","symptom_frequency","symptom_severity","functional_impact","sleep","appetite","energy","concentration","work_school_impact","relationship_impact","daily_living_impact","counseling_goals","prior_mental_health_treatment","prior_therapists","prior_diagnoses","self_harm_history","suicide_attempt_history","suicidal_thoughts_current","suicidal_plan_current","homicidal_thoughts_current","violence_risk_details","abuse_neglect_current","weapons_access","protective_factors","trauma_history","psychiatric_hospitalizations","family_mental_health_history","family_household","social_supports","education_history","employment_history","military_history","cultural_spiritual_factors","strengths_interests"]);
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
   if(section.disposition==='clinical'&&Array.isArray(section.fields)){
    const reported=section.fields.filter(field=>field.reported===true);
    const answers=document.createElement('dl');
    for(const field of reported){
     const label=document.createElement('dt');label.textContent=String(field.label||field.key||'Patient response')+' (patient reported)';
     const value=document.createElement('dd');
     // A second presentation boundary: never expose structured or separate-review
     // values even if a malformed upstream response included them.
     value.textContent=field.sourceOnly!==false||!bpsVisibleSourceKeys.has(field.key)||protectedSourceTypes.has(field.type)?
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
