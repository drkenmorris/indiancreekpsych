"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useNavigate} from '@/lib/clinical-tests/navigation';
import {clinicalSessionStore as store} from '@/lib/clinical-tests/clinicalSessionStore';
import {ADULT_PROFILE,HANDOFF_KEY,validAnswers,evaluateTierOne,createHandoff,readHandoff,type Answers,type ScreenProfile} from '@/lib/clinical-tests/dsm/tier-one';
import {SELECTION_KEY,appropriateProfile} from '@/lib/clinical-tests/dsm/profiles';
import './tier-one.css';

export function TierOneQuestionnaire({profile=ADULT_PROFILE,onChangeVersion,scopeConfirmed=false}:{profile?:ScreenProfile;onChangeVersion?:()=>void;scopeConfirmed?:boolean}){
 const navigate=useNavigate();
 const D=profile.definition,DRAFT_KEY=profile.draftKey,DEFINITION_SHA256=profile.hash;
 function clearHandoff(){store.removeItem(profile.handoffKey);store.removeItem(HANDOFF_KEY);}
 function writeHandoff(){const handoff=createHandoff(answers,adult,profile);const raw=JSON.stringify(handoff);store.setItem(profile.handoffKey,raw);if(profile.id==='adult')store.setItem(HANDOFF_KEY,raw);return handoff;}

 const [answers,setAnswers]=useState<Answers>({});
 const [adult,setAdult]=useState(scopeConfirmed),[step,setStep]=useState(0),[completed,setCompleted]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('');
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  try {const draft=JSON.parse(store.getItem(DRAFT_KEY)||'null');
   if(draft?.version===D.version&&draft.definitionHash===DEFINITION_SHA256&&validAnswers(draft.answers,profile)){
    setAnswers(draft.answers);setAdult(scopeConfirmed||(draft.populationConfirmed??draft.adultConfirmed)===true);
    setStep(Number.isInteger(draft.step)&&draft.step>=0&&draft.step<=20?draft.step:0);
    const handoff=readHandoff(store.getItem(profile.handoffKey)||(profile.id==='adult'?store.getItem(HANDOFF_KEY):null),profile);
    const approved=!!handoff&&JSON.stringify(handoff.answers)===JSON.stringify(draft.answers)&&(draft.populationConfirmed??draft.adultConfirmed)===true;
    setCompleted(approved);if(approved&&profile.id==='adult')store.setItem(HANDOFF_KEY,JSON.stringify(handoff));
   }else{clearHandoff();}
  }catch{clearHandoff();}setReady(true);
 },[profile,scopeConfirmed]);
 useEffect(()=>{if(ready&&step>0)heading.current?.focus();},[step,ready]);
 const result=evaluateTierOne(answers,adult,profile);
 function persist(nextAnswers:Answers,nextAdult:boolean,nextStep:number){store.setItem(DRAFT_KEY,JSON.stringify({version:D.version,definitionHash:DEFINITION_SHA256,answers:nextAnswers,populationConfirmed:nextAdult,adultConfirmed:profile.id==='adult'&&nextAdult,step:nextStep}));}
 function edit(id:string,value:string){const next={...answers,[id]:value};setAnswers(next);setCompleted(false);setError('');clearHandoff();persist(next,adult,step);}
 function move(next:number){setStep(next);setError('');persist(answers,adult,next);}
 const domain=step>0&&step<20?D.domains[step-1]:null;
 const stepComplete=step===0?adult&&D.safety.every(q=>answers[q.id]):domain?.questions.every(q=>answers[q.id]);
 function next(){if(!stepComplete){setError(step===0?'Confirm the selected respondent and age scope and select a response for each safety question.':'Select one response for each statement. Unsure or a private discussion are available.');return;}if(step===19){finish();return;}move(step+1);}
 function finish(){if(!result.complete){const missing=!adult||D.safety.some(q=>!answers[q.id])?0:D.domains.findIndex(d=>d.questions.some(q=>!answers[q.id]))+1;move(Math.max(0,missing));setError(!adult?'Confirm the selected age and respondent version to continue.':'Please answer the remaining questions in this section. Unsure or a private discussion are valid responses.');return;}move(20);const handoff=writeHandoff();setCompleted(true);setError('');const first=handoff.domains.find(d=>handoff.routedDomains.includes(d.id));navigate(profile.id==='adult'&&first?'/dev/'+first.path:'/dev/summary');}
 function reset(){if(!window.confirm('Clear this fictional screening session and its Tier 2 routing?'))return;store.removeItem(DRAFT_KEY);clearHandoff();setAnswers({});setAdult(scopeConfirmed);setCompleted(false);setError('');setStep(0);}
 function question(q:{id:string;text:string},safety=false){return <fieldset key={q.id} className="tierOneQuestion"><legend>{q.text}</legend><div className="tierOneChoices">{(safety?D.safetyChoices:D.choices).map(choice=><label key={choice}><input type="radio" name={q.id} value={choice} checked={answers[q.id]===choice} onChange={()=>edit(q.id,choice)}/><span>{choice}</span></label>)}</div></fieldset>;}
 if(!ready)return <p role="status">Opening Tier 1…</p>;
 return <section className="tierOne" aria-label={`Tier 1 ${profile.title} domain screening`}>
  <header><p className="tierOneEyebrow">Tier 1 → targeted Tier 2 → clinician evaluation</p><h2>{profile.title} · 19-domain screening</h2>{onChangeVersion&&<button type="button" onClick={onChangeVersion}>Change age group or respondent</button>}<p>{D.instructions}</p><p><strong>Original questionnaire · version {D.version} · {profile.populationLabel}.</strong> This is your custom 19-domain design, separate from the APA’s official DSM cross-cutting measures. Clinical review is required before patient use.</p><p>Administrator assessment prototype. Connected assessments save to the selected central patient record; unlinked previews remain in the open session. Check the connected-record banner for save status before closing or reloading. This page does not alert the office.</p></header>
  {(result.safetyFlag||result.safetyReview)&&<aside className="tierOneSafety" role="alert"><strong>{result.safetyFlag?'Safety concern reported — direct clinical review needed.':'Safety response needs a private clinical review.'}</strong><p>Do not wait for Tier 2 to address immediate danger. If you or someone else cannot stay safe, seek emergency assistance now. This questionnaire does not assess or determine safety and does not notify a clinician.</p></aside>}
  <div className="tierOneProgress"><label htmlFor="tier-one-progress">{result.answered} of {result.total} responses recorded</label><progress id="tier-one-progress" value={result.answered} max={result.total}/></div>
  <div className="tierOneLayout"><nav aria-label="Tier 1 sections"><button type="button" aria-current={step===0?'step':undefined} onClick={()=>move(0)}>Start and safety check</button>{D.domains.map((d,i)=><button type="button" key={d.id} aria-current={step===i+1?'step':undefined} onClick={()=>move(i+1)}>{i+1}. {d.title}<small>{result.domains[i].answered}/3 answered</small></button>)}<button type="button" aria-current={step===20?'step':undefined} onClick={()=>move(20)}>Review and Tier 2 plan</button></nav>
  <div className="tierOneContent"><h3 ref={heading} tabIndex={-1}>{step===0?'Start and safety check':domain?`${step} of 19 · ${domain.title}`:'Review and Tier 2 plan'}</h3>
  {step<20?<form onSubmit={e=>{e.preventDefault();next();}} autoComplete="off">
   {step===0?<>{scopeConfirmed?<p><strong>Version confirmed:</strong> {profile.populationLabel}</p>:<label className="tierOneAdult"><input name="adultConfirmed" type="checkbox" checked={adult} onChange={e=>{setAdult(e.target.checked);setCompleted(false);clearHandoff();persist(answers,e.target.checked,step);}}/>{profile.scopeLabel}</label>}<p>You may select {profile.id==='parent'?'Not observed / do not know':'Unsure'} or Prefer to discuss privately. These responses are recorded for review, rather than counted as No. {profile.id==='parent'?'Describe only what you have observed or the child has shared. Unknown experiences must not be guessed. This report does not replace a private conversation with the child.':profile.id==='adolescent'?'You may ask to talk privately with a clinician. This preview does not promise confidentiality or send an alert to anyone.':'Use the version selector for adolescent or parent/guardian reports.'}</p>{D.safety.map(q=>question(q,true))}</>:domain?<><p>{domain.instructions}</p>{domain.questions.map(q=>question(q))}<p className="tierOneHelp">A current or past concern selects this area for Tier 2 after Tier 1 is complete. Unsure or private responses are listed for clinician review. Duration and severity will be explored in follow-up.</p></>:null}
   {error&&<p role="alert" className="tierOneError">{error}</p>}<div className="tierOneActions">{step>0&&<button type="button" onClick={()=>move(step-1)}>Previous</button>}<button type="submit">{step===19?'Continue to selected Tier 2 questions':'Next section'}</button></div>
  </form>:<>
   <button type="button" onClick={finish} disabled={completed}>{completed?'Tier 2 plan prepared':'Continue to selected Tier 2 questions'}</button>
   <p>{result.complete?'All Tier 1 responses are recorded.':'Tier 1 is incomplete. Unanswered items are not negative responses.'} No diagnostic score is calculated. A domain with no reported concern is not ruled out.</p>
   <p><strong>{result.domains.filter(d=>d.status==='follow-up').length} domains with reported concerns</strong> · {result.reviewDomains.length} domains needing clarification or private review.</p>
   <ul className="tierOneResults">{result.domains.map((d,i)=><li key={d.id}><strong>{d.title}</strong><span>{d.status==='follow-up'?'Tier 2 follow-up selected':d.status==='review'?'Clinician review / private discussion':d.status==='no-concern'?'No concern reported on these items':'Responses still needed'} · {d.answered}/3 answered</span>{d.reasons.length>0&&<details><summary>Review responses</summary><ul>{d.reasons.map(r=><li key={r}>{r}</li>)}</ul></details>}<button type="button" onClick={()=>move(i+1)}>Review this domain</button>{completed&&profile.id==='adult'&&result.routedDomains.includes(d.id)&&<Link href={`/clinical-tests/dev/${d.path}`}>Open Tier 2: {d.title}</Link>}{completed&&profile.id!=='adult'&&result.routedDomains.includes(d.id)&&<span className="tierOneHelp">Youth follow-up selected — clinician review and age-appropriate Tier 2 questions needed.</span>}</li>)}</ul>
   {error&&<p role="alert" className="tierOneError">{error}</p>}

   {completed&&<div className="tierOneHelp" role="status"><strong>Tier 2 plan prepared.</strong><p>{result.routedDomains.length?(profile.id==='adult'?'Open only the selected domain links above.':'The selected domains are recorded in this youth follow-up plan. Adult Tier 2 questionnaires are not opened for youth reports; age-appropriate Tier 2 modules still need development.'):'No automatic Tier 2 domains were selected.'} {result.reviewDomains.length?'The review domains still need a clinician’s decision.':''} Clinical judgment may add follow-up even when none is automatically selected. Safety review remains separate. The existing Tier 2 modules are still prototypes and require their own review.</p></div>}
   <button type="button" onClick={()=>move(19)}>Previous</button>
  </>}
  </div></div><footer><button type="button" onClick={reset}>Clear fictional screening session</button><p>Definition and routing version {D.version}. Original screening content, not an APA instrument or a validated diagnostic test. Historical imported screening results are not rewritten.</p></footer>
 </section>;
}


export default function TierOneScreen(){
 const [profile,setProfile]=useState<ScreenProfile|null>(null),[age,setAge]=useState(''),[respondent,setRespondent]=useState(''),[ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{try{const selected=JSON.parse(store.getItem(SELECTION_KEY)||'null');const p=appropriateProfile(selected?.age,selected?.respondent);if(p){setAge(selected.age);setRespondent(selected.respondent);setProfile(p);}}catch{/* Start at selection for invalid session metadata. */}setReady(true);},[]);
 const recommended=appropriateProfile(age,respondent);
 function open(){if(!recommended){setError('Choose an age group and respondent supported by these versions.');return;}store.removeItem(HANDOFF_KEY);store.setItem(SELECTION_KEY,JSON.stringify({age,respondent}));setProfile(recommended);setError('');}
 function change(){store.removeItem(HANDOFF_KEY);store.removeItem(SELECTION_KEY);setProfile(null);setError('');}
 if(!ready)return <p role="status">Opening screening versions…</p>;
 if(profile)return <TierOneQuestionnaire key={profile.draftKey} profile={profile} onChangeVersion={change} scopeConfirmed/>;
 return <section className="tierOne" aria-label="Choose screening version"><h2>Choose the appropriate Tier 1 version</h2><p>Adult self-report: ages 18+. Adolescent self-report: ages 11–17. Parent/guardian observations: child ages 6–17. Each version covers 19 areas with wording for its respondent.</p><p>Administrator-only assessment prototype. Reports remain separate; a parent’s answers do not replace the adolescent’s own report.</p><form onSubmit={e=>{e.preventDefault();open();}}>
 <label className="tierOneSelector">Patient age group<select name="patientAgeGroup" value={age} onChange={e=>{setAge(e.target.value);setError('');}}><option value="">Choose age group…</option><option value="under6">Under 6</option><option value="6-10">6–10</option><option value="11-17">11–17</option><option value="18+">18 or older</option></select></label>
 <fieldset className="tierOneQuestion"><legend>Who is answering?</legend><div className="tierOneChoices">{[['self','Patient / self-report'],['parent','Parent or guardian reporting about a child']].map(([value,label])=><label key={value}><input type="radio" name="respondent" value={value} checked={respondent===value} onChange={()=>{setRespondent(value);setError('');}}/>{label}</label>)}</div></fieldset>
 <div className="tierOneHelp" role="status">{recommended?<><strong>Recommended: {recommended.title}</strong><p>{recommended.populationLabel}</p></>:age==='under6'?'These versions do not cover children under 6. Use a developmentally appropriate clinician-led assessment.':age==='6-10'&&respondent==='self'?'For ages 6–10, choose the parent/guardian report. This self-report version begins at age 11.':age==='18+'&&respondent==='parent'?'This parent/guardian version is for children ages 6–17. Adult informant assessment needs a separate clinician-led approach.':'Choose an age group and who is answering to identify the appropriate version.'}</div>
 {error&&<p role="alert">{error}</p>}<button type="submit">Open recommended version</button></form><p>These are original developmental screening prototypes, not APA instruments or validated diagnostic tests. Clinical review is required before patient use. Connected assessments can be saved and resumed from the central patient record. Unlinked previews clear on a full refresh.</p></section>;
}
