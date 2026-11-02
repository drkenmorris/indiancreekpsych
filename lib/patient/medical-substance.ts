import definition from './medical-substance-definition.json';
export const MEDICAL_SUBSTANCE_KEY='medical_substance_history';
export const medicalSubstanceDefinition=definition;
export type MedicalSubstanceAnswers={definition_version:string;selections:Record<string,string[]>;notes:Record<string,string>};
export const emptyMedicalSubstance=():MedicalSubstanceAnswers=>({definition_version:definition.version,selections:Object.fromEntries(definition.groups.map(g=>[g.key,[]])),notes:Object.fromEntries(Object.keys(definition.notes).map(key=>[key,'']))});
export const legacyMedicalFields=[['primary_care_provider','Primary care provider'],['pcp_phone','Primary care provider phone'],['medical_conditions','Medical conditions'],['surgeries_hospitalizations','Surgeries / hospitalizations'],['allergies','Previously reported allergies'],['pregnancy_status','Pregnancy / postpartum status'],['head_injury_seizure_history','Head injury / seizure / neurological history'],['alcohol_use','Alcohol use details'],['drug_use','Other substance use details'],['tobacco_nicotine','Nicotine use details'],['substance_treatment_history','Substance treatment / recovery'],['substance_consequences','Substance-related consequences'],['gambling_other_behaviors','Gambling / other compulsive behaviors']] as const;
export function parseMedicalSubstance(value:string):MedicalSubstanceAnswers{
 if(!value)return emptyMedicalSubstance();
 if(value.length>50000)throw Error('Medical and substance-use history is too long.');
 const data=JSON.parse(value);
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==3||data.definition_version!==definition.version||!data.selections||typeof data.selections!=='object'||Array.isArray(data.selections)||!data.notes||typeof data.notes!=='object'||Array.isArray(data.notes))throw Error('Invalid medical / substance-use history.');
 if(Object.keys(data.selections).some(key=>!definition.groups.some(g=>g.key===key))||Object.keys(data.notes).some(key=>!Object.hasOwn(definition.notes,key)))throw Error('Unknown medical / substance-use field.');
 for(const group of definition.groups){const values=data.selections[group.key]??[];if(!Array.isArray(values)||values.some(value=>typeof value!=='string'||!group.choices.includes(value))||new Set(values).size!==values.length)throw Error('Invalid medical / substance-use choice.');if(values.length>1&&values.some(value=>definition.exclusive.includes(value)))throw Error('None reported / History unknown cannot be combined with other choices in the same section.');}
 for(const text of Object.values(data.notes))if(typeof text!=='string'||text.length>4000)throw Error('History details must be at most 4000 characters per field.');
 return {definition_version:definition.version,selections:Object.fromEntries(definition.groups.map(g=>[g.key,data.selections[g.key]??[]])),notes:Object.fromEntries(Object.keys(definition.notes).map(key=>[key,data.notes[key]??'']))};
}
export function validateMedicalSubstance(value:string){try{parseMedicalSubstance(value);return null;}catch(e){return e instanceof Error?e.message:'Invalid medical / substance-use history.';}}
