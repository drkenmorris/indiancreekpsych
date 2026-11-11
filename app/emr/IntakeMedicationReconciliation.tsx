'use client';
import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {emptyMedication,hasMedication,parseMedications,validateMedications,type MedicationEntry} from '@/lib/patient/medications';

type ChartMedication=MedicationEntry&{id:string;kind:string};
type WorkflowResponse={revision:number;value:{records:ChartMedication[]}};
const keys=['medication','dosage','frequency','prescribing_physician','start_date','end_date'] as const;
const labels={medication:'Medication name',dosage:'Dosage',frequency:'Frequency',prescribing_physician:'Prescribing clinician',start_date:'Start date',end_date:'End date'};
const sameMedication=(a:MedicationEntry,b:MedicationEntry)=>a.medication.trim().toLocaleLowerCase()===b.medication.trim().toLocaleLowerCase()&&a.status===b.status;
async function readJson(response:Response){
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'The central EMR request could not be confirmed.');
 return data;
}
async function chartFor(patientId:string):Promise<WorkflowResponse>{
 const response=await fetch('/api/emr/workflow',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({patientId,path:'/api/chart?patient='+encodeURIComponent(patientId),method:'GET',expectedRevision:0})});
 const data=await readJson(response);
 if(!Number.isInteger(data.revision)||!Array.isArray(data.value?.records))throw Error('Central chart response was incomplete.');
 return data as WorkflowResponse;
}
/** Explicit clinician-mediated source transfer into the already-protected central EMR workspace.
 * A saved medication is an append-only history entry, not a prescription, signed order or medication-list attestation.
 */
export default function IntakeMedicationReconciliation({patientId,intakeJson,intakeUpdatedAt}:
 {patientId:string;intakeJson:string;intakeUpdatedAt:string}){
 const [selectedIndex,setSelectedIndex]=useState<number|null>(null);
 const [draft,setDraft]=useState<MedicationEntry>(emptyMedication);
 const [reviewed,setReviewed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [current,setCurrent]=useState<ChartMedication[]>([]);
 const source=useMemo(()=>{
  try{
   const problem=validateMedications(intakeJson,true);
   if(problem)throw Error(problem);
   return {entries:parseMedications(intakeJson).filter(hasMedication),problem:''};
  }catch{return {entries:[] as MedicationEntry[],problem:'The patient-reported medication source is malformed or incomplete. Do not transfer it; review the original intake.'};}
 },[intakeJson]);
 useEffect(()=>{
  let active=true;setCurrent([]);setSelectedIndex(null);setReviewed(false);setError('');setLoading(true);
  chartFor(patientId).then(data=>{
   if(active)setCurrent(data.value.records.filter(item=>item.kind==='biopsychosocial_medication'));
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Central medication history is unavailable.');})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[patientId]);
 function edit(field:keyof MedicationEntry,value:string){setDraft(prev=>({...prev,[field]:value}));setReviewed(false);setMessage('');}
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(selectedIndex===null||!reviewed||source.problem||busy||loading||error)return;
  setBusy(true);setMessage('');
  try{
   const problem=validateMedications(JSON.stringify([draft]),true);
   if(problem)throw Error(problem);
   if(!draft.medication.trim()||!['Current','Past'].includes(draft.status))throw Error('Medication name and Current/Past status are required.');
   if(current.some(r=>sameMedication(r,draft)))throw Error('This medication/status already appears in the chart. Review or amend the existing entry there instead of duplicating it.');
   // Prevent an outdated intake tab from silently importing a newer or different source.
   const sourceResponse=await fetch('/api/emr/patients?id='+encodeURIComponent(patientId),{cache:'no-store'});
   const sourceNow=await readJson(sourceResponse);
   if(sourceNow.patients?.[0]?.id!==patientId||sourceNow.intake?.updated_at!==intakeUpdatedAt||
      sourceNow.intake?.answers?.medication_entries!==intakeJson)
      throw Error('Patient intake changed or is no longer linked. Reopen this patient before reconciling medication history.');
   const latest=await chartFor(patientId);
   const latestMeds=latest.value.records.filter(item=>item.kind==='biopsychosocial_medication');
   if(latestMeds.some(r=>sameMedication(r,draft)))throw Error('The central chart already contains this medication/status. Reopen the chart to reconcile it.');
   // No browser demo storage and no replacement of existing clinical entries.
   const response=await fetch('/api/emr/workflow',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({patientId,path:'/api/save',method:'POST',expectedRevision:latest.revision,
      body:{patient_id:patientId,action:'biopsychosocial_medication',data:{...draft,prior_id:''}}})});
   await readJson(response);
   const updated=await chartFor(patientId);
   setCurrent(updated.value.records.filter(item=>item.kind==='biopsychosocial_medication'));
   setSelectedIndex(null);setReviewed(false);setDraft(emptyMedication());
   setMessage('A new medication-history entry was saved to the protected central chart. Review the chart before using it clinically; this is not a prescription, signed attestation or verified medication list.');
  }catch(e){setMessage(e instanceof Error?e.message:'Medication-history save was not confirmed.');}
  finally{setBusy(false);}
 }
 if(source.problem)return <section aria-label="Intake medication reconciliation" className="centralCard"><h3>Medication-history reconciliation</h3><p role="alert">{source.problem}</p></section>;
 return <section aria-label="Intake medication reconciliation" className="centralCard">
  <h3>Review reported medications into central history</h3>
  <p>Patient-reported intake information is not an independently verified medication list. Each new entry requires an administrator with MFA, clinician review and an explicit save. Existing central chart entries are never overwritten. Signatures and prescribing remain separate.</p>
  {loading?<p role="status">Checking current central medication history…</p>:error?<p role="alert">{error}</p>:
   source.entries.length===0?<p>No completed reported medications are available to reconcile.</p>:
   <ol>{source.entries.map((entry,index)=>{
    const exists=current.some(m=>sameMedication(m,entry));
    return <li key={index}><strong>{entry.medication}</strong> — {entry.status||'Status not recorded'}
     <button type="button" disabled={busy||exists} onClick={()=>{setSelectedIndex(index);setDraft({...entry});setReviewed(false);setMessage('');}}>
      {exists?'Already in central history':'Prepare review draft'}
     </button></li>;
   })}</ol>}
  {selectedIndex!==null&&<form onSubmit={save} autoComplete="off">
   <h4>Clinician review — medication {selectedIndex+1}</h4>
   <p>This is an editable draft. Correct the patient-reported details after reviewing with the patient. Saving creates a separate immutable history entry.</p>
   <div className="centralFields">{keys.map(key=><label key={key}>{labels[key]}
    <input type={key.endsWith('_date')?'date':'text'} maxLength={key.endsWith('_date')?10:200}
     required={key==='medication'} value={draft[key]} onChange={e=>edit(key,e.target.value)}/></label>)}
    <label>Medication status<select required value={draft.status} onChange={e=>{setDraft(prev=>({...prev,status:e.target.value,end_date:e.target.value==='Current'?'':prev.end_date}));setReviewed(false);}}>
     <option value="">Select status</option><option value="Current">Current</option><option value="Past">Past</option>
    </select></label>
    <label>Reported benefit<select value={draft.benefit} onChange={e=>edit('benefit',e.target.value)}>
     <option value="">Not recorded</option><option value="Beneficial">Beneficial</option><option value="Not beneficial">Not beneficial</option>
    </select></label>
   </div>
   <label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>
    I reviewed and corrected this patient's reported medication history for documentation. I understand this is not prescribing, a signature or a verified current-medication attestation.
   </label>
   <button type="submit" disabled={busy||!reviewed}>Save reviewed medication-history entry</button>
   <button type="button" disabled={busy} onClick={()=>{setSelectedIndex(null);setReviewed(false);}}>Cancel draft</button>
  </form>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
