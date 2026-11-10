
'use strict';
const originalProductionRender=render;
render=function(){if(view==='plan'&&patientId){location.assign('/emr/treatment-plan?patient='+encodeURIComponent(patientId));return;}if(view==='groups'){location.assign('/emr/groups');return;}if(view==='schedule'){renderGlobalMenu();$('#heading').innerHTML='<h1>Appointment Scheduler</h1>';$('#content').innerHTML='<section class="card"><p>Use the clinic scheduler for live appointments.</p><a href="/appointments">Open Indian Creek scheduling</a></section>';return;}const result=originalProductionRender();
 if(view==='assessment'&&activeSection?.key==='biopsychosocial'&&patientId){
  const content=document.querySelector('#content');
  if(content){
   const panel=document.createElement('section');panel.className='card';
   panel.setAttribute('aria-label','Linked 21-section intake biopsychosocial review');
   const heading=document.createElement('h2');heading.textContent='Review linked patient intake in this assessment';
   const detail=document.createElement('p');
   detail.textContent='Review all 21 patient-reported intake sections and explicitly save a separate unsigned clinician-reviewed BPS history snapshot. The source is not automatically accepted as a diagnosis, medication reconciliation, or legal authorization.';
   const link=document.createElement('a');
   link.href='/emr/bps-intake?patient='+encodeURIComponent(patientId);
   link.textContent='Open 21-section intake → BPS clinician review';
   panel.append(heading,detail,link);content.prepend(panel);
  }
 }
 return result;};
const centralOriginalSettings=settingsSection;
settingsSection=function(key,label){if(key==='database')return configCard(label,'<p>This chart is stored in the central patient repository with saved revision history. Database operations require clinic administration.</p>');return centralOriginalSettings(key,label);};
window.addEventListener('DOMContentLoaded',()=>{const billing=document.querySelector('a[href="/?module=billing"]');if(billing)billing.href='/emr/workspace?patient='+encodeURIComponent(new URLSearchParams(location.search).get('patient')||'')+'&module=billing';});
const centralOriginalMessage=message;
message=function(text,error=false){centralOriginalMessage(String(text).replace(/ locally\./g,' to the central patient record.').replace(/Saved locally/g,'Saved centrally'),error);};
const centralOriginalQuickMenus=renderQuickMenus;
renderQuickMenus=function(){centralOriginalQuickMenus();const nav=document.querySelector('#provider-quick-menu nav');if(nav&&patientId){const link=document.createElement('a');link.href='/emr?patient='+encodeURIComponent(patientId);link.textContent='DSM assessment records';nav.append(link);}};
