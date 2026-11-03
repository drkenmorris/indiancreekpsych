import bank from './review-definition.json';
import provenance from './review-version.json';
import {clinicalSessionStore as store} from '../clinicalSessionStore';
import {activePlan,progressRecords,type ModuleRecord} from './tier-two-progress';
import {differentialReport} from './differential';
import {answerLabel} from './evidence';
import {reconcileCandidate} from './formulation';
export const REVIEW_KEY='icps_adult_review_v1';
export const dispositions=['Needs further interview','Working hypothesis for clinician review','Not currently favored; not excluded','Medical/specialist assessment needed','Deferred pending information'];
type ReviewRecord={answers:Record<string,string>;example:string;notes:string;completedAt:string|null;onsetDate?:string;eventDate?:string};
type Disposition={status:string;rationale:string};
type Saved={source:string;domains:Record<string,ReviewRecord>;dispositions:Record<string,Disposition>};
function validDate(value:string){return value===''||/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value&&value<=new Date().toISOString().slice(0,10);}
function saved(source:string):Saved{try{const d=JSON.parse(store.getItem(REVIEW_KEY)||'null');if(d?.source===source&&d.domains&&d.dispositions)return d;}catch{}return {source,domains:{},dispositions:{}};}
export function reviewState(plan=activePlan(),records:Record<string,ModuleRecord>=progressRecords(plan)){
 const report=differentialReport(plan,records),candidates=report.candidates.map(reconcileCandidate);
 const ready=plan?.profile.id==='adult'&&report.status==='Follow-up completed; clinician review required';
 const source=JSON.stringify([provenance,plan?.key,report.stages,records]),data=saved(source);
 const domains=ready?bank.domains.filter(d=>plan!.handoff.routedDomains.includes(d.id)).map(d=>{
  const questions=[...d.questions,...bank.common];const raw=data.domains[d.id];const answers:Record<string,string>={};
  for(const q of questions)if(raw?.answers&&q.choices.includes(raw.answers[q.id]))answers[q.id]=raw.answers[q.id];
  const onsetDate=typeof raw?.onsetDate==='string'&&validDate(raw.onsetDate)?raw.onsetDate:'',eventDate=typeof raw?.eventDate==='string'&&validDate(raw.eventDate)?raw.eventDate:'';
  const example=typeof raw?.example==='string'?raw.example.slice(0,2000):'',notes=typeof raw?.notes==='string'?raw.notes.slice(0,2000):'';
  return {...d,title:plan!.handoff.domains.find(x=>x.id===d.id)?.title??d.id,questions,record:{answers,example,notes,onsetDate,eventDate,completedAt:raw?.completedAt??null},complete:!!raw?.completedAt&&questions.every(q=>q.id in answers),candidates:candidates.filter(c=>c.domain===d.id)};
 }):[];
 const integrated=candidates.map(c=>{
  const d=domains.find(d=>d.id===c.domain),r=records[c.domain],issues=[...c.issues];
  if(r){
   if(r.answers['evidence:medical']===1||r.answers['evidence:substance']===1)issues.push('Tier 2 reports possible health, medication or substance contributors.');
   if(r.answers['evidence:review']===0)issues.push('Tier 2 contributor review has not been completed.');
   if(r.answers['evidence:impact']===0)issues.push('Tier 2 reports no distress or functional interference; clinical significance remains to be established.');
   if(Number(r.answers['evidence:duration'])>=7)issues.push('Tier 2 duration remains uncertain or private.');
  }
  if(d){
   const a=d.record.answers;
   if(a.timeline&&a.timeline!=='Approximate dates and sequence are available')issues.push('Tier 6 has not established a clear onset and sequence.');
   if(a.contributors&&a.contributors!=='Reviewed; no contributor identified so far')issues.push('Tier 6 contributor assessment is pending, uncertain or identifies possible contributors.');
   if(a.overlap?.includes('same experiences')||a.overlap?.includes('Some overlap'))issues.push('Tier 6 reports overlapping descriptions; avoid counting the same experience as separate disorders without assessment.');
   if(a.timeline==='Approximate dates and sequence are available'&&!d.record.onsetDate)issues.push('A timeline is reported available but onset date is not entered; obtain the approximate sequence in interview.');
   if(d.record.onsetDate&&d.record.eventDate&&d.record.onsetDate<d.record.eventDate)issues.push('Entered symptom onset precedes the related event; reconcile attribution and chronology.');
   if(r?.answers['evidence:impact']===0&&a.function&&a.function!=='No distress or interference reported'&&!['Unsure','Prefer to discuss privately'].includes(a.function))issues.push('Impact descriptions differ across tiers: Tier 2 reports none while Tier 6 reports distress or interference. Clarify the reference periods and examples.');
   if(a.contributors?.startsWith('Reviewed;')){for(let i=0;i<issues.length;i++){if(issues[i].includes('Medical/substance evaluation for panic-like')||issues[i].includes('Tier 2 contributor review has not'))issues[i]='Earlier responses lacked contributor evaluation; Tier 6 now reports review. Verify the scope, timing and findings with the clinician.';}}
   if(c.id==='anxiety-4'&&a['branch-4']&&!['Unsure','Prefer to discuss privately'].includes(a['branch-4']))issues.push(`Tier 6 avoidance description: ${a['branch-4']}. Assess distinct versus overlapping fears.`);
   if(c.id==='anxiety-5'&&c.tier5Answer==='No'&&a['branch-3']==='No')issues.push('Separation context needs reconciliation: earlier responses allowed a realistic-context explanation, while Tier 6 does not report that context.');
   if(c.domain==='depressive'&&c.id==='depressive-1'&&['Yes','No'].includes(c.tier5Answer)&&['Yes','No'].includes(a['branch-3'])&&c.tier5Answer!==a['branch-3'])issues.push('High-energy history differs across tiers; clarify mood course and consider whether bipolar follow-up needs to be reopened.');
   if(c.domain==='depressive'&&c.id==='depressive-1'&&(c.tier5Answer==='Yes'||a['branch-3']==='Yes'))issues.push('Increased-energy/reduced-sleep history was reported; review the bipolar differential even if that Tier 1 area was not selected.');
   if(a.function==='No distress or interference reported')issues.push('Tier 6 does not establish clinically significant distress or interference.');
   if(Object.values(a).some(v=>v==='Unsure'||v==='Prefer to discuss privately'))issues.push('Tier 6 retains uncertain or private information for interview.');
  }
  if(d?.record.onsetDate){const index=issues.findIndex(i=>i.includes('dates remain unavailable'));if(index>=0)issues[index]='Earlier tiers lacked dates; Tier 6 now records an onset date for clinical review.';}
  if(c.id==='ocd_related-2'&&d?.record.answers['branch-2']&&!['Unsure','Prefer to discuss privately'].includes(d.record.answers['branch-2']))issues.push(`Tier 6 appearance clarification: ${d.record.answers['branch-2']}. Reconcile the earlier descriptions in interview.`);
  const clarificationEvidence=d?d.questions.map(q=>({tier:6,question:q.text,answer:d.record.answers[q.id]??'Not answered'})):[];
  const sourceContext=r?r.definition.items.filter(q=>q.id.startsWith('evidence:')).map(q=>({tier:2,question:q.text,answer:answerLabel(r,q.id)})):[];
  return {...c,evidence:[...c.evidence,...sourceContext,...clarificationEvidence],issues:[...new Set(issues)],clarificationComplete:d?.complete??false,example:d?.record.example??'',contextNotes:d?.record.notes??'',onsetDate:d?.record.onsetDate??'',eventDate:d?.record.eventDate??''};
 });
 const reviews=Object.fromEntries(integrated.filter(c=>dispositions.includes(data.dispositions[c.id]?.status)&&typeof data.dispositions[c.id]?.rationale==='string'&&data.dispositions[c.id].rationale.trim().length>0).map(c=>[c.id,data.dispositions[c.id]]));
 return {ready,source,domains,candidates:integrated,complete:!!domains.length&&domains.every(d=>d.complete),reviews,provenance};
}
export function saveReview(id:string,record:ReviewRecord,complete=false){const state=reviewState(),d=state.domains.find(d=>d.id===id);if(!d||!validDate(record.onsetDate??'')||!validDate(record.eventDate??'')||typeof record.example!=='string'||typeof record.notes!=='string'||record.example.length>2000||record.notes.length>2000||Object.entries(record.answers).some(([id,v])=>!d.questions.some(q=>q.id===id&&q.choices.includes(v)))||complete&&d.questions.some(q=>!(q.id in record.answers)))return false;const data=saved(state.source);data.domains[id]={...record,completedAt:complete?new Date().toISOString():null};data.dispositions={};store.setItem(REVIEW_KEY,JSON.stringify(data));return true;}
export function saveDisposition(id:string,status:string,rationale:string){const s=reviewState();if(!s.complete||!s.candidates.some(c=>c.id===id)||!dispositions.includes(status)||!rationale.trim()||rationale.length>2000)return false;const data=saved(s.source);data.dispositions[id]={status,rationale};store.setItem(REVIEW_KEY,JSON.stringify(data));return true;}
export function preparedReview(plan=activePlan(),records:Record<string,ModuleRecord>=progressRecords(plan)){const s=reviewState(plan,records);const directReviewFlags:string[]=[];if(s.domains.some(d=>d.id==='neurocognitive'&&d.record.answers['branch-1']==='Sudden onset or marked short-term fluctuation'))directReviewFlags.push('A sudden or fluctuating change in thinking/awareness was reported; direct medical assessment is needed.');if(s.candidates.some(c=>c.id==='paraphilic_screen-2'&&c.tier5Answer==='Yes'))directReviewFlags.push('A current consent/harm concern was reported; direct professional safety assessment is needed.');return {directReviewFlags,version:bank.version,provenance:s.provenance,status:!s.ready?'Awaiting adult follow-up':s.complete?'Clarification completed; clinician disposition remains separate':'Clarification in progress',candidates:s.candidates,domains:s.domains,clinicianDrafts:s.reviews,diagnosesConfirmed:false,liveTransferEnabled:false};}
