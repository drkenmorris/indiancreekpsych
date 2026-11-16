import type {PlanSnapshot,ResolvedNode} from './treatment-planner';
import {validRichDoc,type RichNode} from './treatment-response';
import {uuid} from './demographics';
export type HomeworkPlanVersion={id:string;plan_id:string;revision:number;snapshot:PlanSnapshot;created_at:string};
export type HomeworkSnapshot={patient_name:string;clinician_name:string;plan_title:string;plan_revision:number;plan_status:string;problem:{id:string;text:string};objective:{id:string;text:string};intervention:{id:string;text:string};assignment:RichNode};
export type SavedHomework={id:string;patient_id:string;plan_version_id:string;problem_id:string;objective_id:string;intervention_id:string;narrative:RichNode;snapshot:HomeworkSnapshot;created_at:string};
export type HomeworkInput={id:string;patientId:string;planVersionId:string;problemId:string;objectiveId:string;interventionId:string;narrative:RichNode};
export function descendants(nodes:ResolvedNode[],kind:ResolvedNode['kind']):ResolvedNode[]{return nodes.flatMap(node=>[...(node.kind===kind?[node]:[]),...descendants(node.children??[],kind)]);}
export function homeworkChoices(version:HomeworkPlanVersion|null,problemId:string,objectiveId:string){
 const problems=version?.snapshot.problems??[];
 const problem=problems.find(node=>node.id===problemId);
 const objectives=problem?descendants(problem.children,'objective'):[];
 const objective=objectives.find(node=>node.id===objectiveId);
 const interventions=objective?descendants(objective.children,'intervention'):[];
 return {problems,problem,objectives,objective,interventions};
}
export function richTextPlain(node:RichNode):string{return [node.text??'',...(node.content??[]).map(richTextPlain)].join('');}
export function validHomeworkInput(value:unknown):value is HomeworkInput {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const b=value as HomeworkInput;
 return uuid(b.id)&&uuid(b.patientId)&&uuid(b.planVersionId)&&[b.problemId,b.objectiveId,b.interventionId].every(v=>typeof v==='string'&&v.length>0&&v.length<=100)&&validRichDoc(b.narrative)&&richTextPlain(b.narrative).trim().length>0;
}
export function stableHomeworkJson(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(stableHomeworkJson).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stableHomeworkJson(v)).join(',')+'}';
 return JSON.stringify(value);
}
