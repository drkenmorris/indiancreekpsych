export const medicationDurations=["Less than 3 months", "3 to less than 6 months", "6 months to less than 1 year", "1 to less than 2 years", "2 to 5 years", "More than 5 years", "Not sure"] as const;
export const MEDICATION_ENTRIES_KEY='medication_entries';
export type MedicationEntry={medication:string;status:string;dosage:string;frequency:string;start_date:string;end_date:string;prescribing_physician:string;benefit:string;duration?:string};
export const emptyMedication=():MedicationEntry=>({medication:'',status:'',dosage:'',frequency:'',start_date:'',end_date:'',prescribing_physician:'',benefit:''});
export const medicationLimits={medication:200,status:7,dosage:200,frequency:200,start_date:10,end_date:10,prescribing_physician:200,benefit:14} as const;
export const allergyStatuses=['Not yet reviewed','No known medication allergies','Medication allergies reported'] as const;
export function parseMedications(value:string):MedicationEntry[]{
 if(!value)return [];
 const entries:unknown=JSON.parse(value);
 if(!Array.isArray(entries)||entries.length>20)throw Error('Use up to 20 medication entries.');
 for(const entry of entries){if(!entry||typeof entry!=='object'||Array.isArray(entry)||(Object.keys(entry).length!==8+Number(Object.hasOwn(entry,'duration'))|| (Object.hasOwn(entry,'duration')&&entry.duration!==''&&!medicationDurations.includes(entry.duration))))throw Error('Invalid medication entry.');for(const [key,limit] of Object.entries(medicationLimits))if(typeof entry[key]!=='string'||entry[key].length>limit)throw Error('Invalid medication field.');}
 return entries as MedicationEntry[];
}
export const hasMedication=(entry:MedicationEntry)=>Object.values(entry).some(v=>v.trim()!=='');
export function validateMedications(value:string,submit:boolean,today=new Date().toLocaleDateString('en-CA')):string|null{
 if(value.length>40000)return 'Medication list is too long.';
 let entries:MedicationEntry[];try{entries=parseMedications(value);}catch{return 'Medication entries could not be read. Keep this page open and contact the practice.';}
 for(const [i,entry] of entries.entries()){
  const prefix=`Medication ${i+1}: `;
  if(entry.status&&!['Current','Past'].includes(entry.status))return prefix+'choose Current or Past.';
  if(!['','Beneficial','Not beneficial'].includes(entry.benefit))return prefix+'choose one benefit response.';
  for(const key of ['start_date','end_date'] as const){const date=entry[key];if(!date)continue;const parsed=new Date(date+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date>today)return prefix+'enter a valid date that is not in the future.';}
  if(entry.status==='Current'&&entry.end_date)return prefix+'current medication cannot have an end date.';
  if(entry.start_date&&entry.end_date&&entry.end_date<entry.start_date)return prefix+'end date precedes start date.';
  if(submit&&hasMedication(entry)&&(!entry.medication.trim()||!entry.status))return prefix+'enter the medication name and choose Current or Past.';
 }
 return null;
}
export function validateMedicationAllergies(status:string,notes:string){
 if(status&&!allergyStatuses.includes(status as typeof allergyStatuses[number]))return 'Choose a medication allergy status.';
 if(notes.length>4000)return 'Medication allergy notes are too long.';
 if(status==='Medication allergies reported'&&!notes.trim())return 'Describe the medication allergies / reactions.';
 if(status==='No known medication allergies'&&notes.trim())return 'Remove the allergy notes or select Medication allergies reported.';
 return null;
}
