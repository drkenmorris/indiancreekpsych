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
  panel.replaceChildren();
  const heading=document.createElement('h2');heading.textContent='Linked patient intake — BPS source context';
  panel.append(heading);
  const provenance=document.createElement('p');
  provenance.textContent='Patient-reported '+(result.source?.status==='submitted'?'submitted':'draft')+
   ' intake · source version '+String(result.source?.version??'unknown')+
   ' · '+result.sections.length+'/21 sections · '+
   (Array.isArray(result.reviews)?result.reviews.length:0)+' saved clinician review(s).';
  panel.append(provenance);
  const guidance=document.createElement('p');
  guidance.textContent='Read-only patient statements are not verified clinician findings. No diagnosis, signature, medication/allergy reconciliation or clinical save occurs here.';
  panel.append(guidance);
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
     value.textContent=field.sourceOnly===true?'Stored in the dedicated protected intake/reconciliation source.':String(field.value??'');
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
