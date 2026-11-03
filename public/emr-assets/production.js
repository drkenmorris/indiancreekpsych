
'use strict';
const originalProductionRender=render;
render=function(){if(view==='groups'){renderGlobalMenu();$('#heading').innerHTML='<h1>Treatment Teams / Groups</h1>';$('#content').innerHTML='<section class="card"><p>Shared treatment-group records require explicit participant and care-team permissions. Individual patient records are available in the other modules.</p></section>';return;}if(view==='schedule'){renderGlobalMenu();$('#heading').innerHTML='<h1>Appointment Scheduler</h1>';$('#content').innerHTML='<section class="card"><p>Use the clinic scheduler for live appointments.</p><a href="/appointments">Open Indian Creek scheduling</a></section>';return;}return originalProductionRender();};
const centralOriginalSettings=settingsSection;
settingsSection=function(key,label){if(key==='database')return configCard(label,'<p>This chart is stored in the central patient repository with saved revision history. Database operations require clinic administration.</p>');return centralOriginalSettings(key,label);};
window.addEventListener('DOMContentLoaded',()=>{const billing=document.querySelector('a[href="/?module=billing"]');if(billing)billing.href='/emr/workspace?patient='+encodeURIComponent(new URLSearchParams(location.search).get('patient')||'')+'&module=billing';});
