export const sectionKeys={SOAP:['subjective','objective','assessment','plan'],DAP:['data','assessment','plan']} as const;
export const sectionLabels:Record<string,string>={subjective:'Subjective',objective:'Objective',assessment:'Assessment',plan:'Plan',data:'Data'};
export type Sections=Record<string,string>;
export type SessionNote={id:string;patient_id:string;template:'SOAP'|'DAP';encounter_at:string;encounter_type:string;created_at:string;sections:Sections};
export type NoteRevision={id:string;note_id:string;prior_id:string|null;revision:number;reason:string;before_sections:Sections;sections:Sections;after_window:boolean;created_at:string};
export const validSections=(value:unknown,template:SessionNote['template']):value is Sections=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(sectionKeys,template))return false;
 const entries=Object.entries(value);return entries.length===sectionKeys[template].length&&entries.every(([k,v])=>(sectionKeys[template] as readonly string[]).includes(k)&&typeof v==='string'&&v.length<=4000)&&entries.some(([,v])=>(v as string).trim().length>0);
};
export const isAfterWindow=(created:string,serverNow:number)=>serverNow>Date.parse(created)+72*60*60*1000;
export function noteState(note:SessionNote,revisions:NoteRevision[]){
 const history=revisions.filter(r=>r.note_id===note.id).sort((a,b)=>a.revision-b.revision),latest=history.at(-1);
 const baseline=history.filter(r=>!r.after_window).at(-1)?.sections??note.sections;
 return {history,latest,current:latest?.sections??note.sections,baseline,marked:history.some(r=>r.after_window)};
}
export type Change={kind:'same'|'remove'|'add';text:string};
// Bounded word/whitespace diff. Both original and edited text reconstruct exactly.
export function textChanges(before:string,after:string):Change[]{
 const tokenize=(s:string)=>s.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu)??[];
 const a=tokenize(before),b=tokenize(after);let prefix=0,suffix=0;
 while(prefix<a.length&&prefix<b.length&&a[prefix]===b[prefix])prefix++;
 while(suffix<a.length-prefix&&suffix<b.length-prefix&&a[a.length-1-suffix]===b[b.length-1-suffix])suffix++;
 const x=a.slice(prefix,a.length-suffix),y=b.slice(prefix,b.length-suffix),out:Change[]=[];
 const push=(kind:Change['kind'],text:string)=>{if(!text)return;const prior=out.at(-1);if(prior?.kind===kind)prior.text+=text;else out.push({kind,text});};
 push('same',a.slice(0,prefix).join(''));
 if((x.length+1)*(y.length+1)>1_000_000){push('remove',x.join(''));push('add',y.join(''));}
 else{const width=y.length+1,grid=new Uint16Array((x.length+1)*width);for(let i=x.length-1;i>=0;i--)for(let j=y.length-1;j>=0;j--)grid[i*width+j]=x[i]===y[j]?1+grid[(i+1)*width+j+1]:Math.max(grid[(i+1)*width+j],grid[i*width+j+1]);let i=0,j=0;while(i<x.length||j<y.length){if(i<x.length&&j<y.length&&x[i]===y[j]){push('same',x[i++]);j++;}else if(i<x.length&&(j===y.length||grid[(i+1)*width+j]>=grid[i*width+j+1]))push('remove',x[i++]);else push('add',y[j++]);}}
 push('same',suffix?a.slice(a.length-suffix).join(''):'');return out;
}
