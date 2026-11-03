import {reconcileCandidate} from './formulation';
import bank from './differential-definition.json';
import version from './differential-version.json';
import {clinicalSessionStore as store,type ClinicalSessionStore} from '../clinicalSessionStore';
import {activePlan,progressRecords,moduleStatus,type ModuleRecord} from './tier-two-progress';
export {bank as differentialDefinition};
export const DIFFERENTIAL_KEY='icps_differential_v1';
export const responseChoices=['Yes','No','Unsure','Prefer to discuss privately'];
export type Stage=3|4|5;
export type Question={id:string;text:string;choices:string[]};
export type FollowupRecord={answers:Record<string,string>;completedAt:string|null;binding:string};
export type Unit={id:string;title:string;questions:Question[];reasons:string[];record:FollowupRecord;complete:boolean};
type Plan=NonNullable<ReturnType<typeof activePlan>>;
type Saved=Record<string,FollowupRecord>;
export function tierTwoReady(plan:Plan,records:Record<string,ModuleRecord>){return plan.profile.id==='adult'&&plan.handoff.routedDomains.length>0&&plan.handoff.routedDomains.every(id=>moduleStatus(records[id])==='Completed');}
function stored(source:string,storage:ClinicalSessionStore=store):Saved{try{const data=JSON.parse(storage.getItem(DIFFERENTIAL_KEY)||'null');return data?.version===version.sha256&&data.source===source&&data.units&&typeof data.units==='object'?data.units:{};}catch{return {};}}
function candidateQuestion(id:string,text:string):Question{return {id,text,choices:responseChoices};}
function unit(stage:Stage,id:string,title:string,questions:Question[],reasons:string[],binding:string,saved:Saved):Unit{
 const raw=saved[`${stage}:${id}`];
 const answers:Record<string,string>={};
 if(raw?.binding===binding&&raw.answers&&typeof raw.answers==='object')for(const q of questions){if(q.choices.includes(raw.answers[q.id]))answers[q.id]=raw.answers[q.id];}
 const complete=!!raw?.completedAt&&raw.binding===binding&&questions.every(q=>q.id in answers);
 return {id,title,questions,reasons,complete,record:{answers,binding,completedAt:complete?raw.completedAt:null}};
}
export function differentialState(plan=activePlan(),records=progressRecords(plan),storage:ClinicalSessionStore=store){
 const stages:Record<Stage,Unit[]>={3:[],4:[],5:[]};
 if(!plan||!tierTwoReady(plan,records))return {ready:false,stages,complete:false,nextStage:3 as Stage,version,source:''};
 const source=JSON.stringify([version.sha256,version.routingSha256,plan.key,plan.handoff.routedDomains.map(id=>[id,records[id]])]),saved=stored(source,storage);
 for(const d of bank.domains.filter(d=>plan.handoff.routedDomains.includes(d.id))){
  const title=plan.handoff.domains.find(x=>x.id===d.id)?.title??d.id;
  const evidence=records[d.id].definition.items.filter(q=>!q.id.startsWith('evidence:')&&typeof records[d.id].answers[q.id]==='number'&&(q.responseLabels?.[0]==='0 — No'?records[d.id].answers[q.id]===1:Number(records[d.id].answers[q.id])>0&&Number(records[d.id].answers[q.id])<5)).map(q=>q.text);
  stages[3].push(unit(3,d.id,title,d.candidates.map(c=>candidateQuestion(c.id,c.tier3)),[evidence.length?`Tier 2 recorded nonzero responses for ${evidence.length} items. Exact answers remain in the report.`:'Tier 1 selected this area; Tier 2 did not record a nonzero rating. Clarify the difference rather than assume the area is excluded.'],JSON.stringify([3,d.id]),saved));
 }
 if(stages[3].every(u=>u.complete))for(const u of stages[3]){
  const d=bank.domains.find(d=>d.id===u.id)!;
  const candidates=d.candidates.filter(c=>u.record.answers[c.id]!=='No');
  if(candidates.length){const binding=JSON.stringify([4,u.record]);stages[4].push(unit(4,u.id,u.title,[...candidates.map(c=>candidateQuestion(c.id,c.tier4)),...bank.context.map(q=>({...q,id:`context:${q.id}`}))],['Follow-up areas were selected by Yes, Unsure, or Prefer to discuss privately responses in Tier 3. No responses do not rule out a diagnosis.'],binding,saved));}
 }
 if(stages[3].every(u=>u.complete)&&stages[4].every(u=>u.complete))for(const u of stages[3]){
  const follow=stages[4].find(x=>x.id===u.id);
  const answers=Object.values(u.record.answers),reasons:string[]=[];
  if(answers.filter(v=>v==='Yes').length>1)reasons.push('Multiple candidate areas were endorsed; overlap or co-occurrence needs review.');
  if(!answers.includes('Yes'))reasons.push('Tier 1 selection did not produce a clear endorsed Tier 3 pattern.');
  if(answers.some(v=>v==='Unsure'||v==='Prefer to discuss privately'))reasons.push('Some candidate responses remain uncertain or private.');
  if(follow){const a=follow.record.answers;
   if(Object.values(a).some(v=>v==='Unsure'||v==='Prefer to discuss privately'))reasons.push('Tier 4 contains uncertain or private responses.');
   if(['medical','substance','overlap'].some(k=>a[`context:${k}`]==='Yes'))reasons.push('Possible contributing factors or overlap require clarification.');
   if(a['context:impact']==='No')reasons.push('Distress or interference was not endorsed; clinical significance needs review.');
   if(bank.domains.find(d=>d.id===u.id)!.candidates.some(c=>u.record.answers[c.id]==='Yes'&&a[c.id]==='No'))reasons.push('An endorsed candidate has a different follow-up pattern; reconcile the evidence.');
  }
  if(reasons.length)stages[5].push(unit(5,u.id,u.title,[...bank.domains.find(d=>d.id===u.id)!.candidates.filter(c=>u.record.answers[c.id]!=='No').map(c=>candidateQuestion(c.id,c.tier5)),...bank.clarification.map(q=>candidateQuestion(q.id,q.text))],reasons,JSON.stringify([5,u.record,follow?.record??null]),saved));
 }
 const nextStage=([3,4,5] as Stage[]).find(s=>stages[s].some(u=>!u.complete))??5;
 const complete=stages[3].length>0&&([3,4,5] as Stage[]).every(s=>stages[s].every(u=>u.complete));
 return {ready:true,stages,complete,nextStage,version,source};
}
export function saveFollowup(stage:Stage,id:string,answers:Record<string,string>,complete=false){
 const state=differentialState(),u=state.stages[stage].find(x=>x.id===id);if(!u)return false;
 const valid=Object.keys(answers).every(id=>u.questions.some(q=>q.id===id&&q.choices.includes(answers[id])));
 if(!valid||(complete&&!u.questions.every(q=>q.id in answers)))return false;
 const units=stored(state.source);units[`${stage}:${id}`]={binding:u.record.binding,answers,completedAt:complete?new Date().toISOString():null};
 store.setItem(DIFFERENTIAL_KEY,JSON.stringify({version:version.sha256,source:state.source,units}));return true;
}
export function differentialReport(plan=activePlan(),records=progressRecords(plan),storage:ClinicalSessionStore=store){
 const state=differentialState(plan,records,storage);
 return {definition:bank,definitionHash:version.sha256,routingHash:version.routingSha256,status:!state.ready?'Awaiting completed adult Tier 2':state.complete?'Follow-up completed; clinician review required':'Follow-up in progress',diagnosesConfirmed:false,clinicalReviewRequired:true,
  stages:state.stages,candidates:state.stages[3].flatMap(u=>bank.domains.find(d=>d.id===u.id)!.candidates.map(c=>({domain:u.id,id:c.id,label:c.label,tier3Question:c.tier3,tier3Answer:u.record.answers[c.id]??'Not answered',tier5Question:c.tier5,tier5Answer:state.stages[5].find(x=>x.id===u.id)?.record.answers[c.id]??'Not asked / not answered',tier4Question:c.tier4,tier4Answer:state.stages[4].find(x=>x.id===u.id)?.record.answers[c.id]??'Not asked / not answered',status:u.record.answers[c.id]==='Yes'?(!u.complete?'Draft endorsement; follow-up incomplete':state.stages[4].find(x=>x.id===u.id)?.record.answers[c.id]==='No'?'Mixed evidence; distinguishing follow-up not endorsed':'Candidate area for clinician evaluation'):u.record.answers[c.id]==='No'?'Not endorsed in this prompt; not ruled out':'Unresolved / not assessed'}))).map(reconcileCandidate)};
}
