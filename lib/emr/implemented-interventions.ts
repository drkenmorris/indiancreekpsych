import type {PlannerNode,ResolvedNode} from './treatment-planner';
import {uuid} from './demographics';
export type ImplementedSelection={problemId:string;implementedId:string};
export type ImplementedOption={id:string;text:string;problemId:string;plannedId:string;plannedText:string;objectiveId:string;objectiveText:string};
export type InterventionEntry={id:string;plan_version_id:string;library_revision:number;session_date:string;selection_ids:ImplementedSelection[];snapshot:{plan_title:string;plan_revision:number;plan_status:string;selections:(ImplementedOption&{problemText:string})[]};created_at:string};
export function implementedChoices(problem:ResolvedNode,nodes:PlannerNode[]):ImplementedOption[]{
 const byId=new Map(nodes.map(node=>[node.id,node]));
 const choices:ImplementedOption[]=[];
 function visit(node:ResolvedNode,objective?:ResolvedNode){
  const currentObjective=node.kind==='objective'?node:objective;
  if(node.kind==='intervention'&&currentObjective){
   const planned=byId.get(node.id),objectiveSource=byId.get(currentObjective.id),problemSource=byId.get(problem.id);
   if(planned?.active&&planned.kind==='intervention'&&planned.parent===currentObjective.id&&objectiveSource?.active&&objectiveSource.parent===problem.id&&problemSource?.active){
    for(const option of nodes.filter(n=>n.kind==='implemented_intervention'&&n.active&&n.parent===node.id))choices.push({id:option.id,text:option.text,problemId:problem.id,plannedId:node.id,plannedText:node.text,objectiveId:currentObjective.id,objectiveText:currentObjective.text});
   }
  }
  for(const child of node.children??[])visit(child,currentObjective);
 }
 visit(problem);return choices;
}
export type ImplementedInput={id:string;patientId:string;planVersionId:string;libraryRevision:number;sessionDate:string;selections:ImplementedSelection[]};
export function validImplementedInput(value:unknown):value is ImplementedInput{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as ImplementedInput;
 return uuid(v.id)&&uuid(v.patientId)&&uuid(v.planVersionId)&&Number.isSafeInteger(v.libraryRevision)&&v.libraryRevision>0&&typeof v.sessionDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v.sessionDate)&&!v.sessionDate.startsWith('0000')&&Number.isFinite(Date.parse(v.sessionDate))&&new Date(v.sessionDate).toISOString().slice(0,10)===v.sessionDate&&Array.isArray(v.selections)&&v.selections.length>0&&v.selections.length<=100&&v.selections.every(s=>s&&typeof s.problemId==='string'&&s.problemId.length>0&&s.problemId.length<=100&&typeof s.implementedId==='string'&&s.implementedId.length>0&&s.implementedId.length<=100)&&new Set(v.selections.map(s=>s.problemId+':'+s.implementedId)).size===v.selections.length;
}
