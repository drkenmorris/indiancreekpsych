'use client';
import {useId} from 'react';
import {dsmVersionOptions,dsmVersionLabel,validateDsmVersion} from '@/lib/clinical-tests/dsm/entry-choice';
import './dsm-version-choice.css';
export default function DsmVersionChoice({value,onChange,dob='',disabled=false,readOnly=false,required=false}:{value:string;onChange?:(v:string)=>void;dob?:string;disabled?:boolean;readOnly?:boolean;required?:boolean}){
 const id=useId();const error=readOnly?null:validateDsmVersion(value,dob);
 return <fieldset className="dsmVersionChoice" disabled={disabled} aria-describedby={`${id}-help${error?' '+id+'-error':''}`}><legend>DSM questionnaire version{required?' *':''}</legend>
 {readOnly?<p><strong>{dsmVersionLabel(value)}</strong></p>:<div className="dsmVersionChoiceOptions">{dsmVersionOptions.map(o=><label key={o.value}><input type="radio" name={id} value={o.value} checked={value===o.value} onChange={()=>onChange?.(o.value)} aria-required={required||undefined}/><span><strong>{o.label}</strong><small>{o.ages}</small></span></label>)}<button type="button" onClick={()=>onChange?.('')}>Clear selection / discuss with provider</button></div>}
 <p id={`${id}-help`}>Select the intended respondent’s version. The parent/guardian version records caregiver observations; it does not replace the child’s own report. {required?'Choose a version before saving a DSM assignment.':'This choice is optional and may be discussed with your provider.'} Selecting a version does not start the questionnaire or send an invitation. Patient completion is pending release.</p>
 {error&&<p id={`${id}-error`} role="alert">{error}</p>}</fieldset>;
}
