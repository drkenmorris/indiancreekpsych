import type {PlanSnapshot,PlannerNode,ResolvedNode} from './treatment-planner';
import {implementedChoices,type InterventionEntry} from './implemented-interventions';
export const soapLabels={subjective:'Subjective (S)',objective:'Objective (O)',assessment:'Assessment (A)',plan:'Plan (P)'} as const;
export type SoapKey=keyof typeof soapLabels;
export type SoapSections=Record<SoapKey,string>;
type Group={id:string;label:string;kind:'multi'|'single';options:readonly string[]};
export const soapGroups:Record<SoapKey,readonly Group[]>={
 subjective:[
  {id:'concerns',label:'Patient-reported concerns discussed',kind:'multi',options:['Anxiety','Depressed mood','Sleep difficulty','Relationship concerns','Work or school concerns','Other concerns']},
  {id:'change',label:'Patient-reported change since last session',kind:'single',options:['Improved','About the same','Worsened','Not discussed']},
  {id:'homework',label:'Prior homework status',kind:'single',options:['Completed','Partially completed','Not completed','Not assigned','Not discussed']},
 ],
 objective:[
  {id:'appearance',label:'Observed appearance',kind:'single',options:['Appropriate to setting','Disheveled','Other appearance']},
  {id:'participation',label:'Participation',kind:'single',options:['Active','Limited','Variable','Declined participation']},
  {id:'behavior',label:'Observed behavior',kind:'multi',options:['Cooperative','Guarded','Restless','Withdrawn','Other behavior']},
  {id:'speech',label:'Observed speech',kind:'single',options:['Typical rate and volume','Rapid','Slowed','Soft','Loud','Other speech']},
  {id:'affect',label:'Observed affect',kind:'single',options:['Appropriate to discussion','Restricted','Flat','Labile','Other affect']},
  {id:'thought',label:'Observed thought process',kind:'single',options:['Organized and goal-directed','Circumstantial','Tangential','Other thought process']},
 ],
 assessment:[
  {id:'response',label:'Response to interventions',kind:'single',options:['Engaged and receptive','Partially engaged','Limited response observed','Response varied','Not evaluated this session']},
 ],
 plan:[
  {id:'actions',label:'Next steps',kind:'multi',options:['Continue current treatment plan','Assign homework','Review homework next session','Coordinate care','Discuss referral','Review treatment plan']},
  {id:'homeworkPlan',label:'Homework plan',kind:'single',options:['New homework assigned','Continue prior homework','No homework assigned']},
  {id:'followup',label:'Follow-up plan',kind:'single',options:['Keep scheduled follow-up','Schedule next appointment','Contact patient to arrange follow-up','Follow-up as needed']},
 ],
};
export const objectiveProgress=['Improving','Unchanged','Worsening','Not evaluated this session'] as const;
export type SoapChoice={id:string;text:string};
export type SoapProblemProgress=SoapChoice&{sessionDate:string;interventions:string[]};
export type SoapPlanChoices={context:string;problems:SoapChoice[];objectives:SoapChoice[];implemented:SoapChoice[];problemProgress?:SoapProblemProgress[]};
export function soapProblemProgress(problems:SoapChoice[],entries:InterventionEntry[],planVersionId:string,sessionDate:string):SoapProblemProgress[]{
 const scoped=entries.filter(entry=>entry.plan_version_id===planVersionId);
 const selectedDate=sessionDate||scoped.map(entry=>entry.session_date).sort().at(-1)||'';
 return problems.map(problem=>({...problem,sessionDate:selectedDate,interventions:[...new Set(scoped.filter(entry=>entry.session_date===selectedDate).flatMap(entry=>entry.snapshot.selections.filter(selection=>selection.problemId===problem.id).map(selection=>selection.text)))]}));
}
export const emptySoapPlan=():SoapPlanChoices=>({context:'',problems:[],objectives:[],implemented:[]});
export function soapPlanChoices(plan:PlanSnapshot|undefined,nodes:PlannerNode[],revision:number):SoapPlanChoices{
 if(!plan)return emptySoapPlan();
 const result:SoapPlanChoices={context:`Treatment plan: ${plan.title} · version ${revision} (${plan.status})`,problems:[],objectives:[],implemented:[]};
 for(const problem of plan.problems){
  result.problems.push({id:problem.id,text:problem.text});
  const visit=(node:ResolvedNode)=>{if(node.kind==='objective')result.objectives.push({id:problem.id+':'+node.id,text:problem.text+' — '+node.text});for(const child of node.children??[])visit(child);};visit(problem);
  result.implemented.push(...implementedChoices(problem,nodes).map(choice=>({id:problem.id+':'+choice.id,text:`${problem.text} — ${choice.text}\nAligned objective: ${choice.objectiveText}\nPlanned intervention: ${choice.plannedText}`})));
 }
 return result;
}
export type SoapQuickState={groups:Record<string,string[]>;problems:string[];objectives:Record<string,string>;implemented:string[];focus:string[]};
export const blankSoapQuick=():SoapQuickState=>({groups:{},problems:[],objectives:{},implemented:[],focus:[]});
export const blankSoapSections=():SoapSections=>({subjective:'',objective:'',assessment:'',plan:''});
export function assembleSoap(quick:SoapQuickState,narrative:SoapSections,source:SoapPlanChoices):SoapSections{
 const sections=blankSoapSections();
 for(const key of Object.keys(soapLabels) as SoapKey[]){
  const lines=soapGroups[key].flatMap(group=>{const choices=group.options.filter(option=>quick.groups[group.id]?.includes(option));return choices.length?[group.label+': '+choices.join('; ')+'.']:[];});
  const linked:string[]=[];
  if(key==='objective')for(const choice of source.implemented)if(quick.implemented.includes(choice.id))linked.push('Implemented this session: '+choice.text);
  if(key==='assessment'){
   for(const choice of source.problems)if(quick.problems.includes(choice.id))linked.push('Problem addressed: '+choice.text);
   for(const choice of source.problemProgress??source.problems.map(problem=>({...problem,sessionDate:'',interventions:[]})))if(objectiveProgress.includes(quick.objectives[choice.id] as typeof objectiveProgress[number])){
    linked.push('Progress toward treatment-plan objectives — '+choice.text+': '+quick.objectives[choice.id]);
    if(choice.interventions.length)linked.push('Implemented interventions recorded in Individual Progress Notes Planner ('+choice.sessionDate+'): '+choice.interventions.join('; '));
   }
  }
  if(key==='plan')for(const choice of source.problems)if(quick.focus.includes(choice.id))linked.push('Next-session focus: '+choice.text);
  if(linked.length)lines.push(source.context,...linked);
  if(narrative[key].trim())lines.push(narrative[key].trim());
  sections[key]=lines.join('\n\n');
 }
 return sections;
}
