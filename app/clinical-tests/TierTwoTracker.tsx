'use client';
import {useSyncExternalStore} from 'react';
import Link from 'next/link';
import {clinicalSessionStore as store} from '@/lib/clinical-tests/clinicalSessionStore';
import {activePlan,progressRecords,moduleStatus} from '@/lib/clinical-tests/dsm/tier-two-progress';
import './tier-two-progress.css';
export default function TierTwoTracker({activeKey=''}:{activeKey?:string}){
 useSyncExternalStore(store.subscribe,store.revision,()=>0);
 const plan=activePlan();if(!plan)return null;
 const selected=plan.handoff.domains.filter(d=>plan.handoff.routedDomains.includes(d.id));const records=progressRecords(plan);const completed=selected.filter(d=>moduleStatus(records[d.id])==='Completed').length;const next=selected.find(d=>moduleStatus(records[d.id])!=='Completed');const adult=plan.profile.id==='adult';
 return <section className="tierTwoTracker" aria-label="Tier 2 completion tracker"><h2>Tier 2 progress</h2><p><strong>{completed} of {selected.length} selected modules completed</strong> · {plan.profile.title}</p>
 {selected.length>0&&<progress aria-label="Selected Tier 2 modules completed" value={completed} max={selected.length}/>}
 <p role="status">{selected.length===0?'Tier 1 selected no automatic Tier 2 modules. Review the final report for any clinician-review items.':!adult?'Youth follow-up areas are listed below. Age-appropriate Tier 2 questionnaires still need development.':completed===selected.length?'All selected Tier 2 modules are completed. Your final report is ready.':'Answer the rating questions in each selected module, then choose Complete module. Moving to another module does not mark it complete.'}</p>
 <details open={selected.length<=4}><summary>Selected module checklist</summary><ul>{selected.map(d=><li key={d.id}><span>{adult?<Link aria-current={activeKey===d.path?'page':undefined} href={`/clinical-tests/dev/${d.path}`}>{d.title}</Link>:d.title}</span><strong>{adult?moduleStatus(records[d.id]):'Awaiting youth Tier 2 development'}</strong></li>)}</ul></details>
 <div className="tierTwoTrackerActions">{adult&&next&&<Link href={`/clinical-tests/dev/${next.path}`}>Continue next unfinished module</Link>}<Link href="/clinical-tests/dev/summary">View final report</Link></div><small>Progress is kept in this open fictional screening session. A full refresh or closing the page clears it.</small></section>;
}
