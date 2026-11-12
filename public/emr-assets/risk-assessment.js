'use strict';
// A read-only view of the exact submitted website intake: no name/email matching,
// new clinical conclusion, or replacement of the original patient statements.
let riskAssessmentGeneration=0;
const riskPreviousSectionView=moduleSectionView;
moduleSectionView=function(){
 if(activeSection?.module!=='assessment'||activeSection.key!=='risk_assessment')return riskPreviousSectionView();
 return '<section class="card"><h2>Risk Assessment — patient self-assessment</h2><p>These are the patient’s original submitted answers. They require independent clinician assessment and do not establish risk clearance or an emergency response.</p><div id="risk-assessment-source" aria-live="polite"><p role="status">Loading the linked patient’s risk screening…</p></div></section>';
};
async function loadRiskAssessment(panel,id,generation){
 const current=()=>generation===riskAssessmentGeneration&&panel.isConnected&&patientId===id&&activeSection?.module==='assessment'&&activeSection.key==='risk_assessment';
 try{
  const response=await fetch('/api/emr/risk-assessment?patient='+encodeURIComponent(id),{cache:'no-store',credentials:'same-origin'});
  const data=await response.json();if(!current())return;
  if(!response.ok)throw Error(data.error||'Risk screening unavailable.');
  if(data.patientId!==id)throw Error('The risk-screening source did not match the selected patient.');
  panel.replaceChildren();
  if(!data.source){const empty=document.createElement('p');empty.textContent=data.reason||'No submitted risk screening is available.';panel.append(empty);}
  else{
   if(!Array.isArray(data.fields)||data.fields.length!==7)throw Error('The source risk-screening fields are incomplete.');
   const provenance=document.createElement('p');
   provenance.textContent='Source: submitted patient intake · Version '+String(data.source.version)+' · Submitted '+(data.source.submittedAt?new Date(data.source.submittedAt).toLocaleString('en-US',{timeZone:'America/Chicago'}):'date not recorded')+' Central Time. Patient statements are retained as reported.';
   panel.append(provenance);
   for(const field of data.fields){
    if(field.type==='yes-no'){
     const group=document.createElement('fieldset');group.className='riskAssessmentQuestion';
     const legend=document.createElement('legend');legend.textContent=field.label;group.append(legend);
     const choices=document.createElement('div');choices.className='riskAssessmentChoices';
     for(const value of ['Yes','No']){const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.disabled=true;box.checked=field.value===value;label.append(box,document.createTextNode(value));choices.append(label);}
     group.append(choices);
     if(!['Yes','No'].includes(field.value)){const original=document.createElement('p');original.textContent=field.value?'Original patient response: '+field.value:'No answer recorded.';group.append(original);}
     panel.append(group);
    }else{
     const label=document.createElement('label');label.className='field';label.textContent=field.label;
     const text=document.createElement('textarea');text.readOnly=true;text.rows=4;text.value=field.value;label.append(text);panel.append(label);
     if(!field.value){const empty=document.createElement('p');empty.textContent='No answer recorded.';panel.append(empty);}
    }
   }
  }
  const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh patient self-assessment';refresh.addEventListener('click',()=>{if(!current())return;const next=++riskAssessmentGeneration;panel.textContent='Refreshing linked patient report…';void loadRiskAssessment(panel,id,next);});panel.append(refresh);
 }catch(error){if(current()){panel.replaceChildren();const message=document.createElement('p');message.setAttribute('role','alert');message.textContent=error instanceof Error?error.message:'Unable to load the submitted risk screening.';panel.append(message);}}
}
const riskPreviousRender=render;
render=function(){if(activeSection?.module==='assessment'&&activeSection.key==='risk_assessment')view='module-section';const generation=++riskAssessmentGeneration;const result=riskPreviousRender();const panel=document.querySelector('#risk-assessment-source');if(panel&&patientId)void loadRiskAssessment(panel,patientId,generation);return result;};
