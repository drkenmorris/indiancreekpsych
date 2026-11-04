import {appropriateProfile,SELECTION_KEY} from './profiles';
import {evaluateTierOne,createHandoff,HANDOFF_KEY,type ScreenProfile} from './tier-one';
import {evidenceItems,evidenceRecord} from './evidence';
import {activePlan,TRACKER_KEY} from './tier-two-progress';
import {createClinicalSessionStore} from '../clinicalSessionStore';
import {validateDsmVersion,clinicToday,type DsmVersion} from './entry-choice';
export type DsmQuestion={id:string;text:string;choices:string[];tier:1|2;domain:string;title:string};
export type DsmAssignmentSource={format:'icps-dsm-recipient/1';version:DsmVersion;ageBand:string;profileHash:string;questions:DsmQuestion[];profile:ScreenProfile};
export function dsmAssignmentSource(version:DsmVersion,dob:string,today=clinicToday()):DsmAssignmentSource{
 const error=validateDsmVersion(version,dob,true,today);if(error)throw Error(error);
 const age=Number(today.slice(0,4))-Number(dob.slice(0,4))-(today.slice(5)<dob.slice(5)?1:0);
 const profile=appropriateProfile(age>=18?'18+':age>=11?'11-17':'6-10',version==='parent'?'parent':'self');if(!profile)throw Error('Unsupported respondent.');
 return dsmSourceForProfile(profile);
}
export function dsmSourceForProfile(profile:ScreenProfile):DsmAssignmentSource{
 const version=profile.id,d=profile.definition;
 const questions:DsmQuestion[]=[...d.safety.map(q=>({...q,tier:1 as const,domain:'safety',title:'Start and safety check',choices:d.safetyChoices})),...d.domains.flatMap(domain=>domain.questions.map(q=>({...q,tier:1 as const,domain:domain.id,title:domain.title,choices:d.choices}))),...(version==='adult'?d.domains.flatMap(domain=>evidenceItems(domain.id).map(q=>({id:`t2:${domain.id}:${q.id}`,text:q.text,choices:q.choices,tier:2 as const,domain:domain.id,title:domain.title}))):[])];
 return {format:'icps-dsm-recipient/1',version,ageBand:profile.ageBand,profileHash:profile.hash,profile,questions};
}
export function tierOneAnswers(source:DsmAssignmentSource,answers:Record<string,string>){return Object.fromEntries(source.questions.filter(q=>q.tier===1&&answers[q.id]!==undefined).map(q=>[q.id,answers[q.id]]));}
export function assignedQuestions(source:DsmAssignmentSource,answers:Record<string,string>){const result=evaluateTierOne(tierOneAnswers(source,answers),true,source.profile);return source.questions.filter(q=>q.tier===1||result.routedDomains.includes(q.domain));}
export function cleanDsmAnswers(source:DsmAssignmentSource,answers:Record<string,string>){const ids=new Set(assignedQuestions(source,answers).map(q=>q.id));return Object.fromEntries(Object.entries(answers).filter(([id])=>ids.has(id)));}
export function validateDsmSave(value:unknown,source:DsmAssignmentSource){
 const v=value as {answers:Record<string,string>;page:number;expectedRevision:number;submit:boolean;confirmed:boolean};
 if(!v||!v.answers||typeof v.answers!=='object'||Array.isArray(v.answers)||!Number.isSafeInteger(v.expectedRevision)||v.expectedRevision<0||v.confirmed!==true||typeof v.submit!=='boolean')throw Error('Confirm the assigned respondent before saving.');
 const questions=assignedQuestions(source,v.answers);
 if(Object.entries(v.answers).some(([id,value])=>typeof value!=='string'||!questions.some(q=>q.id===id&&q.choices.includes(value))))throw Error('Unknown question, invalid answer or unselected follow-up domain.');
 if(!Number.isInteger(v.page)||v.page<0||v.page>=Math.ceil(questions.length/7))throw Error('Invalid questionnaire page.');
 if(questions.slice(0,v.page*7).some(q=>v.answers[q.id]===undefined))throw Error('Answer earlier pages before continuing.');
 if(v.submit&&questions.some(q=>v.answers[q.id]===undefined))throw Error('Answer every selected question before submitting.');
 return v;
}
/** Reconstruct the original clinician engine from validated recipient answers; no client-supplied reports. */
export function dsmRecipientState(source:DsmAssignmentSource,answers:Record<string,string>,timestamp:string){
 validateDsmSave({answers,page:0,expectedRevision:0,submit:true,confirmed:true},source);
 const storage=createClinicalSessionStore(),profile=source.profile,one=tierOneAnswers(source,answers);
 storage.setItem(SELECTION_KEY,JSON.stringify({age:profile.ageBand,respondent:profile.respondent}));
 storage.setItem(profile.draftKey,JSON.stringify({version:profile.definition.version,definitionHash:profile.hash,answers:one,populationConfirmed:true,adultConfirmed:profile.id==='adult',step:20}));
 const handoff={...createHandoff(one,true,profile),completedAt:timestamp};
 storage.setItem(profile.handoffKey,JSON.stringify(handoff));if(profile.id==='adult')storage.setItem(HANDOFF_KEY,JSON.stringify(handoff));
 const plan=activePlan(storage);if(!plan)throw Error('Unable to reconstruct screening record.');
 if(profile.id==='adult'){const modules=Object.fromEntries(plan.handoff.routedDomains.map(id=>{const values=Object.fromEntries(evidenceItems(id).map(q=>[q.id,q.choices.indexOf(answers[`t2:${id}:${q.id}`])]));const record=evidenceRecord(id,values,true);return [id,{...record,updatedAt:timestamp,completedAt:timestamp}];}));storage.setItem(TRACKER_KEY,JSON.stringify({version:'1.0.0',attempt:plan.key,modules}));}
 return storage.exportDsm();
}
