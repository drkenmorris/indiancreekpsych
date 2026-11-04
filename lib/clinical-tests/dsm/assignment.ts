import {differentialDefinition,responseChoices,differentialState,DIFFERENTIAL_KEY,type Stage} from './differential';
import reviewBank from './review-definition.json';
import differentialVersion from './differential-version.json';
import reviewVersion from './review-version.json';
import evidenceVersion from './tier-two-versions.json';
import {reviewState,REVIEW_KEY} from './review';
import {progressRecords} from './tier-two-progress';
import {appropriateProfile,SELECTION_KEY} from './profiles';
import {evaluateTierOne,createHandoff,HANDOFF_KEY,type ScreenProfile} from './tier-one';
import {evidenceItems,evidenceRecord} from './evidence';
import {activePlan,TRACKER_KEY} from './tier-two-progress';
import {createClinicalSessionStore} from '../clinicalSessionStore';
import {validateDsmVersion,clinicToday,type DsmVersion} from './entry-choice';
export type DsmQuestion={id:string;text:string;choices:string[];tier:1|2|3|4|5|6;domain:string;title:string;kind?:'text'|'date';optional?:boolean};
export type DsmAssignmentSource={format:'icps-dsm-recipient/1'|'icps-dsm-recipient/2';provenance?:unknown;version:DsmVersion;ageBand:string;profileHash:string;questions:DsmQuestion[];profile:ScreenProfile};
export function dsmAssignmentSource(version:DsmVersion,dob:string,today=clinicToday()):DsmAssignmentSource{
 const error=validateDsmVersion(version,dob,true,today);if(error)throw Error(error);
 const age=Number(today.slice(0,4))-Number(dob.slice(0,4))-(today.slice(5)<dob.slice(5)?1:0);
 const profile=appropriateProfile(age>=18?'18+':age>=11?'11-17':'6-10',version==='parent'?'parent':'self');if(!profile)throw Error('Unsupported respondent.');
 return dsmSourceForProfile(profile);
}
export function dsmSourceForProfile(profile:ScreenProfile,legacy=false):DsmAssignmentSource{
 const version=profile.id,d=profile.definition;
 const questions:DsmQuestion[]=[...d.safety.map(q=>({...q,tier:1 as const,domain:'safety',title:'Start and safety check',choices:d.safetyChoices})),...d.domains.flatMap(domain=>domain.questions.map(q=>({...q,tier:1 as const,domain:domain.id,title:domain.title,choices:d.choices}))),...(version==='adult'?d.domains.flatMap(domain=>evidenceItems(domain.id).map(q=>({id:`t2:${domain.id}:${q.id}`,text:q.text,choices:q.choices,tier:2 as const,domain:domain.id,title:domain.title}))):[])];
 if(version==='adult'&&!legacy){
  for(const stage of [3,4,5] as const)for(const domain of differentialDefinition.domains){
   const title=d.domains.find(x=>x.id===domain.id)!.title;
   for(const c of domain.candidates)questions.push({id:`t${stage}:${domain.id}:${c.id}`,text:c[`tier${stage}`],choices:responseChoices,tier:stage,domain:domain.id,title});
   const context=stage===4?differentialDefinition.context:stage===5?differentialDefinition.clarification:[];
   for(const q of context)questions.push({id:`t${stage}:${domain.id}:${stage===4?'context:':''}${q.id}`,text:q.text,choices:'choices' in q?q.choices as string[]:responseChoices,tier:stage,domain:domain.id,title});
  }
  for(const domain of reviewBank.domains){const title=d.domains.find(x=>x.id===domain.id)!.title;
   for(const q of [...domain.questions,...reviewBank.common])questions.push({...q,id:`t6:${domain.id}:${q.id}`,tier:6,domain:domain.id,title});
   for(const [id,text,kind] of [['onsetDate','Approximate date these concerns began, if known','date'],['eventDate','Date of a related event, if relevant and known','date'],['example','An example of how these concerns affect your life','text'],['notes','Other context you want your clinician to understand','text']] as const)questions.push({id:`t6:${domain.id}:${id}`,text,choices:[],tier:6,domain:domain.id,title,kind,optional:true});
  }
  return {format:'icps-dsm-recipient/2',provenance:{evidence:evidenceVersion,differential:differentialVersion,review:reviewVersion},version,ageBand:profile.ageBand,profileHash:profile.hash,profile,questions} as DsmAssignmentSource;
 }
 return {format:'icps-dsm-recipient/1',version,ageBand:profile.ageBand,profileHash:profile.hash,profile,questions} as DsmAssignmentSource;
}
export function tierOneAnswers(source:DsmAssignmentSource,answers:Record<string,string>){return Object.fromEntries(source.questions.filter(q=>q.tier===1&&answers[q.id]!==undefined).map(q=>[q.id,answers[q.id]]));}
export function assignedQuestions(source:DsmAssignmentSource,answers:Record<string,string>){const result=evaluateTierOne(tierOneAnswers(source,answers),true,source.profile);return source.questions.filter(q=>q.tier===1||result.routedDomains.includes(q.domain));}
export function cleanDsmAnswers(source:DsmAssignmentSource,answers:Record<string,string>){const ids=new Set(assignedQuestions(source,answers).map(q=>q.id));return Object.fromEntries(Object.entries(answers).filter(([id])=>ids.has(id)));}
export function validDsmAnswer(q:DsmQuestion,value:unknown){
 if(typeof value!=='string')return false;
 if(q.kind==='text')return value.length<=2000;
 if(q.kind==='date')return value===''||/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value&&value<=clinicToday();
 return q.choices.includes(value);
}
export function validateDsmSave(value:unknown,source:DsmAssignmentSource){
 const v=value as {answers:Record<string,string>;page:number;expectedRevision:number;submit:boolean;confirmed:boolean};
 if(!v||!v.answers||typeof v.answers!=='object'||Array.isArray(v.answers)||!Number.isSafeInteger(v.expectedRevision)||v.expectedRevision<0||v.confirmed!==true||typeof v.submit!=='boolean')throw Error('Confirm the assigned respondent before saving.');
 const questions=assignedQuestions(source,v.answers);
 if(Object.entries(v.answers).some(([id,value])=>typeof value!=='string'||!questions.some(q=>q.id===id&&validDsmAnswer(q,value))))throw Error('Unknown question, invalid answer or unselected follow-up domain.');
 if(!Number.isInteger(v.page)||v.page<0||v.page>=Math.ceil(questions.length/7))throw Error('Invalid questionnaire page.');
 if(questions.slice(0,v.page*7).some(q=>!q.optional&&v.answers[q.id]===undefined))throw Error('Answer earlier pages before continuing.');
 if(v.submit&&questions.some(q=>!q.optional&&v.answers[q.id]===undefined))throw Error('Answer every selected question before submitting.');
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
 if(source.format==='icps-dsm-recipient/2'&&profile.id==='adult'&&plan.handoff.routedDomains.length){
  const records=progressRecords(plan,storage),units:Record<string,unknown>={};
  for(const stage of [3,4,5] as Stage[]){const state=differentialState(plan,records,storage);
   for(const u of state.stages[stage])units[`${stage}:${u.id}`]={binding:u.record.binding,answers:Object.fromEntries(u.questions.map(q=>[q.id,answers[`t${stage}:${u.id}:${q.id}`]])),completedAt:timestamp};
   storage.setItem(DIFFERENTIAL_KEY,JSON.stringify({version:state.version.sha256,source:state.source,units}));
  }
  const state=reviewState(plan,records,storage),domains=Object.fromEntries(state.domains.map(d=>[d.id,{answers:Object.fromEntries(d.questions.map(q=>[q.id,answers[`t6:${d.id}:${q.id}`]])),example:answers[`t6:${d.id}:example`]??'',notes:answers[`t6:${d.id}:notes`]??'',onsetDate:answers[`t6:${d.id}:onsetDate`]??'',eventDate:answers[`t6:${d.id}:eventDate`]??'',completedAt:timestamp}]));
  storage.setItem(REVIEW_KEY,JSON.stringify({source:state.source,domains,dispositions:{}}));
 }
 return storage.exportDsm();
}
