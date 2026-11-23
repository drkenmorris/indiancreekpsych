'use client';
import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {emptyMedication,medicationDurations,hasMedication,parseMedications,validateMedications,type MedicationEntry} from '@/lib/patient/medications';

type ChartMedication=MedicationEntry&{id:string;kind:string};
type WorkflowResponse={revision:number;value:{records:ChartMedication[]}};
const keys=['medication','dosage','frequency','prescribing_physician','start_date','end_date'] as const;
const labels={medication:'Medication name',dosage:'Amount taken each time',frequency:'Frequency',prescribing_physician:'Prescribing clinician',start_date:'Start date',end_date:'End date'};
const sameMedication=(a:MedicationEntry,b:MedicationEntry)=>a.medication.trim().toLocaleLowerCase()===b.medication.trim().toLocaleLowerCase()&&a.status===b.status;
/** Never render upstream errors: they may contain names, clinical details, or SQL arguments. */
class MedicationReviewError extends Error {}
const medicationReviewMessage=(error:unknown,fallback:string)=>
 error instanceof MedicationReviewError?error.message:fallback;
async function readJson(response:Response){
 if(!response.ok)throw new MedicationReviewError(
  response.status===401||response.status===403
   ?'Protected medication history requires an authorized administrator with MFA.'
   :'The protected chart request was not confirmed. Reopen the chart and check history before retrying.');
 // A failed JSON decode must never display the original server or transport error.
 return response.json();
}
async function chartFor(patientId:string):Promise<WorkflowResponse>{
 const response=await fetch('/api/emr/workflow',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({patientId,path:'/api/chart?patient='+encodeURIComponent(patientId),method:'GET',expectedRevision:0})});
 const data=await readJson(response);
 if(!Number.isInteger(data.revision)||!Array.isArray(data.value?.records))throw new MedicationReviewError('Central chart response was incomplete.');
 return data as WorkflowResponse;
}
/** Explicit clinician-mediated source transfer into the already-protected central EMR workspace.
 * A saved medication is an append-only history entry, not a prescription, signed order or medication-list attestation.
 */
export default function IntakeMedicationReconciliation({patientId:requestedPatientId,intakeJson,intakeUpdatedAt}:
 {patientId:string;intakeJson:string;intakeUpdatedAt:string}){
 // Protected patient APIs return canonical lowercase UUIDs; use the same chart identity for provenance and writes.
 const patientId=requestedPatientId.toLowerCase();
 const [selectedIndex,setSelectedIndex]=useState<number|null>(null);
 const [draft,setDraft]=useState<MedicationEntry>(emptyMedication);
 const [reviewed,setReviewed]=useState(false);
 const [busy,setBusy]=useState(false);
 // After an attempted chart write, do not permit a second submit until durable readback confirms it.
 const [verificationPending,setVerificationPending]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [current,setCurrent]=useState<ChartMedication[]>([]);
 // Chart and source provenance must remain the same throughout an asynchronous
 // clinician save. A → B → A navigation also invalidates the older request.
 const scope=useRef({patientId,intakeJson,intakeUpdatedAt,generation:0});
 if(scope.current.patientId!==patientId||scope.current.intakeJson!==intakeJson||
    scope.current.intakeUpdatedAt!==intakeUpdatedAt)
  scope.current={patientId,intakeJson,intakeUpdatedAt,generation:scope.current.generation+1};
 const savingGeneration=useRef<number|null>(null);
 const source=useMemo(()=>{
  try{
   const problem=validateMedications(intakeJson,true);
   if(problem)throw new MedicationReviewError('Medication details could not be validated. Review the original intake and correct the draft.');
   return {entries:parseMedications(intakeJson).filter(hasMedication),problem:''};
  }catch{return {entries:[] as MedicationEntry[],problem:'The patient-reported medication source is malformed or incomplete. Do not transfer it; review the original intake.'};}
 },[intakeJson]);
 useEffect(()=>{
  let active=true;setCurrent([]);setSelectedIndex(null);setReviewed(false);setDraft(emptyMedication());setError('');setMessage('');setBusy(false);setLoading(true);setVerificationPending(false);
  chartFor(patientId).then(data=>{
   if(active)setCurrent(data.value.records.filter(item=>item.kind==='biopsychosocial_medication'));
  }).catch(e=>{if(active)setError(medicationReviewMessage(e,'Central medication history is unavailable. Reopen the protected chart.'));})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[patientId,intakeJson,intakeUpdatedAt]);
 function edit(field:keyof MedicationEntry,value:string){setDraft(prev=>({...prev,[field]:value}));setReviewed(false);setMessage('');}
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const generation=scope.current.generation;
  const onOriginalScope=()=>scope.current.generation===generation&&scope.current.patientId===patientId&&
   scope.current.intakeJson===intakeJson&&scope.current.intakeUpdatedAt===intakeUpdatedAt;
  // The busy state updates on the next React render; a direct duplicate
  // form submit must not start a second clinical write in the same event turn.
  if(savingGeneration.current===generation||verificationPending||selectedIndex===null||!reviewed||source.problem||busy||loading||error)return;
  savingGeneration.current=generation;
  setBusy(true);setMessage('');
  try{
   const problem=validateMedications(JSON.stringify([draft]),true);
   if(problem)throw Error(problem);
   if(!draft.medication.trim()||!['Current','Past'].includes(draft.status))throw new MedicationReviewError('Medication name and Current/Past status are required.');
   if(current.some(r=>sameMedication(r,draft)))throw new MedicationReviewError('This medication/status already appears in the chart. Review or amend the existing entry there instead of duplicating it.');
   // Prevent an outdated intake tab from silently importing a newer or different source.
   const sourceResponse=await fetch('/api/emr/patients?id='+encodeURIComponent(patientId),{cache:'no-store'});
   const sourceNow=await readJson(sourceResponse);
   if(!onOriginalScope())return;
   if(sourceNow.intake?.status!=='submitted')
    throw new MedicationReviewError('Linked intake has not been submitted; medication history cannot be reconciled from a draft.');
   if(sourceNow.patients?.[0]?.id!==patientId||sourceNow.intake?.updated_at!==intakeUpdatedAt||
      sourceNow.intake?.answers?.medication_entries!==intakeJson)
      throw new MedicationReviewError('Patient intake changed or is no longer linked. Reopen this patient before reconciling medication history.');
   const latest=await chartFor(patientId);
   if(!onOriginalScope())return;
   const latestMeds=latest.value.records.filter(item=>item.kind==='biopsychosocial_medication');
   if(latestMeds.some(r=>sameMedication(r,draft)))throw new MedicationReviewError('The central chart already contains this medication/status. Reopen the chart to reconcile it.');
   // No browser demo storage and no replacement of existing clinical entries.
   // The write may commit even if the response or follow-up chart read fails.
   // Lock retries until verified persistence or a fresh chart reopen.
   if(!onOriginalScope())return;
   setVerificationPending(true);
   const response=await fetch('/api/emr/workflow',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({patientId,path:'/api/save',method:'POST',expectedRevision:latest.revision,
      body:{patient_id:patientId,action:'biopsychosocial_medication',data:{...draft,prior_id:''}}})});
   await readJson(response);
   if(!onOriginalScope())return;
   const updated=await chartFor(patientId);
   if(!onOriginalScope())return;
   const confirmed=updated.value.records.filter(item=>item.kind==='biopsychosocial_medication');
   // A matching older row (or an unversioned/replayed chart response) is not
   // proof that THIS reviewed save created a new immutable history entry.
   // Require a newly identified row and an advancing chart revision as well
   // as exact field-by-field readback before announcing persistence.
   const earlierIds=new Set(latestMeds.map(item=>item.id));
   if(updated.revision<=latest.revision||!confirmed.some(item=>
      typeof item.id==='string'&&item.id.trim().length>0&&!earlierIds.has(item.id)&&
      sameMedication(item,draft)&&
      keys.every(key=>item[key]===draft[key].trim())&&
      item.benefit===draft.benefit&&(item.duration||'')===(draft.duration||'')))
    throw new MedicationReviewError('Medication-history save was acknowledged, but the exact reviewed entry was not verified on chart readback. Reopen the chart before retrying.');
   setVerificationPending(false);
   setCurrent(confirmed);
   setSelectedIndex(null);setReviewed(false);setDraft(emptyMedication());
   setMessage('A new medication-history entry was saved to the protected central chart. Review the chart before using it clinically; this is not a prescription, signed attestation or verified medication list.');
  }catch(e){if(onOriginalScope())setMessage(medicationReviewMessage(e,'Medication-history save outcome is uncertain. Reopen the protected chart and inspect history before retrying.'));}
  finally{
   if(savingGeneration.current===generation)savingGeneration.current=null;
   if(onOriginalScope())setBusy(false);
  }
 }
 if(source.problem)return <section aria-label="Intake medication reconciliation" className="centralCard"><h3>Medication-history reconciliation</h3><p role="alert">{source.problem}</p></section>;
 return <section aria-label="Intake medication reconciliation" className="centralCard">
  <h3>Review reported medications into central history</h3>
  <p>Patient-reported intake information is not an independently verified medication list. Each new entry requires an administrator with MFA, clinician review and an explicit save. Existing central chart entries are never overwritten. Signatures and prescribing remain separate.</p>
  {loading?<p role="status">Checking current central medication history…</p>:error?<p role="alert">{error}</p>:
   source.entries.length===0?<p>No completed reported medications are available to reconcile.</p>:
   <ol>{source.entries.map((entry,index)=>{
    const exists=current.some(m=>sameMedication(m,entry));
    return <li key={index}><strong>{entry.medication}</strong>{entry.duration&&<> · {entry.duration}</>}{entry.dosage&&<> · Amount taken each time: {entry.dosage}</>}
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
    <label>Estimated duration<select value={draft.duration??''} onChange={e=>{setDraft(prev=>({...prev,duration:e.target.value}));setReviewed(false);}}>
     <option value="">Choose an estimate</option>{medicationDurations.map(duration=><option key={duration}>{duration}</option>)}
    </select></label>
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
   <button type="submit" disabled={busy||!reviewed||verificationPending}>Save reviewed medication-history entry</button>
   <button type="button" disabled={busy} onClick={()=>{setSelectedIndex(null);setReviewed(false);}}>Cancel draft</button>
  </form>}
  {verificationPending&&<p role="alert">The prior save outcome is not independently verified. Reopen the protected chart and inspect history before another attempt; do not submit a duplicate clinical entry.</p>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
