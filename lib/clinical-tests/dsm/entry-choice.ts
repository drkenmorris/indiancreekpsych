/** Selection metadata only; does not release patient completion or grant access. */
export const DSM_INTAKE_VERSION_KEY='dsm_questionnaire_version';
export const dsmVersionOptions=[
 {value:'adult',label:'Adult questionnaire',ages:'Ages 18 and older · patient self-report'},
 {value:'adolescent',label:'Adolescent questionnaire',ages:'Ages 11–17 · patient self-report'},
 {value:'parent',label:'Parent/guardian questionnaire',ages:'Child ages 6–17 · caregiver report'},
] as const;
export type DsmVersion=typeof dsmVersionOptions[number]['value'];
export const isDsmVersion=(v:unknown):v is DsmVersion=>dsmVersionOptions.some(o=>o.value===v);
export const dsmVersionLabel=(v:unknown)=>dsmVersionOptions.find(o=>o.value===v)?.label??'Version not selected';
export function clinicToday(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=(type:string)=>parts.find(p=>p.type===type)?.value;return `${part('year')}-${part('month')}-${part('day')}`;}
export function validateDsmVersion(version:unknown,dob='',required=false,today=clinicToday()):string|null{
 if(version===''||version===undefined||version===null)return required?'Choose the adult, adolescent, or parent/guardian DSM questionnaire version.':null;
 if(!isDsmVersion(version))return 'Choose a valid DSM questionnaire version.';
 if(!dob)return null; // Incomplete intake drafts may not yet have a birth date.
 const birth=new Date(dob+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dob)||Number.isNaN(birth.valueOf())||birth.toISOString().slice(0,10)!==dob||dob>today)return 'Enter a valid patient birth date before selecting a DSM questionnaire version.';
 const age=Number(today.slice(0,4))-Number(dob.slice(0,4))-(today.slice(5)<dob.slice(5)?1:0);
 if(version==='adult'&&age<18)return 'The adult questionnaire is for patients aged 18 and older.';
 if(version==='adolescent'&&(age<11||age>17))return 'The adolescent questionnaire is for patients aged 11–17.';
 if(version==='parent'&&(age<6||age>17))return 'The parent/guardian questionnaire is for caregivers reporting about a child aged 6–17.';
 return null;
}
