'use client';
import {riskChoiceFields,riskNarrativeFields} from '@/lib/patient/risk-screening';
import './intake-risk-screening.css';
export default function IntakeRiskScreening({answers,onChange,readOnly=false,disabled=false}:{answers:Record<string,string>;onChange:(key:string,value:string)=>void;readOnly?:boolean;disabled?:boolean}){
 return <div className="intakeRiskScreening">
  <p>Check one response per question: Yes or No. Checking the selected response again clears it.</p>
  {riskChoiceFields.map(([key,label,,required])=><fieldset key={key} className="intakeRiskQuestion" disabled={disabled||readOnly}><legend>{label}{required?' *':''}</legend><div className="intakeRiskChoices">{['Yes','No'].map(choice=><label key={choice}><input type="checkbox" name={key+'_'+choice.toLowerCase()} checked={answers[key]===choice} onChange={e=>onChange(key,e.target.checked?choice:'')}/>{choice}</label>)}</div>{answers[key]&&!['Yes','No'].includes(answers[key])&&<p className="intakeRiskOriginal">Previously recorded response: <strong>{answers[key]}</strong>.{!readOnly&&' Choose Yes or No to update this answer.'}</p>}</fieldset>)}
  {riskNarrativeFields.map(([key,label])=><label className="intakeRiskNarrative" key={key}>{label}<textarea name={key} rows={5} maxLength={8000} readOnly={readOnly} disabled={disabled} value={answers[key]??''} onChange={e=>onChange(key,e.target.value)}/></label>)}
 </div>;
}
