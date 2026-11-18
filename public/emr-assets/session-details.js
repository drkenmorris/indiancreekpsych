'use strict';
let sessionDetailsEdit=null;
const sessionStatusOptions=['Planned','Completed','Cancelled','No show'];
function sessionDetailRecords(){return chart.records.filter(row=>row.kind==='session_details'||(row.kind==='workspace_section'&&row.section==='session_details'));}
function latestSessionEntries(){const latest=new Map();for(const row of sessionDetailRecords())latest.set(row.session_id||row.id,row);return Array.from(latest.values());}
function sessionLogGroups(){
 const day=chicagoToday(),rows=latestSessionEntries(),dated=rows.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.fields?.session_date||''));
 const ascending=(a,b)=>a.fields.session_date.localeCompare(b.fields.session_date)||a.created.localeCompare(b.created);
 return [['Past sessions',dated.filter(row=>row.fields.session_date<day).sort((a,b)=>-ascending(a,b))],['Today’s sessions',dated.filter(row=>row.fields.session_date===day).sort(ascending)],['Future sessions',dated.filter(row=>row.fields.session_date>day).sort(ascending)],['Earlier entries without a session date',rows.filter(row=>!dated.includes(row))]].filter(([label,items])=>items.length||label!=='Earlier entries without a session date');
}
function sessionDetailsView(){
 if(sessionDetailsEdit?.patientId!==patientId)sessionDetailsEdit=null;
 const selected=sessionDetailsEdit?sessionDetailRecords().find(row=>row.id===sessionDetailsEdit.id):null;
 const sessionId=selected?.session_id||selected?.id||crypto.randomUUID();
 const displayDuration=value=>sessionDurationOptions.find(([id])=>id===value)?.[1]||(value?value+' min':'Not recorded');
 const summary=row=>`<p>${esc(row.fields?.session_date||'Date not recorded')} · ${esc(displayDuration(row.fields?.duration))} · ${esc(row.status||'Status not recorded')}</p><p>${esc(row.fields?.modality||'Type not recorded')} · ${esc(row.fields?.location||'Location not recorded')}</p><small>Recorded ${esc(when(row.created))}</small>`;
 return `<section class="card"><h2>${selected?'Edit session':'Add a session'}</h2><p>Active patient: <strong>${esc(chart.patient.name)}</strong>. Record past or current sessions, or enter a planned future session.</p><p class="hint">This patient’s session log is separate from appointment booking. Use Appointment Scheduler to book clinic appointments.</p><form id="session-details-form" aria-label="Session Details"><input type="hidden" name="session_id" value="${esc(sessionId)}"><input type="hidden" name="prior_id" value="${esc(selected?.id||'')}">${structuredSectionFields('session_details',selected)}<label class="field session-status-field" for="session-status">Session status<select name="status" id="session-status" required><option value="">Select status</option>${sessionStatusOptions.map(status=>`<option ${selected?.status===status?'selected':''}>${status}</option>`).join('')}</select></label><div class="actions"><button type="submit">${selected?'Save session changes':'Add session to log'}</button>${selected?'<button type="button" class="secondary" id="cancel-session-edit">Cancel edit</button>':''}</div></form></section><section class="card"><h2>Patient session log</h2><p>${latestSessionEntries().length} session entries · Dates use America/Chicago for past/today/future grouping. An elapsed date does not establish attendance.</p>${sessionLogGroups().map(([label,rows])=>`<section class="session-log-group"><h3>${esc(label)}</h3>${rows.length?`<div class="session-log-scroll" role="region" tabindex="0" aria-label="${esc(label)}"><table class="session-log-table"><thead><tr><th scope="col">Session date</th><th scope="col">Session time</th><th scope="col">Type of Session</th><th scope="col">Location</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>${rows.map(row=>{const history=sessionDetailRecords().filter(item=>(item.session_id||item.id)===(row.session_id||row.id));return `<tr><th scope="row">${esc(row.fields?.session_date||'Not recorded')}</th><td>${esc(displayDuration(row.fields?.duration))}</td><td>${esc(row.fields?.modality||'Not recorded')}</td><td>${esc(row.fields?.location||'Not recorded')}</td><td>${esc(row.status||'Not recorded')}</td><td><button type="button" class="secondary" data-edit-session="${esc(row.id)}">Edit session</button>${history.length>1?`<details><summary>Entry history (${history.length})</summary>${history.toReversed().map(summary).join('')}</details>`:''}</td></tr>`;}).join('')}</tbody></table></div>`:'<p>No sessions recorded in this group.</p>'}</section>`).join('')}</section>`;
}
function bindSessionDetails(){
 const form=document.querySelector('#session-details-form');if(!form)return;
 for(const input of form.querySelectorAll('[data-section-field]'))input.required=true;
 form.addEventListener('input',()=>dirty=true);form.addEventListener('change',()=>dirty=true);
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('[type="submit"]'),pid=patientId;button.disabled=true;
  try{
   const data={...Object.fromEntries(new FormData(form)),fields:Object.fromEntries(Array.from(form.querySelectorAll('[data-section-field]'),input=>[input.dataset.sectionField,input.value]))};
   if(!pid)throw Error('Select a patient from Find/Add Patient before saving a session.');
   await api('/api/save',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-CSRF':boot.csrf},body:JSON.stringify({patient_id:pid,action:'session_details',data})});
   if(pid!==patientId||!form.isConnected)return;
   dirty=false;sessionDetailsEdit=null;await reload();if(pid===patientId)message('Session saved in this patient’s session log.');
  }catch(error){if(pid===patientId&&form.isConnected){message(error.message,true);button.disabled=false;}}
 });
 for(const button of document.querySelectorAll('[data-edit-session]'))button.addEventListener('click',()=>safeNavigate(()=>{sessionDetailsEdit={patientId,id:button.dataset.editSession};render();document.querySelector('#session-details-form [data-section-field]')?.focus();}));
 document.querySelector('#cancel-session-edit')?.addEventListener('click',()=>safeNavigate(()=>{sessionDetailsEdit=null;render();}));
}
const previousSessionModuleView=moduleSectionView;
moduleSectionView=function(){return activeSection?.module==='notes'&&activeSection.key==='session_details'?sessionDetailsView():previousSessionModuleView();};
const previousSessionModuleBinder=bindModuleSection;
bindModuleSection=function(){return activeSection?.module==='notes'&&activeSection.key==='session_details'?bindSessionDetails():previousSessionModuleBinder();};
