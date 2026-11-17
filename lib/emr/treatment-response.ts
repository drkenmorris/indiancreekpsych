export const responseRoles={patient:'Active patient',significant_other:'Significant other',parent:'Parent',guardian:'Guardian',family:'Family member'} as const;
export const narrativeLabels={patient:'Active patient narrative',significantOther:'Significant other narrative',family:'Parents, guardians, or family members narrative'} as const;
export const fontFamilies=['Arial','Calibri','Georgia','Times New Roman','Verdana','Courier New'] as const;
export const fontSizes=['10pt','11pt','12pt','14pt','16pt','18pt','20pt','24pt'] as const;
export type RichNode={type:string;text?:string;attrs?:Record<string,unknown>;marks?:{type:string;attrs?:Record<string,unknown>}[];content?:RichNode[]};
export type ResponseParticipant={id:string;role:keyof typeof responseRoles;name:string;approval:'yes'|'no'|'unanswered'};
export type TreatmentResponse={schema:'treatment-response/1';planReference:string;participants:ResponseParticipant[];narratives:Record<keyof typeof narrativeLabels,RichNode>};
export const emptyRichDoc=():RichNode=>({type:'doc',content:[{type:'paragraph'}]});
export function emptyTreatmentResponse():TreatmentResponse {return {schema:'treatment-response/1',planReference:'',participants:[{id:crypto.randomUUID(),role:'patient',name:'',approval:'unanswered'},{id:crypto.randomUUID(),role:'significant_other',name:'',approval:'unanswered'}],narratives:{patient:emptyRichDoc(),significantOther:emptyRichDoc(),family:emptyRichDoc()}};}
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function validRichDoc(value:unknown):value is RichNode {
 let count=0,characters=0;
 function walk(n:unknown,depth:number,parent?:string):boolean {
  if(!object(n)||depth>16||++count>2000||!keys(n,['type','text','attrs','marks','content']))return false;
  if(!['doc','paragraph','text','bulletList','orderedList','listItem','hardBreak'].includes(n.type))return false;
  if(depth===0?n.type!=='doc':n.type==='doc')return false;
  const children:Record<string,string[]>={doc:['paragraph','bulletList','orderedList'],paragraph:['text','hardBreak'],bulletList:['listItem'],orderedList:['listItem'],listItem:['paragraph','bulletList','orderedList']};
  if(parent&&!children[parent]?.includes(n.type))return false;
  if(n.type==='text'){if(typeof n.text!=='string'||!n.text.length||'content' in n)return false;characters+=n.text.length;}else if('text' in n)return false;
  if(n.attrs!==undefined){
   if(!object(n.attrs))return false;
   const allowed=n.type==='paragraph'?['textAlign','indent']:n.type==='orderedList'?['start','type']:[];
   if(!keys(n.attrs,allowed))return false;
   if(n.attrs.textAlign!=null&&!['left','center','right','justify'].includes(n.attrs.textAlign))return false;
   if(n.attrs.indent!=null&&(!Number.isInteger(n.attrs.indent)||n.attrs.indent<0||n.attrs.indent>8))return false;
   if(n.attrs.start!=null&&(!Number.isInteger(n.attrs.start)||n.attrs.start<1||n.attrs.start>1000))return false;
   if(n.attrs.type!=null&&n.attrs.type!=='1')return false;
  }
  if(n.marks!==undefined){
   if(n.type!=='text'||!Array.isArray(n.marks)||n.marks.length>5||new Set(n.marks.map((m:any)=>m?.type)).size!==n.marks.length)return false;
   for(const m of n.marks){
    if(!object(m)||!keys(m,['type','attrs'])||!['bold','italic','underline','strike','textStyle'].includes(m.type))return false;
    if(m.attrs!==undefined){
     if(!object(m.attrs)||!keys(m.attrs,m.type==='textStyle'?['fontFamily','fontSize']:[]))return false;
     if(m.attrs.fontFamily!=null&&!fontFamilies.includes(m.attrs.fontFamily))return false;
     if(m.attrs.fontSize!=null&&!fontSizes.includes(m.attrs.fontSize))return false;
    }
   }
  }
  if(n.content!==undefined&&(!Array.isArray(n.content)||!n.content.every((child:unknown)=>walk(child,depth+1,n.type))))return false;
  return n.type==='text'||n.type==='hardBreak'?!('content' in n):n.type==='paragraph'||Array.isArray(n.content)&&n.content.length>0;
 }
 return walk(value,0)&&characters<=20000&&JSON.stringify(value).length<=150000;
}
export function validTreatmentResponse(value:unknown):value is TreatmentResponse {
 if(!object(value)||Object.keys(value).length!==4||!keys(value,['schema','planReference','participants','narratives'])||value.schema!=='treatment-response/1'||typeof value.planReference!=='string'||value.planReference.length>200||!Array.isArray(value.participants)||value.participants.length<1||value.participants.length>30)return false;
 if(value.participants.filter((p:any)=>p?.role==='patient').length!==1||new Set(value.participants.map((p:any)=>p?.id)).size!==value.participants.length)return false;
 if(!value.participants.every((p:unknown)=>object(p)&&Object.keys(p).length===4&&keys(p,['id','role','name','approval'])&&uuid(p.id)&&Object.hasOwn(responseRoles,p.role)&&typeof p.name==='string'&&p.name.length<=120&&['yes','no','unanswered'].includes(p.approval)&&(p.role==='patient'||p.approval==='unanswered'||p.name.trim().length>0)))return false;
 return object(value.narratives)&&Object.keys(value.narratives).length===3&&Object.keys(narrativeLabels).every(k=>validRichDoc(value.narratives[k]));
}

export type ResponsePlanChoice={id:string;planId:string;revision:number;firstRecordedAt:string;recordedAt:string;title:string;status:string};
export const responsePlanReference=(id:string)=>'plan-version:'+id;
export function responsePlanLabel(plan:ResponsePlanChoice){
 const date=(value:string)=>new Date(value).toLocaleString('en-US',{timeZone:'America/Chicago',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'});
 return date(plan.firstRecordedAt)+' — '+plan.title+' — Version '+plan.revision+(plan.revision>1?' (recorded '+date(plan.recordedAt)+')':'');
}
