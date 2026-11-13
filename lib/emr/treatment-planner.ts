export const plannerKinds=['problem','definition','goal','objective','intervention'] as const;
export type PlannerKind=typeof plannerKinds[number];
export const plannerLabels:Record<PlannerKind,string>={problem:'Problem / Diagnosis',definition:'Definition',goal:'Goal',objective:'Objective',intervention:'Intervention'};
export const plannerParents: Record<PlannerKind, PlannerKind | null> = {
 problem: null,
 definition: 'problem',
 goal: 'problem',
 objective: 'problem',
 intervention: 'objective',
};
export type PlannerNode={id:string;kind:PlannerKind;parent:string|null;text:string;active:boolean};
export type Selection={id:string;text?:string;primary?:boolean;agreed?:boolean;children:Selection[]};
export type ResolvedNode=Selection&{kind:PlannerKind;source_text:string;text:string;children:ResolvedNode[]};
export type PlanSnapshot={title:string;notes:string;review_date:string;status:'draft'|'finalized';library_revision:number;patient_name:string;patient_dob:string;clinician_name:string;created_at:string;problems:ResolvedNode[]};
export function validatePlannerLibrary(value:unknown):PlannerNode[]{
 if(!Array.isArray(value)||!value.length||value.length>5000)throw Error('Use between 1 and 5000 library items.');
 const ids=new Set<string>();
 for(const n of value){if(!n||typeof n!=='object'||typeof n.id!=='string'||!n.id||n.id.length>100||ids.has(n.id)||!plannerKinds.includes(n.kind)||typeof n.text!=='string'||!n.text.trim()||n.text.length>2000||typeof n.active!=='boolean')throw Error('Invalid or duplicate library item.');ids.add(n.id);}
 const map=new Map(value.map(n=>[n.id,n]));
 for(const n of value){const parentKind=plannerParents[n.kind as PlannerKind];if(parentKind===null?n.parent!==null:map.get(n.parent)?.kind!==parentKind)throw Error('Each item must be linked to its required parent.');}
 return value.map(n=>({id:n.id,kind:n.kind,parent:n.parent,text:n.text.trim(),active:n.active}));
}
export function childChoices(nodes:PlannerNode[],kind:PlannerKind,parent:string|null){return nodes.filter(n=>n.active&&n.kind===kind&&n.parent===parent);}
export function selectionFromSnapshot(node: ResolvedNode): Selection {
 const selection = {id:node.id,text:node.text,primary:node.primary,agreed:node.agreed};
 if (node.kind !== 'problem') return {...selection,children:node.children.map(selectionFromSnapshot)};

 // Earlier snapshots nested goals under definitions and objectives under goals.
 const definitions: Selection[] = [];
 const goals: Selection[] = [];
 const objectives: Selection[] = [];
 for (const child of node.children) {
  if (child.kind === 'definition') {
   definitions.push({...selectionFromSnapshot(child),children:[]});
   for (const goal of child.children) {
    goals.push({...selectionFromSnapshot(goal),children:[]});
    objectives.push(...goal.children.map(selectionFromSnapshot));
   }
  } else if (child.kind === 'goal') {
   goals.push(selectionFromSnapshot(child));
  } else if (child.kind === 'objective') {
   objectives.push(selectionFromSnapshot(child));
  }
 }
 return {...selection,children:[...definitions,...goals,...objectives]};
}
