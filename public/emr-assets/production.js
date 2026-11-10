
'use strict';
const originalProductionRender=render;
render=function(){if(view==='plan'&&patientId){location.assign('/emr/treatment-plan?patient='+encodeURIComponent(patientId));return;}if(view==='groups'){location.assign('/emr/groups');return;}if(view==='schedule'){renderGlobalMenu();$('#heading').innerHTML='<h1>Appointment Scheduler</h1>';$('#content').innerHTML='<section class="card"><p>Use the clinic scheduler for live appointments.</p><a href="/appointments">Open Indian Creek scheduling</a></section>';return;}return originalProductionRender();};
const centralOriginalSettings=settingsSection;
settingsSection=function(key,label){if(key==='database')return configCard(label,'<p>This chart is stored in the central patient repository with saved revision history. Database operations require clinic administration.</p>');return centralOriginalSettings(key,label);};
window.addEventListener('DOMContentLoaded',()=>{const billing=document.querySelector('a[href="/?module=billing"]');if(billing)billing.href='/emr/workspace?patient='+encodeURIComponent(new URLSearchParams(location.search).get('patient')||'')+'&module=billing';});
const centralOriginalMessage=message;
message=function(text,error=false){centralOriginalMessage(String(text).replace(/ locally\./g,' to the central patient record.').replace(/Saved locally/g,'Saved centrally'),error);};
const centralOriginalQuickMenus=renderQuickMenus;
renderQuickMenus=function(){centralOriginalQuickMenus();const nav=document.querySelector('#provider-quick-menu nav');if(nav&&patientId){const link=document.createElement('a');link.href='/emr?patient='+encodeURIComponent(patientId);link.textContent='DSM assessment records';nav.append(link);}};
