import {emptyRichDoc,validRichDoc,type RichNode} from './treatment-response';
import {prognosisText} from './prognosis';
export const competencyOptions=['Competent','Competent: Needs Training','Incompetent: Can Benefit from Training','Incompetent: Cannot Benefit from Training'] as const;
export const dischargeChoices={
 self_care_competency:{label:'Competency to Manage Self-Care',options:competencyOptions},
 financial_competency:{label:'Competency to Manage Financial Resources',options:competencyOptions},
 follow_up_care:{label:'Follow-Up Care',options:['Community Mental Health Center','Court Services','Social Service Agency','Substance Abuse Rehabilitation','Outpatient Therapy']},
 placement_recommendation:{label:'Placement Recommendation',options:['Self Care','Own Family','Nursing Home','Community Residential Rehabilitation Services','Domiciliary/Boarding Home','Foster Care','Group Home']},
 vocational_plan:{label:'Vocational Plan',options:['Seek full-time job','Seek part-time job','Return to full-time job','Return to part-time job','Sheltered Workshop','Vocational Education']},
} as const;
export type ChoiceKey=keyof typeof dischargeChoices;
export type Criterion={id:string;text:string;active:boolean};
export type CriteriaLibrary={revision:number;items:Criterion[]};
export type SelectedCriterion={id:string;text:string};
export type Discharge={schema:'discharge/2';criteria:SelectedCriterion[];criteria_narrative:string;self_care_competency:string;financial_competency:string;follow_up_care:string;referral_to:string;placement_recommendation:string;vocational_plan:string;actual_end_date:string;aftercare_summary:RichNode;prognosis_id:string|null};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export const validDate=(v:unknown)=>typeof v==='string'&&(!v||/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)&&!v.startsWith('0000')&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
const starterText=[
 'Treatment-plan goals have been achieved to the agreed discharge threshold.',
 'Patient and clinician agree that the current treatment episode is ready to conclude.',
 'Patient demonstrates independent use of coping skills practiced in treatment.',
 'Patient can identify warning signs and describe when and how to seek help.',
 'Patient can describe the aftercare plan and follow-up arrangements.',
 'Referral information for continuing services has been provided.',
 'Care is transferring to another provider or service.',
 'A different treatment setting or service has been recommended.',
 'Patient requests discharge from the current treatment episode.',
 'Treatment ended following loss of contact; outreach attempts are documented.',
];
export const starterCriteria:Criterion[]=starterText.map((text,index)=>({id:'00000000-0000-4000-8000-'+String(index+1).padStart(12,'0'),text,active:true}));
export function validCriteria(items:unknown):items is Criterion[]{return Array.isArray(items)&&items.length<=250&&items.every(item=>object(item)&&Object.keys(item).length===3&&uuid(item.id)&&typeof item.text==='string'&&item.text===item.text.trim()&&item.text.length>=2&&item.text.length<=500&&typeof item.active==='boolean')&&new Set(items.map(i=>i.id)).size===items.length&&new Set(items.map(i=>i.text.toLocaleLowerCase())).size===items.length;}
export const blankDischarge=():Discharge=>({schema:'discharge/2',criteria:[],criteria_narrative:'',self_care_competency:'',financial_competency:'',follow_up_care:'',referral_to:'',placement_recommendation:'',vocational_plan:'',actual_end_date:'',aftercare_summary:emptyRichDoc(),prognosis_id:null});
export function dischargeFromRecord(record:Record<string,unknown>):Discharge{const fields=Object.keys(blankDischarge());return Object.fromEntries(fields.map(key=>[key,record[key]])) as Discharge;}
export function validDischarge(v:unknown):v is Discharge{
 if(!object(v)||Object.keys(v).length!==Object.keys(blankDischarge()).length||Object.keys(v).some(k=>!Object.hasOwn(blankDischarge(),k))||v.schema!=='discharge/2')return false;
 if(!Array.isArray(v.criteria)||v.criteria.length>250||v.criteria.some(c=>!object(c)||Object.keys(c).length!==2||!uuid(c.id)||typeof c.text!=='string'||c.text.trim().length<2||c.text.length>500)||new Set(v.criteria.map(c=>c.id)).size!==v.criteria.length)return false;
 for(const [key,choice]of Object.entries(dischargeChoices))if(typeof v[key]!=='string'||v[key]!==''&&!(choice.options as readonly string[]).includes(v[key]))return false;
 if(typeof v.criteria_narrative!=='string'||v.criteria_narrative.length>20000||typeof v.referral_to!=='string'||v.referral_to.length>500||!validDate(v.actual_end_date)||!validRichDoc(v.aftercare_summary)||!(v.prognosis_id===null||uuid(v.prognosis_id)))return false;
 return v.criteria.length>0||!!v.criteria_narrative.trim()||!!v.referral_to.trim()||!!v.actual_end_date||Object.keys(dischargeChoices).some(k=>!!v[k])||!!prognosisText(v.aftercare_summary).trim();
}
