import {Fragment} from 'react';
import {textChanges} from '@/lib/emr/session-records';
export default function TrackedText({before,after,marked}:{before:string;after:string;marked:boolean}){
 return <div className="sessionRecordText">{marked?textChanges(before,after).map((change,index)=>change.kind==='remove'?<del className="sessionDeleted" key={index}><span className="sr-only">Deleted: </span>{change.text}</del>:change.kind==='add'?<ins className="sessionAdded" key={index}><span className="sr-only">Added: </span>{change.text}</ins>:<Fragment key={index}>{change.text}</Fragment>):after||'Not recorded'}</div>;
}
