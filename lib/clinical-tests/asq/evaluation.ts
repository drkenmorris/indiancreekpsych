import {createHash} from 'node:crypto';
import {asqDefinition,type AsqDefinition} from '../asq-forms';
import {checkedDefinition,definitionHash} from './assignment-source';
import {AUTISM_ITEMS_SELF} from '../legacy/src/assessments/autism/items/autismItemsSelf';
import {AUTISM_ITEMS_TEACHER} from '../legacy/src/assessments/autism/items/autismItemsTeacher';
import {parentItems} from '../legacy/src/asq/parentItems';
import sources from './evaluation-versions.json';
export const evaluationVersion='ASQ-descriptive-evaluation-1';
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):value;
export const evaluationHash=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export const evaluationAlgorithmHash=evaluationHash({version:evaluationVersion,sources});
export type EvaluationReport={version:string;algorithmHash:string;role:AsqDefinition['role'];totalCount:number;answeredCount:number;options:AsqDefinition['options'];domains:{id:string;count:number;sum:number;mean:number;frequencies:number[]}[];frequentItems:{id:string;text:string;value:number}[];summary:string[];limitations:string};
export function buildAsqEvaluation(source:unknown,sourceHash:unknown,answers:unknown):EvaluationReport{
 const d=checkedDefinition(source,sourceHash);
 if(definitionHash(asqDefinition(d.role))!==sourceHash)throw Error('This questionnaire version needs its matching evaluation adapter. The original answers are retained.');
 if(!answers||typeof answers!=='object'||Array.isArray(answers))throw Error('Submitted answers are unavailable.');
 const a=answers as Record<string,number>,ids=new Set(d.items.map(i=>i.id));
 if(Object.keys(a).length!==ids.size||Object.entries(a).some(([id,v])=>!ids.has(id)||!Number.isInteger(v)||v<0||v>4))throw Error('A complete, valid submitted response is required.');
 const metadata=d.role==='student'?AUTISM_ITEMS_SELF.map(i=>({id:String(i.id),domain:i.domain})):d.role==='parent'?parentItems.map(i=>({id:String(i.id),domain:i.construct})):AUTISM_ITEMS_TEACHER.map(i=>({id:i.id,domain:i.domain}));
 const byId=new Map(metadata.map(i=>[i.id,i.domain]));const buckets=new Map<string,{id:string;count:number;sum:number;mean:number;frequencies:number[]}>();
 for(const item of d.items){const domain=byId.get(item.id);if(!domain)throw Error('A questionnaire item has no evaluation domain.');const b=buckets.get(domain)??{id:domain,count:0,sum:0,mean:0,frequencies:[0,0,0,0,0]};b.count++;b.sum+=a[item.id];b.frequencies[a[item.id]]++;buckets.set(domain,b);}
 const domains=[...buckets.values()].map(b=>({...b,mean:b.sum/b.count})).sort((a,b)=>a.id.localeCompare(b.id));
 return {version:evaluationVersion,algorithmHash:evaluationAlgorithmHash,role:d.role,totalCount:d.items.length,answeredCount:ids.size,options:d.options,domains,frequentItems:d.items.filter(i=>a[i.id]>=3).map(i=>({...i,value:a[i.id]})),summary:domains.map(b=>`${b.id}: ${b.count} responses; mean endorsement ${b.mean.toFixed(2)} of 4. ${b.frequencies[3]+b.frequencies[4]} items were reported Often or Almost always.`),limitations:'Descriptive 0–4 response summaries, not diagnostic severity scores or normed cutoffs. Item wording includes strengths and difficulties; no unapproved reverse keys or clinical thresholds are inferred. Review the original items and context before recording your clinical interpretation. Informants are evaluated separately.'};
}
export function evaluationSnapshot(report:EvaluationReport,source:{assignmentId:string;responseRevision:number;definitionHash:string},notes:string){return {report,source,notes};}
