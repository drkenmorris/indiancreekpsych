'use client';
import {useEffect,useRef,useState} from 'react';
import ConnectedQuestionnaire,{type SaveRequest} from './ConnectedQuestionnaire';
import type {Definition,Answers} from '@/lib/clinical-tests/connected/definition';
type Loaded={assignment:{id:string;recipientName:string;expiresAt:string};definition:Definition;response:{answers:Answers;page:number;revision:number;status:string;identity_confirmed:boolean}};
export default function ConnectedRecipient({id}:{id:string}){
 const [loaded,setLoaded]=useState<Loaded|null>(null),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false),[started,setStarted]=useState(false);const revision=useRef(0);
 useEffect(()=>{let active=true;fetch('/api/assigned-tests/connected?id='+encodeURIComponent(id),{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(active){revision.current=d.response.revision;setLoaded(d);setConfirmed(d.response.identity_confirmed);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id]);
 async function save(v:SaveRequest){if(!loaded||loaded.assignment.id!==id)throw Error('Assignment changed. Reopen your invitation.');const r=await fetch('/api/assigned-tests/connected',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...v,identityConfirmed:confirmed,expectedRevision:revision.current})}),d=await r.json();if(!r.ok)throw Error(d.error||'Saving was not confirmed.');if(d.revision!==revision.current+1)throw Error('Saved revision could not be verified. Keep this page open.');revision.current=d.revision;}
 if(error)return <p role="alert">{error}</p>;
 if(!loaded)return <p role="status">Loading your questionnaire and saved answers…</p>;
 const d=loaded.definition;
 return <><h1>{d.title}</h1><p>Assigned to <strong>{loaded.assignment.recipientName}</strong></p>{d.introduction.map(p=><p key={p}>{p}</p>)}<p className="asqRecipientNotice">{d.instructions}</p>{started||loaded.response.status==='submitted'?<ConnectedQuestionnaire definition={d} initialAnswers={loaded.response.answers} initialPage={loaded.response.page} readOnly={loaded.response.status==='submitted'} expiresAt={loaded.assignment.expiresAt} onSave={save}/>:<><label className="asqIdentityCheck"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I am {loaded.assignment.recipientName}, the person assigned this questionnaire.</label><button type="button" disabled={!confirmed} onClick={()=>setStarted(true)}>{loaded.response.revision?'Resume questionnaire':'Start questionnaire'}</button></>}</>;
}
