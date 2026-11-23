import {uuid} from './demographics';
export type GroupCorpusSession={id:string;subject:string;objective:string;planned_implementation:string};
export type GroupCorpusDocument={group_name:string;group_focus:string;sessions:GroupCorpusSession[]};
export type GroupCorpus={id:string;revision:number;document:GroupCorpusDocument;updated_at:string};
export type GroupCorpusSummary={id:string;group_name:string;revision:number;updated_at:string};
export const blankGroupCorpus=():GroupCorpusDocument=>({group_name:'',group_focus:'',sessions:[]});
const keys=(v:unknown,k:string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
const text=(v:unknown,max:number)=>typeof v==='string'&&v.trim().length>=2&&v.length<=max;
export function validGroupCorpusDocument(v:unknown):v is GroupCorpusDocument{
 if(!keys(v,['group_name','group_focus','sessions'])||!text(v.group_name,160)||v.group_name!==(v.group_name as string).trim()||!text(v.group_focus,8000)||!Array.isArray(v.sessions)||v.sessions.length>100)return false;
 if(v.sessions.some(s=>!keys(s,['id','subject','objective','planned_implementation'])||!uuid(s.id)||!text(s.subject,500)||s.subject!==(s.subject as string).trim()||!text(s.objective,10000)||!text(s.planned_implementation,15000)))return false;
 return new Set(v.sessions.map(s=>s.id.toLowerCase())).size===v.sessions.length&&new TextEncoder().encode(JSON.stringify(v)).length<=480000;
}
export function validGroupCorpus(v:unknown):v is GroupCorpus{return keys(v,['id','revision','document','updated_at'])&&uuid(v.id)&&Number.isSafeInteger(v.revision)&&Number(v.revision)>0&&typeof v.updated_at==='string'&&Number.isFinite(Date.parse(v.updated_at))&&validGroupCorpusDocument(v.document);}
export const corpusFingerprint=(d:GroupCorpusDocument)=>JSON.stringify([d.group_name,d.group_focus,d.sessions.map(s=>[s.id,s.subject,s.objective,s.planned_implementation])]);
