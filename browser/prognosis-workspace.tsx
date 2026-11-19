import {createRoot,type Root} from 'react-dom/client';
import {createElement} from 'react';
import DischargeDetails from '../app/emr/discharge/DischargeDetails';
import PrognosisForm from '../app/emr/prognosis/PrognosisForm';
import '../app/emr/central-emr.css';
import '../app/emr/treatment-response/response.css';
const content=document.getElementById('content');
if(content){
 let host:HTMLElement|null=null,root:Root|null=null;
 const sync=()=>{const next=content.querySelector<HTMLElement>('#patient-prognosis-page, #patient-discharge-page');if(next===host)return;root?.unmount();root=null;host=next;if(!host)return;const patientId=host.dataset.patientId??'';if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(patientId)){host.textContent='Select a patient using Find/Add Patient before entering prognosis.';return;}root=createRoot(host);root.render(host.id==='patient-discharge-page'?createElement(DischargeDetails,{patientId}):createElement(PrognosisForm,{patientId}));};
 new MutationObserver(sync).observe(content,{childList:true});sync();
}
