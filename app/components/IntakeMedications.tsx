'use client';
import {useId} from 'react';
import IntakeMedicationProduct from './IntakeMedicationProduct';
import {emptyMedication,hasMedication,MedicationEntry,medicationDurations,parseMedications} from '@/lib/patient/medications';
export default function IntakeMedications({value,onChange,readOnly=false,disabled=false}:{value:string;onChange?:(value:string)=>void;readOnly?:boolean;disabled?:boolean}){
 const id=useId();let entries:MedicationEntry[];try{entries=parseMedications(value);}catch{return <p role="alert">Saved medications could not be displayed. Contact the practice; the saved value has not been changed.</p>;}
 const displayed=value?entries:[emptyMedication()];
 const update=(index:number,patch:Partial<MedicationEntry>)=>onChange?.(JSON.stringify(displayed.map((entry,i)=>i===index?{...entry,...patch,status:'Current',start_date:'',end_date:''}:entry)));
 if(readOnly)return <section><h3>Medications</h3>{entries.filter(hasMedication).map((entry,index)=><section key={index}><h4>Medication {index+1}</h4><dl>{[['Medication',entry.medication],['Amount taken each time',entry.dosage],['Frequency',entry.frequency],['Estimated duration',entry.duration],['Prescribing Physician',entry.prescribing_physician],['Benefit',entry.benefit]].map(([label,text])=><div key={label}><dt><strong>{label}</strong></dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{text||'Not provided'}</dd></div>)}</dl></section>)}{!entries.some(hasMedication)&&<p>No medication entries provided.</p>}</section>;
 return <section className="intakeTreatmentHistory" aria-labelledby={id+'-title'}><h3 id={id+'-title'}>Medications you currently take</h3><p>Add each medication separately. Include psychiatric medications and other medications your clinician should know about. Choose the strength and form shown on your label. Enter the dose you actually take under Amount taken each time. Leave unknown details blank.</p>
 {displayed.map((entry,index)=><fieldset className="intakeTreatmentEntry" key={index} disabled={disabled}><legend>Medication {index+1}</legend><div className="intakeTreatmentFields">
  <IntakeMedicationProduct id={`${id}-${index}-medication`} name={`medication_${index}_medication`} value={entry.medication} onChange={medication=>update(index,{medication})}/>
  <label>About how long have you been taking this medication?
   <select value={entry.duration??''} onChange={event=>update(index,{duration:event.target.value})}>
    <option value="">Choose an estimate</option>
    {medicationDurations.map(duration=><option key={duration}>{duration}</option>)}
   </select>
  </label>
  {(['dosage','frequency','prescribing_physician'] as const).map(key=><label key={key}>
   {{dosage:'Amount taken each time',frequency:'Frequency',prescribing_physician:'Prescribing Physician'}[key]}
   <input maxLength={200} value={entry[key]} onChange={event=>update(index,{[key]:event.target.value})}/>
  </label>)}
 </div><fieldset className="intakeMedicationBenefit"><legend>Was the medication beneficial?</legend>{['Beneficial','Not beneficial'].map(benefit=><label key={benefit} className="intakeTreatmentOngoing"><input type="checkbox" name={`medication_${index}_benefit`} value={benefit} checked={entry.benefit===benefit} onChange={e=>update(index,{benefit:e.target.checked?benefit:''})}/>{benefit}</label>)}<p>Choose one, or leave both unchecked if not recorded.</p></fieldset>
 <button type="button" className="secondaryAction" onClick={()=>{if(!hasMedication(entry)||window.confirm('Remove this medication from the draft? Save the draft to keep this change.'))onChange?.(JSON.stringify(displayed.filter((_,i)=>i!==index)));}}>Remove medication {index+1}</button></fieldset>)}
 <label className="checkRow"><input type="checkbox" disabled={disabled||displayed.some(hasMedication)} checked={value==='[]'} onChange={event=>onChange?.(event.target.checked?'[]':'')}/> I do not currently take any medications</label>
 <button type="button" disabled={disabled||displayed.length>=20} onClick={()=>onChange?.(JSON.stringify([...displayed,emptyMedication()]))}>Add another medication</button><p>If an entry is completed, the medication name is required before submitting. Entries save with the questionnaire using Save draft or Save.</p>
 </section>;
}
