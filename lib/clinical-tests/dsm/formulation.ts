import bank from './differential-definition.json';
export type CandidateEvidence={domain:string;id:string;label:string;tier3Question:string;tier3Answer:string;tier4Question:string;tier4Answer:string;tier5Question:string;tier5Answer:string;status:string};
const unresolved=(v:string)=>v==='Unsure'||v==='Prefer to discuss privately'||v.startsWith('Not ');
/** Descriptive evidence reconciliation; no diagnostic scoring or criterion satisfaction. */
export function reconcileCandidate(c:CandidateEvidence){
 const evidence=[{tier:3,question:c.tier3Question,answer:c.tier3Answer},{tier:4,question:c.tier4Question,answer:c.tier4Answer},{tier:5,question:c.tier5Question,answer:c.tier5Answer}];
 const issues:string[]=[],next:string[]=[];
 let status=c.tier3Answer==='No'?'Initial pattern not endorsed; not excluded':c.tier3Answer==='Yes'?'Pattern reported; diagnostic requirements not established':'Initial response uncertain; further clarification needed';
 if(unresolved(c.tier3Answer)&&[c.tier4Answer,c.tier5Answer].includes('Yes'))status='Later follow-up reported; reconcile initial uncertainty';
 if(c.id==='ocd_related-2'&&c.tier4Answer==='No'&&c.tier5Answer==='Yes'){issues.push('Appearance responses disagree about whether concerns extend beyond eating/weight.');status='Conflicting descriptions; reconcile before interpretation';}
 if(c.id==='anxiety-5'&&c.tier5Answer==='No'){issues.push('The response does not establish that separation fear exceeds actual danger, caregiving needs or instability.');status='Contextual explanation needs review';}
 if(c.id==='anxiety-2'&&c.tier5Answer==='No')issues.push('Medical/substance evaluation for panic-like symptoms has not been established.');
 if(c.id==='anxiety-4')issues.push('Specific-object fear and escape/help-related avoidance require separate clarification; this combined branch cannot distinguish them alone.');
 if(c.id==='trauma-2'&&c.tier5Answer==='No')issues.push('Event and symptom dates remain unavailable; an acute-stress time course is not established.');
 if(c.id==='trauma-1'&&c.tier4Answer==='No')issues.push('Persistence beyond the immediate aftermath was not endorsed; clarify actual dates and course.');
 if(c.id==='depressive-1'&&c.tier4Answer==='No')issues.push('Symptoms occurring together during the same period have not been established.');
 if(c.id==='depressive-4'||c.id==='trauma-3')issues.push('A link to stress alone does not settle whether another disorder better explains the symptoms.');
 if(c.id==='ocd_related-1')next.push('Clarify intrusive thoughts, ritual function, time burden, distress and interference rather than applying an unvalidated symptom-count threshold.');
 if(evidence.some(e=>unresolved(e.answer)))issues.push('One or more responses remain uncertain, private, not asked or unanswered.');
 if(c.tier4Answer==='No'&&!issues.length)issues.push('Follow-up description differs from the initial pattern; assess its meaning without treating No as automatic exclusion.');
 next.push('Establish onset, duration, course, personal distress/functioning and possible contributors in a clinical interview.');
 return {...c,status,evidence,issues,next,clinicalReviewRequired:true};
}
export function domainTitle(id:string){return bank.domains.find(d=>d.id===id)?.id??id;}
