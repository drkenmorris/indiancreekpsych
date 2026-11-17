export type EmrSettings = {
 preferences: {density:'comfortable'|'compact';large_text:boolean;contrast:boolean};
 defaults: {note_template:'DAP'|'SOAP'|'Narrative';country:string;modality:string};
 shortcuts:string[];
 custom_fields:{id:string;label:string;type:'text'|'number'|'date'}[];
};
export const defaultEmrSettings:EmrSettings={preferences:{density:'comfortable',large_text:false,contrast:false},defaults:{note_template:'DAP',country:'USA',modality:'Individual'},shortcuts:['personal','schedule','reports'],custom_fields:[]};
const modules=['personal','assessment','plan','notes','prognosis_details','prognosis','discharge','schedule','reports','settings','administration'];
const keys=(value:unknown,names:string[])=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
export function validEmrSettings(value:unknown):value is EmrSettings {
 if(!keys(value,['preferences','defaults','shortcuts','custom_fields']))return false;
 const s=value as EmrSettings,p=s.preferences,d=s.defaults;
 return keys(p,['density','large_text','contrast'])&&['comfortable','compact'].includes(p.density)&&typeof p.large_text==='boolean'&&typeof p.contrast==='boolean'&&
 keys(d,['note_template','country','modality'])&&['DAP','SOAP','Narrative'].includes(d.note_template)&&typeof d.country==='string'&&d.country.length<=100&&['Individual','Group','Couples/family','Other — document in approaches'].includes(d.modality)&&
 Array.isArray(s.shortcuts)&&s.shortcuts.length<=modules.length&&s.shortcuts.every(k=>modules.includes(k))&&new Set(s.shortcuts).size===s.shortcuts.length&&
 Array.isArray(s.custom_fields)&&s.custom_fields.length<=12&&s.custom_fields.every(f=>keys(f,['id','label','type'])&&typeof f.id==='string'&&/^custom_[a-f0-9-]{36}$/.test(f.id)&&typeof f.label==='string'&&!!f.label.trim()&&f.label.length<=80&&['text','number','date'].includes(f.type))&&new Set(s.custom_fields.map(f=>f.id)).size===s.custom_fields.length;
}
