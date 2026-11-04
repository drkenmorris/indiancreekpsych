import {createHash} from 'node:crypto';
import {connectedDefinition,isConnectedKey,type Definition} from './definition';
export function stable(value:unknown):string{return Array.isArray(value)?'['+value.map(stable).join(',')+']':value&&typeof value==='object'?'{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+stable(v)).join(',')+'}':JSON.stringify(value)??'null';}
export const hash=(value:unknown)=>createHash('sha256').update(stable(value)).digest('hex');
export function checkedSource(value:unknown,digest:unknown):Definition{
 if(!value||typeof value!=='object')throw Error('Questionnaire source unavailable. Create a new assignment.');
 const d=value as Definition;
 if(!isConnectedKey(d.testKey)||hash(d)!==digest||hash(connectedDefinition(d.testKey))!==digest)throw Error('Questionnaire version is unavailable. Contact the office; saved responses have been retained.');
 return d;
}
