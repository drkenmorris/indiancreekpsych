import {uuid} from './demographics';
export const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const planningFields=['subject','definition','goal','objective','planned_implementation'] as const;
export const fieldLabels={subject:'Group Subject',definition:'Definition',goal:'Group Goal',objective:'Group Objective',planned_implementation:'Planned Implementation'};
export type PlanningField=typeof planningFields[number];
export type Schedule={day:number;start:string;end:string};
export type GroupSetup={name:string;subject:string;schedules:Schedule[];facilitators:string[];members:string[]};
export type TherapyGroup={id:string;revision:number;document:GroupSetup;timezone:string};
export type PlanningItem={id:string}&Record<PlanningField,string>;
export type GroupLibrary={groupId:string;revision:number;items:PlanningItem[]};
export type PlanSelection=Record<PlanningField,string>;
export type GroupNoteInput={group_id:string;group_revision:number;library_revision:number;start_at:string;end_at:string;facilitator_ids:string[];selections:PlanSelection[];narrative:string;reviewed:boolean};
export type GroupNote={id:string;group_id:string;group_revision:number;library_revision:number;start_at:string;end_at:string;group_snapshot:{name:string;subject:string;timezone:string};facilitator_snapshot:{id:string;name:string}[];selections:PlanSelection[];narrative:string;created_at:string};
export const blankSetup=():GroupSetup=>({name:'',subject:'',schedules:[],facilitators:[],members:[]});
export const blankItem=():PlanningItem=>({id:crypto.randomUUID(),subject:'',definition:'',goal:'',objective:'',planned_implementation:''});
export const blankSelection=():PlanSelection=>({subject:'',definition:'',goal:'',objective:'',planned_implementation:''});
const exact=(v:unknown,k:string[]):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
const txt=(v:unknown,max:number,required=false)=>typeof v==='string'&&v.length<=max&&(!required||v.trim().length>=2);
const ids=(v:unknown,max:number)=>Array.isArray(v)&&v.length<=max&&v.every(uuid)&&new Set(v.map(x=>x.toLowerCase())).size===v.length;
export function validSetup(v:unknown):v is GroupSetup{
 if(!exact(v,['name','subject','schedules','facilitators','members'])||!txt(v.name,160,true)||!txt(v.subject,8000,true)||!ids(v.facilitators,20)||v.facilitators.length<1||!ids(v.members,200)||!Array.isArray(v.schedules)||v.schedules.length<1||v.schedules.length>49)return false;
 if(v.schedules.some(s=>!exact(s,['day','start','end'])||!Number.isInteger(s.day)||s.day<0||s.day>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end)||s.end<=s.start))return false;
 return !v.schedules.some((s:Schedule,i:number)=>v.schedules.some((t:Schedule,j:number)=>j<i&&t.day===s.day&&s.start<t.end&&t.start<s.end));
}
export function validPlanningItems(v:unknown):v is PlanningItem[]{return Array.isArray(v)&&v.length<=200&&v.every(s=>exact(s,['id',...planningFields])&&uuid(s.id)&&planningFields.every(k=>txt(s[k],k==='subject'?500:15000,k==='subject')))&&new Set(v.map(s=>s.id.toLowerCase())).size===v.length&&new TextEncoder().encode(JSON.stringify(v)).length<=480000;}
export function validNoteInput(v:unknown):v is GroupNoteInput{return exact(v,['group_id','group_revision','library_revision','start_at','end_at','facilitator_ids','selections','narrative','reviewed'])&&uuid(v.group_id)&&Number.isSafeInteger(v.group_revision)&&v.group_revision>0&&Number.isSafeInteger(v.library_revision)&&v.library_revision>0&&typeof v.start_at==='string'&&typeof v.end_at==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(v.start_at)&&/^\d{4}-\d{2}-\d{2}T/.test(v.end_at)&&Number.isFinite(Date.parse(v.start_at))&&Number.isFinite(Date.parse(v.end_at))&&Date.parse(v.end_at)>Date.parse(v.start_at)&&Date.parse(v.end_at)-Date.parse(v.start_at)<=86400000&&ids(v.facilitator_ids,20)&&v.facilitator_ids.length>0&&Array.isArray(v.selections)&&v.selections.length>0&&v.selections.length<=50&&v.selections.every(s=>exact(s,[...planningFields])&&planningFields.every(k=>txt(s[k],k==='subject'?500:15000,k==='subject')))&&txt(v.narrative,20000,true)&&v.reviewed===true;}
