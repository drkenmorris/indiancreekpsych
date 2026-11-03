import {clinicalSessionStore as store,type ClinicalSessionStore} from '../clinicalSessionStore';
import {ADULT_PROFILE,HANDOFF_KEY,readHandoff} from './tier-one';
import {SELECTION_KEY,appropriateProfile} from './profiles';
import versions from './tier-two-versions.json';
export const TRACKER_KEY='dsm_tier2_progress_v1';
export type Item={id:string;text:string;title?:string;responseLabels?:Record<number,string>};
export type ModuleDefinition={items:Item[];responseLabels:Record<number,string>};
export type Findings={summary:string;notes:string[];scoreRows?:{label:string;value:string}[];safetyFlag?:boolean};
export type ModuleRecord={answers:Record<string,number|boolean>;requiredIds:string[];definition:ModuleDefinition;definitionHash:string;updatedAt:string;completedAt:string|null;findings:Findings|null};
export function activePlan(storage:ClinicalSessionStore=store){
 try{const raw=storage.getItem(SELECTION_KEY);const selected=raw?JSON.parse(raw):null;const profile=raw?appropriateProfile(selected?.age,selected?.respondent):ADULT_PROFILE;if(!profile)return null;
 const handoff=readHandoff(storage.getItem(profile.handoffKey)||(profile.id==='adult'?storage.getItem(HANDOFF_KEY):null),profile);if(!handoff)return null;
 return {profile,handoff,key:JSON.stringify([handoff.instrumentId,handoff.definitionHash,profile.id,profile.ageBand,handoff.completedAt,Object.entries(handoff.answers).sort(([a],[b])=>a.localeCompare(b))])};
 }catch{return null;}
}
export function moduleSourceHash(id:string){return (versions.modules as Record<string,string>)[id]??'';}
export function progressRecords(plan=activePlan(),storage:ClinicalSessionStore=store):Record<string,ModuleRecord>{
 try{const saved=JSON.parse(storage.getItem(TRACKER_KEY)||'null');if(!plan||saved?.version!=='1.0.0'||saved.attempt!==plan.key||!saved.modules||typeof saved.modules!=='object'||Array.isArray(saved.modules))return {};
 return Object.fromEntries(Object.entries(saved.modules as Record<string,ModuleRecord>).filter(([id,value])=>{const r=value as ModuleRecord;return plan.handoff.routedDomains.includes(id)&&r&&r.definitionHash===moduleSourceHash(id)&&Array.isArray(r.requiredIds)&&r.requiredIds.length>0&&new Set(r.requiredIds).size===r.requiredIds.length&&r.requiredIds.every(x=>typeof x==='string')&&r.answers&&typeof r.answers==='object'&&!Array.isArray(r.answers)&&Object.values(r.answers).every(x=>typeof x==='boolean'||(Number.isInteger(x)&&Number(x)>=0&&Number(x)<=16))&&Array.isArray(r.definition?.items)&&r.definition.responseLabels&&typeof r.definition.responseLabels==='object'&&r.requiredIds.every(id=>r.definition.items.some(q=>q.id===id))&&r.definition.items.every(q=>typeof q.id==='string'&&typeof q.text==='string')&&(!r.completedAt||(!!r.findings&&r.requiredIds.every(x=>typeof r.answers[x]==='number')))&&(!r.findings||(typeof r.findings.summary==='string'&&Array.isArray(r.findings.notes)&&r.findings.notes.every(n=>typeof n==='string')));}));
 }catch{return {};}
}
export function saveModule(id:string,record:ModuleRecord){const plan=activePlan();if(!plan||plan.profile.id!=='adult'||!plan.handoff.routedDomains.includes(id))return false;const modules=progressRecords(plan);modules[id]=record;store.setItem(TRACKER_KEY,JSON.stringify({version:'1.0.0',attempt:plan.key,modules}));return true;}
export function clearModule(id:string){const plan=activePlan();if(!plan)return;const modules=progressRecords(plan);delete modules[id];store.setItem(TRACKER_KEY,JSON.stringify({version:'1.0.0',attempt:plan.key,modules}));}
export function moduleStatus(record?:ModuleRecord){if(!record||Object.keys(record.answers).length===0)return 'Not started';if(record.completedAt&&record.requiredIds.every(id=>typeof record.answers[id]==='number'))return 'Completed';if(record.requiredIds.every(id=>typeof record.answers[id]==='number'))return 'Ready to complete';return 'In progress';}
