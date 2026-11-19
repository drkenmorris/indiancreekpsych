'use strict';
let planHistoryRequest=0,planHistoryAbort=null;
const originalPlanHistoryView=historyView;
historyView=function(){
 return '<section class="card"><h2>Treatment-plan identity history</h2><p>Original identifiers are retained with each saved plan version. Treatment-plan reports use current chart details where available.</p><button type="button" class="secondary" id="refresh-plan-identity-history">Refresh treatment-plan history</button><div id="plan-identity-history" role="status">'+(patientId?'Loading saved treatment-plan identifiers…':'Select a patient using Find/Add Patient to view treatment-plan history.')+'</div></section>'+originalPlanHistoryView();
};
async function loadPlanIdentityHistory(target){
 const pid=patientId,request=++planHistoryRequest;planHistoryAbort?.abort();planHistoryAbort=new AbortController();if(!pid)return;
 const current=()=>request===planHistoryRequest&&patientId===pid&&view==='history'&&target.isConnected;
 target.setAttribute('role','status');target.textContent='Loading saved treatment-plan identifiers…';
 try{
  const response=await fetch('/api/emr/treatment-plans?patient='+encodeURIComponent(pid),{cache:'no-store',signal:planHistoryAbort.signal}),data=await response.json();
  if(!current())return;
  if(!response.ok)throw Error(data.error||'Treatment-plan history could not be loaded.');
  if(data.patient?.id!==pid||!Array.isArray(data.versions)||data.versions.some(row=>!row.snapshot))throw Error('Treatment-plan history did not match the active patient.');
  target.removeAttribute('role');
  target.innerHTML='<p><strong>Current chart patient:</strong> '+esc(data.patient.name||'Name not recorded')+' · <strong>Current DOB:</strong> '+esc(data.patient.dob||'Not recorded')+'</p>'+(
   data.versions.map(row=>'<article class="record"><details><summary>'+esc(row.snapshot.title)+' · Version '+esc(row.revision)+' · '+esc(row.snapshot.status)+' · '+esc(row.created_at?new Date(row.created_at).toLocaleString('en-US',{timeZone:'America/Chicago'}):'Saved date not recorded')+'</summary><p><strong>Patient name originally saved:</strong> '+esc(row.snapshot.patient_name||'Name not recorded')+'</p><p><strong>DOB originally saved:</strong> '+esc(row.snapshot.patient_dob||'Not recorded')+'</p><p>The original saved plan is retained. These historical identifiers do not replace the current chart demographics.</p></details></article>').join('')||'<p>No saved treatment-plan versions for this patient under your account.</p>');
 }catch(error){if(current()){target.setAttribute('role','alert');target.textContent=error.message||'Treatment-plan history unavailable. Refresh to retry.';}}
}
const originalPlanHistoryBinder=bindContent;
bindContent=function(){originalPlanHistoryBinder();const target=document.getElementById('plan-identity-history');if(!target)return;void loadPlanIdentityHistory(target);document.getElementById('refresh-plan-identity-history')?.addEventListener('click',()=>void loadPlanIdentityHistory(target));};
