'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {clinicalSessionStore as store} from '@/lib/clinical-tests/clinicalSessionStore';
import {activePlan,progressRecords,moduleStatus,clearModule} from '@/lib/clinical-tests/dsm/tier-two-progress';
import {evidenceItems,saveEvidence} from '@/lib/clinical-tests/dsm/evidence';
import {useNavigate} from '@/lib/clinical-tests/navigation';
export default function StructuredEvidenceScreen({domain}:{domain:string}){
 useSyncExternalStore(store.subscribe,store.revision,()=>0);const heading=useRef<HTMLHeadingElement>(null),[message,setMessage]=useState(''),navigate=useNavigate();
 useEffect(()=>{heading.current?.focus();},[domain]);
 const plan=activePlan(),items=evidenceItems(domain),record=progressRecords(plan)[domain],answers=record?.answers??{},title=plan?.handoff.domains.find(d=>d.id===domain)?.title;
 const remaining=items.filter(q=>answers[q.id]===undefined).length;
 function finish(){if(!saveEvidence(domain,answers as Record<string,number>,true)){setMessage('Choose an answer for every item, including context. Unsure and private responses are valid.');return;}const records=progressRecords();const next=plan?.handoff.domains.find(d=>plan.handoff.routedDomains.includes(d.id)&&moduleStatus(records[d.id])!=='Completed');navigate(next?'/dev/'+next.path:'/dev/tier3');}
 return <section className="tierTwoReport differentialScreen"><h2 ref={heading} tabIndex={-1}>Tier 2 — {title}</h2><p>Structured adult evidence review · original prototype. Rate each symptom using the period stated in the item. Where no period is stated, describe the current or most recent period of difficulty. Occurrence, duration and impact use separate response choices.</p><p role="status">{items.length-remaining} of {items.length} items answered. {record?.completedAt?'Completed; changing an answer reopens this module.':''}</p><progress aria-label="Evidence items answered" value={items.length-remaining} max={items.length}/>
 <form onSubmit={e=>{e.preventDefault();finish();}}>{items.map(q=><fieldset key={q.id}><legend>{q.text}</legend><div className="differentialChoices">{q.choices.map((label,i)=><label key={label}><input type="radio" name={q.id} checked={answers[q.id]===i} onChange={()=>{saveEvidence(domain,{...answers,[q.id]:i} as Record<string,number>);setMessage('');}}/>{label}</label>)}</div></fieldset>)}
 {(Number(answers['evidence:threat'])>0||Number(answers['death_thoughts'])>0)&&<aside className="tierTwoReview">A safety-related response needs direct clinical review now. This preview does not alert a clinician, establish safety, or replace a current safety assessment.</aside>}
 <p role="alert">{message}</p><div className="tierTwoTrackerActions"><button type="submit" disabled={remaining>0}>Complete module</button><button type="button" onClick={()=>setMessage('Draft retained in this open fictional session.')}>Save draft</button><button type="button" onClick={()=>{if(window.confirm('Clear only this module’s fictional answers?'))clearModule(domain);}}>Reset</button></div></form><p>Unlinked answers are held only in this open session. Connected assessments are saved through the central record controls above.</p></section>;
}
