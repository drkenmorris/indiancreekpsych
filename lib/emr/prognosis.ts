import {emptyRichDoc,validRichDoc,type RichNode} from './treatment-response';
export const prognosisRatings=['Superior','Satisfactory','Fair','Deficient','Failure'] as const;
export type Prognosis={schema:'prognosis/2';discharge_percent:number|null;projected_sessions:number|null;projected_end_date:string;rating:''|typeof prognosisRatings[number];rationale:RichNode};
export const blankPrognosis=():Prognosis=>({schema:'prognosis/2',discharge_percent:null,projected_sessions:null,projected_end_date:'',rating:'',rationale:emptyRichDoc()});
export function prognosisText(node:RichNode):string{return (node.text??'')+(node.content??[]).map(prognosisText).join('');}
export function validPrognosis(value:unknown):value is Prognosis{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;const v=value as Prognosis;
 return Object.keys(v).length===6&&Object.keys(v).every(key=>['schema','discharge_percent','projected_sessions','projected_end_date','rating','rationale'].includes(key))&&v.schema==='prognosis/2'&&(v.discharge_percent===null||Number.isInteger(v.discharge_percent)&&v.discharge_percent>=10&&v.discharge_percent<=100&&v.discharge_percent%10===0)&&(v.projected_sessions===null||Number.isInteger(v.projected_sessions)&&v.projected_sessions>=1&&v.projected_sessions<=100)&&typeof v.projected_end_date==='string'&&(!v.projected_end_date||/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v.projected_end_date)&&!v.projected_end_date.startsWith('0000')&&Number.isFinite(Date.parse(v.projected_end_date))&&new Date(v.projected_end_date).toISOString().slice(0,10)===v.projected_end_date)&&(v.rating===''||prognosisRatings.includes(v.rating))&&validRichDoc(v.rationale)&&(v.discharge_percent!==null||v.projected_sessions!==null||!!v.projected_end_date||!!v.rating||!!prognosisText(v.rationale).trim());
}
export function prognosisFromRecord(record:Record<string,unknown>):Prognosis{
 return {schema:'prognosis/2',discharge_percent:record.discharge_percent as number|null,projected_sessions:record.projected_sessions as number|null,projected_end_date:record.projected_end_date as string,rating:record.rating as Prognosis['rating'],rationale:record.rationale as RichNode};
}
