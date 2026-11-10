'use strict';
// Keep the original demo menus/dialog; use only the MFA-protected central registry.
async function centralRegistry(){
 const response=await fetch('/api/emr/patients',{cache:'no-store'});
 const value=await response.json();
 if(!response.ok)throw Error(value.error||'Patient directory unavailable.');
 return value.patients.map(row=>{
  const d=row.demographics||{},full=(row.profiles?.full_name||'').trim().split(/\s+/);
  const first=d.first_name||full.shift()||'',lastName=d.last_name||full.join(' '),dob=d.dob||'';
  return {id:row.id,first_name:first,last_name:lastName,middle_name:d.middle_name||'',dob,
   name:[first,lastName].filter(Boolean).join(' ')||'Patient chart '+row.id.slice(0,8),
   assigned_id:patientCode(first,lastName,dob)||row.id.slice(0,8),status:d.active===false?'archived':'active'};
 }).sort((a,b)=>a.last_name.localeCompare(b.last_name)||a.first_name.localeCompare(b.first_name));
}
refreshRegistry=async function(){const patients=await centralRegistry();boot={...(boot||{}),patients,patient_directory:patients};renderDirectory();};
const originalRegistryDirectory=renderDirectory;
renderDirectory=function(){originalRegistryDirectory();document.querySelectorAll('[data-registry-action]').forEach(button=>{button.disabled=true;button.title='Record retention changes use clinic administration.';});};
openDirectory=function(){safeNavigate(async()=>{try{await refreshRegistry();const dialog=$('#patient-directory');if(!dialog.open)dialog.showModal();}catch(error){message(error.message,true);}});};
function selectedPatientWorkspaceUrl(id){
 // Patient selection preserves the clinician's original clinical form/subpage.
 // The caller checks the central UUID, never a matching name or demo account.
 const section=activeSection?.definition?activeSection:null;
 const query=new URLSearchParams({patient:id,module:section?.definition[2]||'assessment'});
 query.set('section',section?section.module+':'+section.key:'assessment:biopsychosocial');
 if(section?.module==='assessment'&&section.key==='biopsychosocial'){
  const page=new URLSearchParams(location.search).get('bps_page');
  if(['symptoms','treatment_history','medications','family_origin','medical_substance','developmental_personal','trauma_history'].includes(page))query.set('bps_page',page);
 }
 return '/emr/workspace?'+query.toString();
}
selectPatient=async function(id){
 if(!boot?.patient_directory.some(patient=>patient.id===id)){directoryMessage('Patient unavailable.',true);return;}
 location.assign(selectedPatientWorkspaceUrl(id));
};
registryRequest=async function(action,data={}){
 if(action!=='create')throw Error('Record retention changes use clinic administration.');
 const values={first_name:String(data.first_name||''),last_name:String(data.last_name||''),middle_name:String(data.middle_name||''),dob:String(data.dob||'')};
 const response=await fetch('/api/emr/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({demographics:values})});
 const value=await response.json();if(!response.ok)throw Error(value.error||'Patient save was not confirmed.');return value;
};
let blankWorkspace=false;
const originalCentralApi=api;
api=function(path,options){
 if(blankWorkspace&&options?.method==='POST')return Promise.reject(Error('Select a patient before saving clinical records.'));
 return originalCentralApi(path,options);
};
const originalCentralStart=startClinicalWorkspace;
startClinicalWorkspace=async function(){
 if(initialPatient()){blankWorkspace=false;const opened=await originalCentralStart(false);setNavigationExpanded(true);return opened;}
 try{
  const empty=await api('/api/blank-workspace');
  boot=empty.boot;chart=empty.chart;groupState=empty.groups;patientId='';blankWorkspace=true;
  if(activeSection)view=activeSection.definition[2];setNavigationExpanded(true);render();return true;
 }catch(error){message(error.message,true);return false;}
};
const originalCentralRender=render;
render=function(){
 const result=originalCentralRender();
 if(blankWorkspace&&chart){
  document.querySelector('.local-status').textContent='Blank workspace · not saved';
  $('#chart-header').innerHTML='<section class="patient-header"><div><h2>No patient selected</h2><p>Choose a patient when you are ready to save.</p></div></section>';
  $('#content').querySelectorAll('input,textarea,select').forEach(input=>{
   if(input.type==='hidden'||input.type==='button'||input.type==='submit')return;
   if(input.type==='checkbox'||input.type==='radio'){input.checked=false;return;}
   if(input.tagName==='SELECT'&&!Array.from(input.options).some(option=>option.value===''))input.insertAdjacentHTML('afterbegin','<option value="">Not selected</option>');
   input.value='';
  });
 }
 return result;
};
// Blank forms are available for inspection/editing; they can never write an unbound chart.
document.addEventListener('submit',event=>{
 if(!blankWorkspace||!event.target.closest('#content'))return;
 event.preventDefault();event.stopImmediatePropagation();message('Select a patient before saving clinical records.',true);
},true);
// The menu names/order stay identical to the demo; logout uses the clinic session.
document.addEventListener('click',async event=>{
 if(!event.target.closest('[data-quick-action="logout"]'))return;
 event.preventDefault();event.stopImmediatePropagation();
 safeNavigate(async()=>{try{const response=await fetch('/api/emr/logout',{method:'POST'});if(!response.ok)throw Error('Sign out could not be completed.');location.assign('/login?next=%2Femr');}catch(error){message(error.message,true);}});
},true);


// Clinic Supabase identity bootstrap. The protected /emr/workspace response is
// authorized by the existing clinic session + administrator aal2 MFA; no separate
// browser-local provider registration/login is allowed for the production chart.
// This script loads after the original prototype modules, so their interface is
// retained while their legacy synthetic account/session entry point is replaced.
providerEntry=function(){
 renderGlobalMenu();
 $('#patient-list').replaceChildren();
 $('#chart-header').replaceChildren();
 $('#heading').innerHTML='<div class="eyebrow">INDIAN CREEK EMR</div><h1>Clinic administrator session required</h1>';
 $('#content').innerHTML='<section class="card"><h2>Secure clinical workspace</h2><p>Use your existing Indian Creek administrator account and authenticator MFA. The old prototype provider registrations are not clinic accounts.</p><p><a href="/login?next=%2Femr">Return to clinic sign-in</a> · <a href="/account/security?next=%2Femr">Verify MFA</a></p></section>';
};
providerAPI=function(){
 return Promise.reject(Error('Prototype provider accounts are disabled in the clinic EMR. Use existing administrator credentials and Supabase permissions.'));
};
renderProviderWorkspace=function(){
 renderGlobalMenu();
 $('#chart-header').replaceChildren();
 $('#heading').innerHTML='<h1>Clinic administration</h1>';
 $('#content').innerHTML='<section class="card"><h2>Existing clinic account and services</h2><p>Provider roles and MFA are managed by the clinic, not by a separate synthetic EMR account directory.</p><p><a href="/account/security">Account and MFA</a> · <a href="/admin/assign-test">Psychological assessment assignment</a> · <a href="/appointments">Existing appointment scheduler</a></p></section>';
};
initProviderUI=async function(){
 // Keep the original clinical menus and navigation; replace only account bootstrap.
 bindCalendarNavigation();
 setNavigationExpanded(!matchMedia('(max-width:720px)').matches);
 $('#navigation-toggle').addEventListener('click',()=>setNavigationExpanded($('#navigation-panels').hidden));
 document.addEventListener('click',handleWorkspaceNavigation);
 try{
  const response=await fetch('/api/emr/workflow',{method:'GET',cache:'no-store',credentials:'same-origin'});
  if(!response.ok)throw Error('Administrator session or MFA is no longer valid.');
  const identity=await response.json();
  if(!identity?.me?.id||identity.me.is_admin!==true)throw Error('Clinic administrator authorization was not confirmed.');
  providerMe=identity.me;
  providerPractice={name:'Indian Creek Psychological Services',type:'Clinical practice'};
  providerInfo=null;
  const opened=await startClinicalWorkspace();
  if(opened===false)message('The protected chart could not be opened. No patient was changed or saved.',true);
 }catch(error){
  providerMe=null;boot=null;chart=null;groupState=null;
  providerEntry();
  message(error instanceof Error?error.message:'Clinic administrator session could not be verified.',true);
 }
};


// The production clinic owns scheduling, clinician identities and patient links.
// The prototype's sample appointment/provider views must never masquerade as
// live clinic data or save synthetic assignments alongside the central chart.
const clinicOriginalModuleSectionView=moduleSectionView;
moduleSectionView=function(){
 const section=activeSection?.module+':'+activeSection?.key;
 if(section==='administration:weekly_schedule')return '<section class="card"><h2>Weekly Therapist Schedule</h2><p>The clinic appointment scheduler is the source of booked and recurring appointments. No separate fictional calendar is shown or edited here.</p><p><a class="button-link" href="/appointments">Open actual clinic appointments and calendar</a></p></section>';
 if(section==='administration:assigned_patients')return '<section class="card"><h2>Assigned Patients List</h2><p>Open the protected central patient directory to find existing patient records. This page does not infer clinician assignments from prototype provider accounts.</p><p><a class="button-link" href="/emr/patients">Open central patient directory</a></p></section>';
 if(section==='personal:assigned_provider')return '<section class="card"><h2>Assigned Provider</h2><p>Clinic provider roles and assignments must be verified through existing administrator access. Fictional provider accounts are disabled; no assignment can be made from a prototype account.</p><p><a class="button-link" href="/emr/patients">Review patient chart in central directory</a></p></section>';
 return clinicOriginalModuleSectionView();
};
const clinicOriginalBindCompletedPanels=bindCompletedPanels;
bindCompletedPanels=function(){
 // The prototype binder reads synthetic provider charts and sample appointments.
 // Real-service link pages have no form or sample-calendar handlers to attach.
 if(activeSection?.module==='administration'&&['weekly_schedule','assigned_patients'].includes(activeSection.key))return;
 return clinicOriginalBindCompletedPanels();
};
