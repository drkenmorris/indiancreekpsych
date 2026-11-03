import definition from './trauma-history-definition.json';
export const traumaHistoryDefinition=definition;
export const TRAUMA_CHECKLIST_KEY='trauma_history_checklist';
export type TraumaChecklist={definition_version:string;selections:Record<string,string[]>};
export function parseTraumaHistory(value:string):TraumaChecklist{
 if(!value)return {definition_version:definition.version,selections:Object.fromEntries(definition.groups.map(g=>[g.key,[]]))};
 if(value.length>12000)throw Error('Trauma history checklist is too long.');
 const d=JSON.parse(value);
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).sort().join(',')!=='definition_version,selections'||d.definition_version!==definition.version||!d.selections||typeof d.selections!=='object'||Array.isArray(d.selections))throw Error('Invalid trauma history checklist version or format.');
 if(Object.keys(d.selections).some(k=>!definition.groups.some(g=>g.key===k)))throw Error('Unknown trauma history group.');
 for(const g of definition.groups){const a=d.selections[g.key]??[];if(!Array.isArray(a)||a.some(v=>typeof v!=='string'||!g.choices.includes(v))||new Set(a).size!==a.length)throw Error('Choose supported trauma history items without duplicates.');}
 return {definition_version:definition.version,selections:Object.fromEntries(definition.groups.map(g=>[g.key,d.selections[g.key]??[]]))};
}
export function validateTraumaHistory(value:string){try{parseTraumaHistory(value);return null;}catch(e){return e instanceof Error?e.message:'Invalid trauma history checklist.';}}
