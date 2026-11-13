'use strict';

// The original BPS form stays the primary workspace. Show its linked website
// intake in a read-only, explicitly patient-reported panel; clinical review and
// saving remain in the protected clinician workflow, never in this preview.
let linkedIntakeRenderGeneration=0;
function validOriginalBpsTimestamp(value) {
 if(typeof value!=='string')return false;
 const match=/^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
 if(!match||!Number.isFinite(Date.parse(value)))return false;
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 return month>=1&&month<=12&&day>=1&&day<=new Date(Date.UTC(year,month,0)).getUTCDate();
}
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
   !validOriginalBpsTimestamp(source.updatedAt))
   throw Error('Linked intake source identity, status, version or timestamp could not be verified.');
  // The original seven-page BPS workspace must reject malformed mapped sections,
  // independently of the newer React clinician review. A missing fields array,
  // nested PHI object or spoofed section routing is not a valid patient report.
  // Withhold the entire source before rendering any source answer; leave existing
  // clinician-authored BPS forms and their unsaved values untouched.
  const validSections=result.sections.every(section=>section&&typeof section==='object'&&!Array.isArray(section)&&
   typeof section.title==='string'&&section.title.length>0&&
   typeof section.domain==='string'&&section.domain.length>0&&
   ['clinical','separate-review','reference'].includes(section.disposition)&&
   Number.isSafeInteger(section.answered)&&section.answered>=0&&
   Array.isArray(section.fields)&&section.answered<=section.fields.length&&
   section.fields.every(field=>field&&typeof field==='object'&&!Array.isArray(field)&&
    typeof field.key==='string'&&field.key.length>0&&
    typeof field.label==='string'&&typeof field.type==='string'&&
    typeof field.value==='string'&&
    (field.reported===undefined||typeof field.reported==='boolean')&&
    (field.sourceOnly===undefined||typeof field.sourceOnly==='boolean')));
  if(!validSections)
   throw Error('Linked 21-section intake mapping is malformed; patient statements are withheld.');
  // A partial or malformed clinical history is NOT an empty review history. Refuse
  // to display source answers or claim an attested review until provenance is sound.
  if(!Array.isArray(result.reviews)||!Array.isArray(result.unmappedKeys)||
   !result.reviews.every(review=>review&&typeof review==='object'&&
    /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(review.id)&&
    typeof review.reviewed==='boolean'&&
    Number.isSafeInteger(review.source_version)&&review.source_version>0&&
    ['draft','submitted'].includes(review.source_status)&&
    validOriginalBpsTimestamp(review.source_updated_at)&&
    validOriginalBpsTimestamp(review.created_at))||
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
   validOriginalBpsTimestamp(review.source_updated_at)&&
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
    const fields=(Array.isArray(section.fields)?section.fields:[]).filter(field=>
     field&&field.reported===true&&field.sourceOnly===false&&
     bpsVisibleSourceKeys.has(field.key)&&!protectedSourceTypes.has(field.type)&&
     typeof field.value==='string'&&field.value.trim());
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
