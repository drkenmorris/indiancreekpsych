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
selectPatient=async function(id){
 if(!boot?.patient_directory.some(patient=>patient.id===id)){directoryMessage('Patient unavailable.',true);return;}
 const query=new URLSearchParams({patient:id,module:'demographics'});
 location.assign('/emr/workspace?'+query.toString());
};
registryRequest=async function(action,data={}){
 if(action!=='create')throw Error('Record retention changes use clinic administration.');
 const values={first_name:String(data.first_name||''),last_name:String(data.last_name||''),middle_name:String(data.middle_name||''),dob:String(data.dob||'')};
 const response=await fetch('/api/emr/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({demographics:values})});
 const value=await response.json();if(!response.ok)throw Error(value.error||'Patient save was not confirmed.');return value;
};
const originalCentralStart=startClinicalWorkspace;
startClinicalWorkspace=async function(){
 if(initialPatient())return originalCentralStart(false);
 try{const patients=await centralRegistry();boot={patients,patient_directory:patients};chart=null;patientId='';render();openDirectory();return true;}
 catch(error){message(error.message,true);return false;}
};
const originalCentralRender=render;
render=function(){
 if(providerMe&&!chart&&view!=='schedule'&&!['providers','settings'].includes(view)){
  renderGlobalMenu();$('#heading').innerHTML='<h1>'+esc(mainModules[mainModule]?.[0]||'Personal Data')+'</h1>';
  $('#chart-header').replaceChildren();$('#content').innerHTML='<section class="card"><h2>Find or add a patient</h2><p>Use Home → Find/Add Patient to open a patient record.</p></section>';return;
 }
 return originalCentralRender();
};
// The menu names/order stay identical to the demo; logout uses the clinic session.
document.addEventListener('click',async event=>{
 if(!event.target.closest('[data-quick-action="logout"]'))return;
 event.preventDefault();event.stopImmediatePropagation();
 safeNavigate(async()=>{try{const response=await fetch('/api/emr/logout',{method:'POST'});if(!response.ok)throw Error('Sign out could not be completed.');location.assign('/login?next=%2Femr');}catch(error){message(error.message,true);}});
},true);
