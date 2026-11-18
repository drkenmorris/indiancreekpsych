'use strict';
let assessmentSummaryRequest=0,assessmentSummaryAbort=null;
function assessmentSummaryView(){
 const directory=`<section class="card"><h2>Completed patient assessments</h2><p>Completed questionnaires linked to the active patient and available to your account. Each administration is listed separately, including parent/guardian or teacher reports where applicable.</p><button type="button" class="secondary" id="refresh-assessment-summary">Refresh results</button><div id="assessment-summary-directory" role="status">${patientId?'Loading completed assessments and check-in results…':'Select a patient using Find/Add Patient to view results.'}</div></section>`;
 return directory+originalSummaryAssessmentView();
}
const originalSummaryAssessmentView=libraryAssessmentView;
libraryAssessmentView=function(){return activeSection?.module==='assessment'&&activeSection.key==='summary'?assessmentSummaryView():originalSummaryAssessmentView();};
async function loadAssessmentSummary(target){
 const pid=patientId,request=++assessmentSummaryRequest;assessmentSummaryAbort?.abort();assessmentSummaryAbort=new AbortController();
 if(!pid)return;
 const current=()=>request===assessmentSummaryRequest&&patientId===pid&&target.isConnected&&activeSection?.module==='assessment'&&activeSection.key==='summary';
 const date=value=>value?new Date(value).toLocaleString('en-US',{timeZone:'America/Chicago'}):'Date not recorded';
 target.setAttribute('role','status');target.textContent='Loading completed assessments and check-in results…';
 try{
  const response=await fetch('/api/emr/assessment-summary?patient='+encodeURIComponent(pid),{cache:'no-store',signal:assessmentSummaryAbort.signal});const data=await response.json();
  if(!current())return;
  if(!response.ok)throw Error(data.error||'Results could not be loaded.');
  if(data.patientId!==pid||!Array.isArray(data.assessments)||!Array.isArray(data.checkins))throw Error('The results did not match the active patient.');
  if(data.assessments.some(row=>!/^\/admin\/assign-test\/(asq|dsm|connected)-responses\/[a-f0-9-]{36}$/i.test(row.href)))throw Error('A result link could not be verified.');
  target.removeAttribute('role');target.innerHTML=`<p>${data.assessments.length} completed assessments · Dates shown in Central time.</p>${data.assessments.length?`<div class="assessment-results-scroll" tabindex="0" role="region" aria-label="Completed assessment results"><table class="assessment-results-table"><thead><tr><th scope="col">Assessment</th><th scope="col">Respondent / version</th><th scope="col">Completed</th><th scope="col">Result</th></tr></thead><tbody>${data.assessments.map(row=>`<tr><th scope="row">${esc(row.title)}</th><td>${esc(row.respondent)}</td><td>${esc(date(row.completedAt))}</td><td>${esc(row.answeredCount)} answers · Response revision ${esc(row.responseRevision)}<p><a href="${esc(row.href)}">Open responses / scores / results</a></p></td></tr>`).join('')}</tbody></table></div>`:'<p>No completed assessment submissions are recorded for this patient under your account.</p>'}<h2>Session check-in scores and results</h2><p>${data.checkins.length} saved check-ins. Scores below are the recorded source scores; they are not diagnoses.</p>${data.checkins.map(row=>`<article class="record"><h3>${esc(row.title)} · ${esc(date(row.completedAt))}</h3><p><strong>Recorded score: ${row.total===null?'Not recorded':esc(row.total)+(row.maximum===null?'':' / '+esc(row.maximum))}</strong></p><p>Instrument version ${esc(row.version||'not recorded')} · Scoring ${esc(row.scoringVersion||'not recorded')}</p><p class="hint">${esc(row.notice)}</p><details><summary>View this check-in’s item results</summary><dl>${row.items.map(item=>`<dt>${esc(item.label)}</dt><dd>${esc(item.answer)}${item.value===null?'':' ('+esc(item.value)+')'}</dd>`).join('')}</dl></details></article>`).join('')||'<p>No saved session check-in results for this patient.</p>'}`;
 }catch(error){if(current()){target.setAttribute('role','alert');target.textContent=error.message||'Results unavailable. Refresh to retry.';}}
}
const originalSummaryBindControls=bindLibraryControls;
bindLibraryControls=function(){originalSummaryBindControls();const target=document.getElementById('assessment-summary-directory');if(!target)return;void loadAssessmentSummary(target);document.getElementById('refresh-assessment-summary')?.addEventListener('click',()=>void loadAssessmentSummary(target));};
