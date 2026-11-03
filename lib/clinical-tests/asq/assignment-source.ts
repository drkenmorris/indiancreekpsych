import {createHash} from 'node:crypto';
import {asqDefinition,type AsqDefinition,type AsqRole} from '../asq-forms';
function canonical(value:unknown):unknown{return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)])):value;}
export function definitionHash(definition:AsqDefinition){return createHash('sha256').update(JSON.stringify(canonical(definition))).digest('hex');}
export function assignmentDefinition(role:AsqRole){const definition=asqDefinition(role);return {definition,hash:definitionHash(definition)};}
export function checkedDefinition(value:unknown,hash:unknown):AsqDefinition{
 if(!value||typeof value!=='object'||typeof hash!=='string')throw Error('Questionnaire source is unavailable.');
 const d=value as AsqDefinition;
 if(!['student','parent','teacher'].includes(d.role)||d.pageSize!==7||!Array.isArray(d.items)||!d.items.length||d.items.length>500||!Array.isArray(d.options)||d.options.length!==5||definitionHash(d)!==hash)throw Error('Questionnaire source could not be verified.');
 if(new Set(d.items.map(i=>i.id)).size!==d.items.length||d.items.some(i=>typeof i.id!=='string'||typeof i.text!=='string')||d.options.some((o,i)=>o.value!==i||typeof o.label!=='string'))throw Error('Questionnaire source is invalid.');return d;
}
export function validateAsqSave(value:unknown,definition:AsqDefinition){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid response save.');const v=value as Record<string,unknown>;
 if(!Number.isInteger(v.expectedRevision)||(v.expectedRevision as number)<0||!Number.isInteger(v.page)||(v.page as number)<0||(v.page as number)>=Math.ceil(definition.items.length/7)||typeof v.submit!=='boolean'||v.identityConfirmed!==true)throw Error('Confirm your identity and use a valid questionnaire page.');
 if(!v.answers||typeof v.answers!=='object'||Array.isArray(v.answers))throw Error('Invalid answers.');const ids=new Set(definition.items.map(i=>i.id)),entries=Object.entries(v.answers);
 if(entries.some(([id,n])=>!ids.has(id)||!Number.isInteger(n)||(n as number)<0||(n as number)>4))throw Error('Unknown question or invalid answer.');
 const answers=v.answers as Record<string,number>;
 if(definition.items.slice(0,(v.page as number)*7).some(i=>answers[i.id]===undefined))throw Error('Answer earlier pages before moving ahead.');
 if(v.submit&&definition.items.some(i=>answers[i.id]===undefined))throw Error('Answer every question before submitting.');
 return {answers,page:v.page as number,submit:v.submit,expectedRevision:v.expectedRevision as number};
}
