'use client';
import {useEffect,useRef,useSyncExternalStore} from 'react';
import Link from 'next/link';
import {clinicalSessionStore as store} from '@/lib/clinical-tests/clinicalSessionStore';
import {activePlan,progressRecords,moduleStatus} from '@/lib/clinical-tests/dsm/tier-two-progress';
import './tier-two-progress.css';
export default function TierTwoFinalReport(){
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();},[]);
 useSyncExternalStore(store.subscribe,store.revision,()=>0);
 const plan=activePlan();if(!plan)return <section><h2 ref={heading} tabIndex={-1}>Final screening report</h2><p>Complete Tier 1 and prepare its follow-up plan to begin this report.</p><Link href="/clinical-tests/dev/level1">Open Tier 1</Link></section>;
 const selected=plan.handoff.domains.filter(d=>plan.handoff.routedDomains.includes(d.id)),records=progressRecords(plan);const done=selected.filter(d=>moduleStatus(records[d.id])==='Completed').length;
 return <section className="tierTwoReport" aria-label="Final screening report"><h2 ref={heading} tabIndex={-1}>Final screening report</h2><p><strong>{plan.profile.title}</strong> · {plan.profile.populationLabel}</p>
 <p role="status">{selected.length===0?'No automatic Tier 2 modules selected.':done===selected.length?(selected.length===1?'The selected Tier 2 module is completed.':`All ${selected.length} selected Tier 2 modules completed.`):`Partial report: ${done} of ${selected.length} selected modules completed.`}</p>
 <p>These are original prototype screening findings for clinician review, not diagnoses or confirmation that a condition is absent. No answers are sent outside this application or automatically saved to the EMR.</p>
 {(plan.handoff.safetyFlag||plan.handoff.safetyReview)&&<aside className="tierTwoReview">Tier 1 safety responses require direct clinical review. Completing the questionnaire does not establish safety or notify a clinician.</aside>}
 <h3>Tier 1 review items</h3><p>{plan.handoff.reviewDomains.length?plan.handoff.domains.filter(d=>plan.handoff.reviewDomains.includes(d.id)).map(d=>d.title).join('; '):'No uncertain/private domain responses were recorded in Tier 1.'}</p>
 {selected.map(d=>{const r=records[d.id],status=moduleStatus(r);return <article key={d.id}><h3>{d.title}</h3><p><strong>{plan.profile.id==='adult'?status:'Awaiting youth Tier 2 development'}</strong></p>
 {r?.completedAt&&r.findings?<><h4>Screening finding</h4><p>{r.findings.summary}</p>{r.findings.safetyFlag&&<p className="tierTwoReview">This module recorded a safety-related flag requiring clinical review.</p>}{r.findings.scoreRows&&<dl>{r.findings.scoreRows.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}{r.findings.notes.length>0&&<ul>{r.findings.notes.map((n,i)=><li key={i}>{n}</li>)}</ul>}<p>Completed: {new Date(r.completedAt).toLocaleString('en-US',{timeZone:'America/Chicago'})} Central Time.</p></>:<p>{plan.profile.id==='adult'?'A final finding is not available until every rating question is answered and Complete module is selected.':'Age-appropriate follow-up must be developed before this domain can be completed.'}</p>}
 {r&&<details open={status==='Completed'}><summary>Recorded answers ({Object.keys(r.answers).length})</summary><div className="tierTwoAnswerTable"><table><thead><tr><th>Recorded item</th><th>Response</th></tr></thead><tbody>{r.definition.items.map(q=>{const value=r.answers[q.id];return <tr key={q.id}><td>{q.text}</td><td>{value===undefined?'Not answered / not specified':typeof value==='boolean'?(value?'Yes / checked':'No / explicitly unchecked'):r.definition.responseLabels[value]??String(value)}</td></tr>;})}</tbody></table></div></details>}
 {plan.profile.id==='adult'&&<Link href={`/clinical-tests/dev/${d.path}`}>{status==='Completed'?'Review or revise module':'Continue module'}</Link>}</article>;})}
 <p>Editing a completed module removes its completed finding until it is completed again. Changing the Tier 1 plan starts a separate progress set. All state is limited to the current open administrator preview session.</p><Link href="/clinical-tests/dev/level1">Return to Tier 1 and version selection</Link></section>;
}
