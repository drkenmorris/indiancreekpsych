export const TREATMENT_HISTORY_KEY='treatment_history_entries';
export const MAX_TREATMENT_ENTRIES=20;
export type TreatmentHistoryEntry={setting:string;provider_facility:string;start_date:string;end_date:string;ongoing:boolean;reason:string;outcome_notes:string};
export const emptyTreatmentEntry=():TreatmentHistoryEntry=>({setting:'',provider_facility:'',start_date:'',end_date:'',ongoing:false,reason:'',outcome_notes:''});
const limits={setting:10,provider_facility:200,start_date:10,end_date:10,reason:2000,outcome_notes:4000} as const;
export function parseTreatmentHistory(value:string):TreatmentHistoryEntry[]{
 if(!value)return [];
 const entries:unknown=JSON.parse(value);
 if(!Array.isArray(entries)||entries.length>MAX_TREATMENT_ENTRIES)throw new Error('Use up to 20 treatment history entries.');
 for(const entry of entries){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).length!==7)throw new Error('Invalid treatment history entry.');
  for(const [key,limit] of Object.entries(limits))if(typeof entry[key]!=='string'||entry[key].length>limit)throw new Error('Invalid treatment history field.');
  if(typeof entry.ongoing!=='boolean')throw new Error('Invalid ongoing treatment choice.');
 }
 return entries as TreatmentHistoryEntry[];
}
export const hasTreatmentEntry=(entry:TreatmentHistoryEntry)=>entry.ongoing||Object.entries(entry).some(([key,value])=>key!=='ongoing'&&typeof value==='string'&&value.trim()!=='');
export function validateTreatmentHistory(value:string,submit:boolean,today=new Date().toLocaleDateString('en-CA')):string|null{
 if(value.length>70000)return 'Treatment history is too long. Shorten the notes before saving.';
 let entries:TreatmentHistoryEntry[];
 try{entries=parseTreatmentHistory(value);}catch{return 'Treatment history could not be read. Keep this page open and contact the practice.';}
 for(const [index,entry] of entries.entries()){
  const prefix=`Treatment entry ${index+1}: `;
  if(entry.setting&&!['Inpatient','Outpatient'].includes(entry.setting))return prefix+'choose Inpatient or Outpatient.';
  for(const key of ['start_date','end_date'] as const){const date=entry[key];if(!date)continue;const parsed=new Date(date+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date>today)return prefix+'enter a valid date that is not in the future.';}
  if(entry.ongoing&&entry.end_date)return prefix+'ongoing treatment cannot have an end date.';
  if(entry.start_date&&entry.end_date&&entry.end_date<entry.start_date)return prefix+'the end date must be on or after the start date.';
  if(submit&&hasTreatmentEntry(entry)&&(!entry.setting||(!entry.provider_facility.trim()&&!entry.reason.trim())))return prefix+'choose a setting and enter a provider/facility or reason for treatment.';
 }
 return null;
}
