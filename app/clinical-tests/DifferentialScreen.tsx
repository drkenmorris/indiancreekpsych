'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import Link from 'next/link';
import {clinicalSessionStore as store} from '@/lib/clinical-tests/clinicalSessionStore';
import {differentialState,saveFollowup,type Stage} from '@/lib/clinical-tests/dsm/differential';
import {useNavigate} from '@/lib/clinical-tests/navigation';
import './tier-two-progress.css';
const titles={3:'Candidate patterns',4:'Course and alternative explanations',5:'Clarification and overlapping patterns'};
export default function DifferentialScreen({stage}:{stage:Stage}){
 useSyncExternalStore(store.subscribe,store.revision,()=>0);
 const navigate=useNavigate(),heading=useRef<HTMLHeadingElement>(null),[message,setMessage]=useState('');
 const state=differentialState(),units=state.stages[stage],current=units.find(u=>!u.complete);
 useEffect(()=>{heading.current?.focus();setMessage('');},[stage,current?.id]);
 if(!state.ready)return <section><h2>Adult follow-up tiers</h2><p>Complete every selected adult Tier 2 module before beginning Tier 3. Youth follow-up tiers remain in development.</p><Link href="/clinical-tests/dev/summary">View progress report</Link></section>;
 const prerequisite=stage>3&&state.stages[3].some(u=>!u.complete)||stage>4&&state.stages[4].some(u=>!u.complete);
 if(prerequisite)return <section><h2>Complete the earlier follow-up tier</h2><Link href={`/clinical-tests/dev/tier${state.nextStage}`}>Continue the next unfinished tier</Link></section>;
 function advance(){const next=differentialState();navigate(next.complete?'/dev/tier6':`/dev/tier${next.nextStage}`);}
 return <section className="tierTwoReport differentialScreen"><h2 ref={heading} tabIndex={-1}>Tier {stage}: {titles[stage]}</h2><p>Original adult prototype. These questions organize possibilities for clinician assessment; they do not establish DSM diagnoses or rule conditions out.</p><p role="status">{units.filter(u=>u.complete).length} of {units.length} selected areas completed in this tier.</p>{units.length>0&&<progress aria-label={`Tier ${stage} areas completed`} max={units.length} value={units.filter(u=>u.complete).length}/>}
 {current?<form key={current.id} onSubmit={e=>{e.preventDefault();if(saveFollowup(stage,current.id,current.record.answers,true)){const next=differentialState();if(!next.stages[stage].some(u=>!u.complete))advance();}else setMessage('Choose an answer for every question. Unsure and Prefer to discuss privately are valid answers.');}}>
 <h3>{current.title}</h3><p>If there is an immediate safety concern or a sudden change in awareness, seek prompt direct clinical or medical assessment; this preview does not alert a clinician.</p><ul>{current.reasons.map(r=><li key={r}>{r}</li>)}</ul>
 {current.questions.map(q=><fieldset key={q.id}><legend>{q.text}</legend><div className="differentialChoices">{q.choices.map(choice=><label key={choice}><input type="radio" name={q.id} value={choice} checked={current.record.answers[q.id]===choice} onChange={()=>saveFollowup(stage,current.id,{...current.record.answers,[q.id]:choice})}/>{choice}</label>)}</div></fieldset>)}
 <p role="alert">{message}</p><button type="submit">Complete this area and continue</button><p>Answers stay in this open fictional session. A full refresh clears them.</p></form>:<><p>{units.length?'This tier is complete.':'No additional areas are selected for this tier.'}</p><button onClick={advance}>Continue to {state.complete?'Tier 6 clarification':`Tier ${state.nextStage}`}</button></>}
 {units.some(u=>u.complete)&&<details><summary>Review completed areas in this tier</summary>{units.filter(u=>u.complete).map(u=><article key={u.id}><h3>{u.title}</h3>{u.questions.map(q=><p key={q.id}>{q.text}<br/><strong>{u.record.answers[q.id]}</strong></p>)}<button type="button" onClick={()=>saveFollowup(stage,u.id,u.record.answers,false)}>Revise {u.title}</button></article>)}</details>}
 <Link href="/clinical-tests/dev/summary">View current report</Link></section>;
}
