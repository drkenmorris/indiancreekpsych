'use client';
import {useEffect,useRef,useState} from 'react';
import SevenQuestionForm,{type AsqAnswers,type AsqSaveRequest} from './SevenQuestionForm';
import {asqRoleLabels,type AsqDefinition,type AsqRole} from '@/lib/clinical-tests/asq-forms';
type Loaded={assignment:{id:string;recipientName:string;role:AsqRole;expiresAt:string};definition:AsqDefinition;response:{answers:AsqAnswers;page:number;revision:number;status:string;identity_confirmed:boolean}};
export default function AsqRecipient({id}:{id:string}){
 const [loaded,setLoaded]=useState<Loaded|null>(null),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false),[started,setStarted]=useState(false);const revision=useRef(0);
 useEffect(()=>{let active=true;fetch('/api/assigned-tests/asq?id='+encodeURIComponent(id),{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(active){revision.current=d.response.revision;setLoaded(d);setConfirmed(d.response.identity_confirmed);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id]);
 async function save(request:AsqSaveRequest){if(!loaded||loaded.assignment.id!==id)throw Error('Assignment changed. Reopen the invitation.');const r=await fetch('/api/assigned-tests/asq',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...request,expectedRevision:revision.current,identityConfirmed:confirmed})});const d=await r.json();if(!r.ok)throw Error(d.error||'Saving was not confirmed.');if(!Number.isInteger(d.revision)||d.revision!==revision.current+1)throw Error('Saved revision could not be verified. Please keep this page open.');revision.current=d.revision;}
 if(error)return <p role="alert">{error}</p>;
 if(!loaded||loaded.assignment.id!==id)return <p role="status">Loading your assigned questionnaire and saved answers…</p>;
 const submitted=loaded.response.status==='submitted';
 return <><h1>ASQ / ASEQ — {asqRoleLabels[loaded.assignment.role]}</h1><p>Assigned to <strong>{loaded.assignment.recipientName}</strong></p><p className="asqRecipientNotice">Answer based on your own observations. You will see seven questions at a time. Choose <strong>Save and next</strong> to record this page before continuing. You can save a partial page and return using this invitation and the same sign-in. This questionnaire informs clinician review and does not establish a diagnosis.</p>
 {started||submitted?<SevenQuestionForm key={id} definition={loaded.definition} initialAnswers={loaded.response.answers} initialPage={loaded.response.page} readOnly={submitted} onSave={save}/>:<><label className="asqIdentityCheck"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I am {loaded.assignment.recipientName}, and I am completing the assigned {asqRoleLabels[loaded.assignment.role]} questionnaire.</label><button type="button" disabled={!confirmed} onClick={()=>setStarted(true)}>{loaded.response.revision?'Resume questionnaire':'Start questionnaire'}</button></>}
 </>;
}
