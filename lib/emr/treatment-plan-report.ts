import type {PlanSnapshot} from './treatment-planner';
export type PlanApproval={versionId:string;revision:number;recordedAt:string;participants:{role:string;name:string;approval:'yes'|'no'|'unanswered'}[]};
export function treatmentPlanIdentity(central:Record<string,unknown>,records:{patient_id:string;kind:string;body:unknown}[],patientId:string,accountName:string){
 let prior:Record<string,unknown>={};
 for(const row of [...records].reverse()){
  if(row.patient_id!==patientId)throw Error('Chart identity mismatch.');
  if(row.kind!=='demographics')continue;
  try{const body=typeof row.body==='string'?JSON.parse(row.body):row.body;if(body?.schema==='demographics/2'){prior=body;break;}}catch{continue;}
 }
 const person={...prior,...central};const parts=accountName.trim().split(/\s+/);
 return {id:patientId,name:[person.first_name||parts[0],person.last_name||parts.slice(1).join(' ')].filter(v=>typeof v==='string'&&v.trim()).join(' ').trim(),dob:typeof person.dob==='string'?person.dob:''};
}
export function treatmentPlanReportIdentity(snapshot:PlanSnapshot,current:{name:string;dob:string}){
 return {name:current.name||snapshot.patient_name||'Not recorded',dob:current.dob||snapshot.patient_dob||'Not recorded',updated:!!((current.name&&current.name!==snapshot.patient_name)||(current.dob&&current.dob!==snapshot.patient_dob))};
}
