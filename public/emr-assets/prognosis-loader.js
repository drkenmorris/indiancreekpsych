'use strict';
let prognosisBundle=null;
prognosisView=function(){return patientId?'<div id="patient-prognosis-page" class="centralEmr" data-patient-id="'+esc(patientId)+'"><p role="status">Loading prognosis editor…</p></div>':'<section class="card"><h2>Prognosis</h2><p>Select a patient using Find/Add Patient before entering prognosis.</p></section>';};
function loadPrognosisBundle(){
 if(prognosisBundle)return prognosisBundle;
 prognosisBundle=new Promise((resolve,reject)=>{
  if(!document.getElementById('prognosis-workspace-style')){const css=document.createElement('link');css.id='prognosis-workspace-style';css.rel='stylesheet';css.href='/emr-assets/prognosis-workspace.css';document.head.append(css);}
  const script=document.createElement('script');script.src='/emr-assets/prognosis-workspace.js';script.onload=resolve;script.onerror=()=>{script.remove();prognosisBundle=null;reject(Error('The prognosis editor could not be loaded. Reload this page to retry.'));};document.head.append(script);
 });return prognosisBundle;
}
const previousPrognosisBinder=bindContent;
bindContent=function(){previousPrognosisBinder();const host=document.getElementById('patient-prognosis-page');if(host)void loadPrognosisBundle().catch(error=>{if(host.isConnected){host.setAttribute('role','alert');host.textContent=error.message;}});};
