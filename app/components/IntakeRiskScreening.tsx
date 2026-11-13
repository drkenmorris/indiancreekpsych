'use client';
import {narrativeMayBeSkipped} from '@/lib/patient/intake-progress';
import IntakeNarrative from './IntakeNarrative';
import {riskChoiceFields,riskNarrativeFields} from '@/lib/patient/risk-screening';
import './intake-risk-screening.css';
export default function IntakeRiskScreening({answers,onChange,readOnly=false,disabled=false}:{answers:Record<string,string>;onChange:(key:string,value:string)=>void;readOnly?:boolean;disabled?:boolean}){
 return <div className="intakeRiskScreening">
  <p>Check one response per question: Yes or No. Checking the selected response again clears it.</p>
  {riskChoiceFields.map(([key,label,,required])=><fieldset key={key} className="intakeRiskQuestion" disabled={disabled||readOnly}><legend>{label}{required?' *':''}</legend><div className="intakeRiskChoices">{['Yes','No'].map(choice=><label key={choice}><input type="checkbox" name={key+'_'+choice.toLowerCase()} checked={answers[key]===choice} onChange={e=>onChange(key,e.target.checked?choice:'')}/>{choice}</label>)}</div>{answers[key]&&!['Yes','No'].includes(answers[key])&&<p className="intakeRiskOriginal">Previously recorded response: <strong>{answers[key]}</strong>.{!readOnly&&' Choose Yes or No to update this answer.'}</p>}</fieldset>)}
  {riskNarrativeFields.map(([key,label])=><IntakeNarrative key={key} label={label} value={answers[key]??''}
   onChange={value=>onChange(key,value)} allowNA={narrativeMayBeSkipped(key,answers)} disabled={readOnly||disabled}/>)}
 </div>;
}
