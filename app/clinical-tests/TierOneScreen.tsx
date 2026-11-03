"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {clinicalSessionStore as store} from '@/lib/clinical-tests/clinicalSessionStore';
import {TIER_ONE as D, DRAFT_KEY,HANDOFF_KEY,DEFINITION_SHA256,validAnswers,evaluateTierOne,createHandoff,readHandoff,type Answers} from '@/lib/clinical-tests/dsm/tier-one';
import './tier-one.css';

export default function TierOneScreen(){
 const [answers,setAnswers]=useState<Answers>({});
 const [adult,setAdult]=useState(false),[step,setStep]=useState(0),[completed,setCompleted]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('');
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  try {const draft=JSON.parse(store.getItem(DRAFT_KEY)||'null');
   if(draft?.version===D.version&&draft.definitionHash===DEFINITION_SHA256&&validAnswers(draft.answers)){
    setAnswers(draft.answers);setAdult(draft.adultConfirmed===true);
    setStep(Number.isInteger(draft.step)&&draft.step>=0&&draft.step<=20?draft.step:0);
    const handoff=readHandoff(store.getItem(HANDOFF_KEY));
    setCompleted(!!handoff&&JSON.stringify(handoff.answers)===JSON.stringify(draft.answers)&&draft.adultConfirmed===true);
   }else{store.removeItem(HANDOFF_KEY);}
  }catch{store.removeItem(HANDOFF_KEY);}setReady(true);
 },[]);
 useEffect(()=>{if(ready)heading.current?.focus();},[step,ready]);
 const result=evaluateTierOne(answers,adult);
 function persist(nextAnswers:Answers,nextAdult:boolean,nextStep:number){store.setItem(DRAFT_KEY,JSON.stringify({version:D.version,definitionHash:DEFINITION_SHA256,answers:nextAnswers,adultConfirmed:nextAdult,step:nextStep}));}
 function edit(id:string,value:string){const next={...answers,[id]:value};setAnswers(next);setCompleted(false);setError('');store.removeItem(HANDOFF_KEY);persist(next,adult,step);}
 function move(next:number){setStep(next);setError('');persist(answers,adult,next);}
 const domain=step>0&&step<20?D.domains[step-1]:null;
 const stepComplete=step===0?adult&&D.safety.every(q=>answers[q.id]):domain?.questions.every(q=>answers[q.id]);
 function next(){if(!stepComplete){setError(step===0?'Confirm the adult self-report scope and select a response for each safety question.':'Select one response for each statement. Unsure or a private discussion are available.');return;}move(step+1);}
 function finish(){if(!result.complete){setError('Some responses are missing. Use the section list to finish them before preparing Tier 2.');return;}store.setItem(HANDOFF_KEY,JSON.stringify(createHandoff(answers,adult)));setCompleted(true);setError('');}
 function reset(){if(!window.confirm('Clear this fictional screening session and its Tier 2 routing?'))return;store.removeItem(DRAFT_KEY);store.removeItem(HANDOFF_KEY);setAnswers({});setAdult(false);setCompleted(false);setError('');setStep(0);}
 function question(q:{id:string;text:string},safety=false){return <fieldset key={q.id} className="tierOneQuestion"><legend>{q.text}</legend><div className="tierOneChoices">{(safety?D.safetyChoices:D.choices).map(choice=><label key={choice}><input type="radio" name={q.id} value={choice} checked={answers[q.id]===choice} onChange={()=>edit(q.id,choice)}/><span>{choice}</span></label>)}</div></fieldset>;}
 if(!ready)return <p role="status">Opening Tier 1…</p>;
 return <section className="tierOne" aria-label="Tier 1 adult domain screening">
  <header><p className="tierOneEyebrow">Tier 1 → targeted Tier 2 → clinician evaluation</p><h2>Adult 19-domain screening</h2><p>{D.instructions}</p><p><strong>Original questionnaire · version {D.version} · ages 18 and older.</strong> This is your custom 19-domain design, separate from the APA’s official DSM cross-cutting measures. Clinical review is required before patient use.</p><p>Fictional administrator preview only. Answers stay in this open application session; a full refresh or closing the page clears them. Nothing is sent to the EMR, and this page does not alert the office.</p></header>
  {(result.safetyFlag||result.safetyReview)&&<aside className="tierOneSafety" role="alert"><strong>{result.safetyFlag?'Safety concern reported — direct clinical review needed.':'Safety response needs a private clinical review.'}</strong><p>Do not wait for Tier 2 to address immediate danger. If you or someone else cannot stay safe, seek emergency assistance now. This questionnaire does not assess or determine safety and does not notify a clinician.</p></aside>}
  <div className="tierOneProgress"><label htmlFor="tier-one-progress">{result.answered} of {result.total} responses recorded</label><progress id="tier-one-progress" value={result.answered} max={result.total}/></div>
  <div className="tierOneLayout"><nav aria-label="Tier 1 sections"><button type="button" aria-current={step===0?'step':undefined} onClick={()=>move(0)}>Start and safety check</button>{D.domains.map((d,i)=><button type="button" key={d.id} aria-current={step===i+1?'step':undefined} onClick={()=>move(i+1)}>{i+1}. {d.title}<small>{result.domains[i].answered}/3 answered</small></button>)}<button type="button" aria-current={step===20?'step':undefined} onClick={()=>move(20)}>Review and Tier 2 plan</button></nav>
  <div className="tierOneContent"><h3 ref={heading} tabIndex={-1}>{step===0?'Start and safety check':domain?`${step} of 19 · ${domain.title}`:'Review and Tier 2 plan'}</h3>
  {step<20?<form onSubmit={e=>{e.preventDefault();next();}} autoComplete="off">
   {step===0?<><label className="tierOneAdult"><input name="adultConfirmed" type="checkbox" checked={adult} onChange={e=>{setAdult(e.target.checked);setCompleted(false);store.removeItem(HANDOFF_KEY);persist(answers,e.target.checked,step);}}/>I am previewing the adult self-report version for someone aged 18 or older.</label><p>You may select Unsure or Prefer to discuss privately. These responses are recorded for review, rather than counted as No. Youth versions will require separate wording and review.</p>{D.safety.map(q=>question(q,true))}</>:domain?<><p>{domain.instructions}</p>{domain.questions.map(q=>question(q))}<p className="tierOneHelp">A current or past concern selects this area for Tier 2 after Tier 1 is complete. Unsure or private responses are listed for clinician review. Duration and severity will be explored in follow-up.</p></>:null}
   {error&&<p role="alert" className="tierOneError">{error}</p>}<div className="tierOneActions">{step>0&&<button type="button" onClick={()=>move(step-1)}>Previous</button>}<button type="submit">{step===19?'Review Tier 1':'Next section'}</button></div>
  </form>:<>
   <p>{result.complete?'All Tier 1 responses are recorded.':'Tier 1 is incomplete. Unanswered items are not negative responses.'} No diagnostic score is calculated. A domain with no reported concern is not ruled out.</p>
   <p><strong>{result.domains.filter(d=>d.status==='follow-up').length} domains with reported concerns</strong> · {result.reviewDomains.length} domains needing clarification or private review.</p>
   <ul className="tierOneResults">{result.domains.map((d,i)=><li key={d.id}><strong>{d.title}</strong><span>{d.status==='follow-up'?'Tier 2 follow-up selected':d.status==='review'?'Clinician review / private discussion':d.status==='no-concern'?'No concern reported on these items':'Responses still needed'} · {d.answered}/3 answered</span>{d.reasons.length>0&&<details><summary>Review responses</summary><ul>{d.reasons.map(r=><li key={r}>{r}</li>)}</ul></details>}<button type="button" onClick={()=>move(i+1)}>Review this domain</button>{completed&&result.routedDomains.includes(d.id)&&<Link href={`/clinical-tests/dev/${d.path}`}>Open Tier 2: {d.title}</Link>}</li>)}</ul>
   {error&&<p role="alert" className="tierOneError">{error}</p>}
   <button type="button" onClick={finish} disabled={!result.complete}>{completed?'Tier 2 plan prepared':'Complete Tier 1 and prepare Tier 2'}</button>
   {completed&&<div className="tierOneHelp" role="status"><strong>Tier 2 plan prepared.</strong><p>{result.routedDomains.length?'Open only the selected domain links above.':'No automatic Tier 2 domains were selected.'} {result.reviewDomains.length?'The review domains still need a clinician’s decision.':''} Clinical judgment may add follow-up even when none is automatically selected. Safety review remains separate. The existing Tier 2 modules are still prototypes and require their own review.</p></div>}
   <button type="button" onClick={()=>move(19)}>Previous</button>
  </>}
  </div></div><footer><button type="button" onClick={reset}>Clear fictional screening session</button><p>Definition and routing version {D.version}. Original screening content, not an APA instrument or a validated diagnostic test. Historical imported screening results are not rewritten.</p></footer>
 </section>;
}
