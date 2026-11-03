import sourceHashes from './asq/recipient-versions.json';
import {AUTISM_ITEMS_SELF} from './legacy/src/assessments/autism/items/autismItemsSelf';
import {parentItems} from './legacy/src/asq/parentItems';
import {AUTISM_ITEMS_TEACHER} from './legacy/src/assessments/autism/items/autismItemsTeacher';
export const asqRoles=['student','parent','teacher'] as const;
export type AsqRole=typeof asqRoles[number];
export const asqRoleLabels:Record<AsqRole,string>={student:'Student / Self',parent:'Parent',teacher:'Teacher'};
export type AsqItem={id:string;text:string};
export const asqResponseOptions=[{value:0,label:'Never'},{value:1,label:'Rarely'},{value:2,label:'Sometimes'},{value:3,label:'Often'},{value:4,label:'Almost always'}];
export const asqItems:Record<AsqRole,AsqItem[]>={
 student:AUTISM_ITEMS_SELF.map(i=>({id:String(i.id),text:i.text??i.prompt??''})),
 parent:parentItems.map(i=>({id:String(i.id),text:i.text})),
 teacher:AUTISM_ITEMS_TEACHER.map(i=>({id:String(i.id),text:i.prompt??''})),
};
export type AsqDefinition={version:string;role:AsqRole;pageSize:7;sourceHashes:Record<string,string>;items:AsqItem[];options:typeof asqResponseOptions};
export function asqDefinition(role:AsqRole):AsqDefinition{return {version:'ASQ-'+role+'-recipient-1',role,pageSize:7,sourceHashes:sourceHashes[role],items:asqItems[role],options:asqResponseOptions};}
export const validAsqRole=(v:unknown):v is AsqRole=>asqRoles.includes(v as AsqRole);
