'use client';
import IntakeNarrative from './IntakeNarrative';
import {useId} from 'react';
import {emptyTreatmentEntry,hasTreatmentEntry,MAX_TREATMENT_ENTRIES,parseTreatmentHistory,TreatmentHistoryEntry} from '@/lib/patient/treatment-history';

export default function IntakeTreatmentHistory({value,onChange,readOnly=false,disabled=false}:{value:string;onChange?:(value:string)=>void;readOnly?:boolean;disabled?:boolean}){
 const id=useId();
 let entries:TreatmentHistoryEntry[];
 try{entries=parseTreatmentHistory(value);}catch{return <p role="alert">Saved treatment history could not be displayed. Contact the practice; the saved value has not been changed.</p>;}
 const displayed=value?entries:[emptyTreatmentEntry()];
 const update=(index:number,patch:Partial<TreatmentHistoryEntry>)=>onChange?.(JSON.stringify(displayed.map((entry,i)=>i===index?{...entry,...patch}:entry)));
 if(readOnly)return <section className="intakeTreatmentHistory"><h3>Counseling / Psychiatric History</h3>{entries.filter(hasTreatmentEntry).map((entry,index)=><section key={index}><h4>Treatment entry {index+1}</h4><dl>{[['Treatment Setting',entry.setting],['Provider / Facility',entry.provider_facility],['Start Date',entry.start_date],['End Date',entry.end_date],['Treatment is ongoing',entry.ongoing?'Yes':'No'],['Reason for Treatment',entry.reason],['Outcome / Notes',entry.outcome_notes]].map(([label,text])=><div key={label}><dt><strong>{label}</strong></dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{text||'Not provided'}</dd></div>)}</dl></section>)}{!entries.some(hasTreatmentEntry)&&<p>No treatment entries provided.</p>}</section>;
 return <section className="intakeTreatmentHistory" aria-labelledby={id+'-title'}><h3 id={id+'-title'}>Counseling / Psychiatric History</h3><p>Add an entry for each inpatient stay or outpatient course of treatment. Leave unknown dates blank. If you add a history entry, choose a setting and provide a provider/facility or a reason before submitting.</p>
  {displayed.map((entry,index)=><fieldset key={index} disabled={disabled} className="intakeTreatmentEntry"><legend>Treatment entry {index+1}</legend><div className="intakeTreatmentFields">
   <label htmlFor={`${id}-${index}-setting`}>Treatment Setting<select id={`${id}-${index}-setting`} name={`history_${index}_setting`} value={entry.setting} onChange={e=>update(index,{setting:e.target.value})}><option value="">Choose setting</option><option>Inpatient</option><option>Outpatient</option></select></label>
   <label htmlFor={`${id}-${index}-provider`}>Provider / Facility<input id={`${id}-${index}-provider`} name={`history_${index}_provider_facility`} maxLength={200} value={entry.provider_facility} onChange={e=>update(index,{provider_facility:e.target.value})}/></label>
   <label htmlFor={`${id}-${index}-start`}>Start Date<input id={`${id}-${index}-start`} name={`history_${index}_start_date`} type="date" value={entry.start_date} onChange={e=>update(index,{start_date:e.target.value})}/></label>
   <label htmlFor={`${id}-${index}-end`}>End Date<input id={`${id}-${index}-end`} name={`history_${index}_end_date`} type="date" disabled={entry.ongoing} value={entry.end_date} onChange={e=>update(index,{end_date:e.target.value})}/></label>
  </div><label className="intakeTreatmentOngoing" htmlFor={`${id}-${index}-ongoing`}><input id={`${id}-${index}-ongoing`} name={`history_${index}_ongoing`} type="checkbox" checked={entry.ongoing} onChange={e=>update(index,{ongoing:e.target.checked,...(e.target.checked?{end_date:''}:{})})}/>Treatment is ongoing</label>
  <IntakeNarrative label="Reason for Treatment" rows={2} maxLength={2000} value={entry.reason} onChange={reason=>update(index,{reason})}/>
  <IntakeNarrative label="Outcome / Notes" rows={2} maxLength={4000} value={entry.outcome_notes} onChange={outcome_notes=>update(index,{outcome_notes})}/>
  <button type="button" className="secondaryAction" onClick={()=>{if(!hasTreatmentEntry(entry)||window.confirm('Remove this treatment entry from the draft? Save the draft to keep this change.'))onChange?.(JSON.stringify(displayed.filter((_,i)=>i!==index)));}}>Remove treatment entry {index+1}</button>
 </fieldset>)}
 <label className="checkRow"><input type="checkbox" disabled={disabled||displayed.some(hasTreatmentEntry)} checked={value==='[]'} onChange={event=>onChange?.(event.target.checked?'[]':'')}/> I have no treatment entries to report</label>
 <button type="button" disabled={disabled||displayed.length>=MAX_TREATMENT_ENTRIES} onClick={()=>onChange?.(JSON.stringify([...displayed,emptyTreatmentEntry()]))}>Add another treatment entry</button><p>These entries save with the questionnaire when you select Save draft or Save.</p>
 </section>;
}
