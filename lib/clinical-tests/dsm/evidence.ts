import definition from './evidence-definition.json';
import {activePlan,progressRecords,saveModule,moduleSourceHash,type ModuleRecord} from './tier-two-progress';
export const frequency=['0 — Not at all','1 — Rarely','2 — Sometimes','3 — Often','4 — Almost always','5 — Unsure','6 — Prefer to discuss privately'];
export const occurrence=['0 — No','1 — Yes','2 — Unsure','3 — Prefer to discuss privately'];
export const contextItems=[
 {id:'evidence:onset',text:'When did this pattern first become noticeable?',choices:['In childhood','During adolescence','During adulthood, before the recent period','Within the past month','Unsure','Prefer to discuss privately']},
 {id:'evidence:duration',text:'How long has the current or most recent continuous period of difficulty lasted?',choices:['Less than 3 days','3 days to less than 2 weeks','2 weeks to less than 1 month','1 month to less than 6 months','6 months to less than 2 years','2 years or longer','Intermittent; no single continuous period','Unsure','Prefer to discuss privately']},
 {id:'evidence:course',text:'Which course best describes these concerns?',choices:['A new change from my usual baseline','Distinct periods with improvement between them','A longstanding baseline with fluctuations','Limited to particular circumstances','Unsure','Prefer to discuss privately']},
 {id:'evidence:impact',text:'How much personal distress or interference with daily functioning has this pattern caused?',choices:['None reported','Some','Substantial','Severe','Unsure','Prefer to discuss privately']},
 {id:'evidence:medical',text:'Could a health condition, pain, injury, or sleep problem contribute to these experiences?',choices:occurrence},
 {id:'evidence:substance',text:'Could medications, alcohol, other substances, or changes in their use contribute?',choices:occurrence},
 {id:'evidence:review',text:'Has a qualified clinician evaluated possible physical or medication/substance contributors?',choices:occurrence},
 {id:'evidence:threat',text:'Is there a current concern about danger, coercion, abuse, or an unsafe environment?',choices:occurrence}
];
export function evidenceItems(id:string){const d=definition.domains.find(d=>d.id===id);if(!d)return [];return [...d.items.map(q=>({...q,choices:q.kind==='occurrence'?occurrence:frequency})),...contextItems.map(q=>({...q,title:'Context',kind:'context'}))];}
export function answerLabel(record:ModuleRecord,id:string){const q=record.definition.items.find(q=>q.id===id),value=record.answers[id];if(value===undefined)return 'Not answered';return typeof value==='boolean'?(value?'Yes':'No'):(q?.responseLabels??record.definition.responseLabels)[value]??'Not answered';}
export function evidenceRecord(id:string,answers:Record<string,number>,completed=false):ModuleRecord{
 const items=evidenceItems(id);const definition={items:items.map(q=>({id:q.id,text:q.text,title:q.title,responseLabels:Object.fromEntries(q.choices.map((v,i)=>[i,v]))})),responseLabels:Object.fromEntries(frequency.map((v,i)=>[i,v]))};
 const symptoms=items.filter(q=>q.kind!=='context'),reported=symptoms.filter(q=>{const v=answers[q.id];return q.kind==='occurrence'?v===1:v>0&&v<5;});
 const unknown=symptoms.filter(q=>q.kind==='occurrence'?answers[q.id]>=2:answers[q.id]>=5);
 return {answers,requiredIds:items.map(q=>q.id),definition,definitionHash:moduleSourceHash(id),updatedAt:new Date().toISOString(),completedAt:completed?new Date().toISOString():null,findings:completed?{summary:`${reported.length} of ${symptoms.length} symptom or experience items reported; ${unknown.length} uncertain or private. This is a descriptive record, without a diagnostic cutoff.`,notes:['Frequency, occurrence, duration and impact are recorded separately. No diagnostic likelihood is calculated.'],safetyFlag:answers['evidence:threat']>0||answers['death_thoughts']>0}:null};
}
export function saveEvidence(id:string,answers:Record<string,number>,complete=false){const plan=activePlan();if(!plan||!plan.handoff.routedDomains.includes(id))return false;const items=evidenceItems(id);if(Object.entries(answers).some(([id,v])=>!Number.isInteger(v)||!items.some(q=>q.id===id&&v>=0&&v<q.choices.length))||complete&&items.some(q=>answers[q.id]===undefined))return false;return saveModule(id,evidenceRecord(id,answers,complete));}
export {definition as evidenceDefinition};
