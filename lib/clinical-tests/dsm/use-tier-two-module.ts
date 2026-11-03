'use client';
import {useEffect,useState} from 'react';
import {progressRecords,saveModule,clearModule,moduleSourceHash,type ModuleDefinition,type ModuleRecord,type Findings} from './tier-two-progress';
export function useTierTwoModule<T extends Record<string,number|boolean>>(id:string,initialize:()=>T,definition:ModuleDefinition){
 const [defaults]=useState(initialize);
 const requiredIds=Object.keys(defaults).filter(k=>typeof defaults[k]==='number');
 const [record,setRecord]=useState<ModuleRecord>(()=>{
  const saved=progressRecords()[id];
  const valid=saved&&JSON.stringify(saved.requiredIds)===JSON.stringify(requiredIds)&&Object.entries(saved.answers).every(([k,v])=>k in defaults&&typeof v===typeof defaults[k]);
  return valid?saved:{answers:{},requiredIds,definition,definitionHash:moduleSourceHash(id),updatedAt:new Date().toISOString(),completedAt:null,findings:null};
 });
 const [message,setMessage]=useState('');
 const answers={...defaults,...record.answers} as T;
 useEffect(()=>{saveModule(id,record);},[]);
 function setAnswer(key:string,value:number|boolean){const next={...record,answers:{...record.answers,[key]:value},completedAt:null,findings:null,updatedAt:new Date().toISOString()};setRecord(next);saveModule(id,next);setMessage('');}
 function saveDraft(){saveModule(id,record);setMessage('Draft kept in this open screening session.');}
 function completeModule(findings:Findings){if(!requiredIds.every(k=>typeof record.answers[k]==='number')){setMessage('Answer every rating question, including Duration and Impact, before completing this module.');return;}
  const next={...record,completedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),findings};
  if(saveModule(id,next)){setRecord(next);setMessage('Module completed. The tracker and final report are updated.');}else setMessage('Prepare the selected Tier 1 follow-up plan before completing this module.');
 }
 function resetModule(){if(!window.confirm('Clear only this module’s fictional answers and completion status?'))return;clearModule(id);setRecord({...record,answers:{},completedAt:null,findings:null});setMessage('This module was cleared. Other modules are retained.');}
 return {answers,setAnswer,answered:record.answers,saveDraft,completeModule,resetModule,message,remaining:requiredIds.filter(k=>typeof record.answers[k]!=='number').length};
}
