import {createRoot,type Root} from 'react-dom/client';
import {createElement} from 'react';
import SoapNotes from '../app/emr/soap-notes/SoapNotes';
import PatientProgressNotes from '../app/emr/PatientProgressNotes';
import '../app/emr/central-emr.css';
import './soap-workspace.css';

// Mount the same patient-bound SOAP form directly in the legacy workspace.
// Observe only page replacement, not React's own field updates.
export function mountSoapWorkspace(content:HTMLElement){
 let host:HTMLElement|null=null,root:Root|null=null;
 function sync(){
  const next=content.querySelector<HTMLElement>('#patient-soap-page, #patient-amendments-page');
  if(next===host)return;
  root?.unmount();root=null;host=next;
  if(!host)return;
  const patientId=host.dataset.patientId??'';
  if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(patientId)){
   host.textContent='Select a patient from Find/Add Patient before entering SOAP notes.';return;
  }
  root=createRoot(host);root.render(host.id==='patient-amendments-page'?createElement(PatientProgressNotes,{patientId,inWorkspace:true}):createElement(SoapNotes,{patientId,inWorkspace:true}));
 }
 const observer=new MutationObserver(sync);observer.observe(content,{childList:true});sync();
 return ()=>{observer.disconnect();root?.unmount();root=null;host=null;};
}
const content=document.getElementById('content');
if(content)mountSoapWorkspace(content);
