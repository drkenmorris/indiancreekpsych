'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {validateMedicationAllergies} from '@/lib/patient/medications';

type Allergy={id:string;kind:string;allergy_status:string;allergy_notes:string};
const statuses=['No known medication allergies','Medication allergies reported'] as const;
const matches=(a:Allergy,status:string,notes:string)=>a.allergy_status===status&&a.allergy_notes===notes.trim();
async function read(response:Response){
 const value=await response.json();if(!response.ok)throw Error(value.error||'Central allergy-history request failed.');return value;
}
async function chart(patientId:string):Promise<{revision:number;allergies:Allergy[]}>{
 const r=await fetch('/api/emr/workflow',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({patientId,path:'/api/chart?patient='+encodeURIComponent(patientId),method:'GET',expectedRevision:0})});
 const value=await read(r);
 if(!Number.isInteger(value.revision)||!Array.isArray(value.value?.records))throw Error('Central chart response was incomplete.');
 return {revision:value.revision,allergies:value.value.records.filter((row:Allergy)=>row.kind==='medication_allergies')};
}
/** Explicit source review; never quietly asserts absence of allergies or overwrites prior clinical data. */
export default function IntakeAllergyReconciliation({patientId,sourceStatus,sourceNotes,sourceUpdatedAt}:
 {patientId:string;sourceStatus:string;sourceNotes:string;sourceUpdatedAt:string}){
 const [records,setRecords]=useState<Allergy[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 // After an attempted chart write, do not permit a second submit until durable readback confirms it.
 const [verificationPending,setVerificationPending]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [editing,setEditing]=useState(false);
 const [status,setStatus]=useState('');
 const [notes,setNotes]=useState('');
 const [reviewed,setReviewed]=useState(false);
 // In-flight requests are tied to the exact patient and intake revision, even across A→B→A navigation.
 const scope=useRef({patientId,sourceStatus,sourceNotes,sourceUpdatedAt,generation:0});
 if(scope.current.patientId!==patientId||scope.current.sourceStatus!==sourceStatus||
    scope.current.sourceNotes!==sourceNotes||scope.current.sourceUpdatedAt!==sourceUpdatedAt)
  scope.current={patientId,sourceStatus,sourceNotes,sourceUpdatedAt,generation:scope.current.generation+1};
 const preparedGeneration=useRef<number|null>(null);
 const savingGeneration=useRef<number|null>(null);
 useEffect(()=>{
  let active=true;setRecords([]);setLoading(true);setError('');setMessage('');setEditing(false);setReviewed(false);setBusy(false);setStatus('');setNotes('');setVerificationPending(false);
  chart(patientId).then(value=>{if(active)setRecords(value.allergies);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Central medication allergy history unavailable.');})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[patientId,sourceStatus,sourceNotes,sourceUpdatedAt]);
 const sourceError=validateMedicationAllergies(sourceStatus,sourceNotes);
 const eligible=!sourceError&&statuses.includes(sourceStatus as typeof statuses[number]);
 const duplicate=records.some(item=>matches(item,status,notes));
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const generation=scope.current.generation;
  const onOriginalScope=()=>scope.current.generation===generation&&scope.current.patientId===patientId&&
   scope.current.sourceStatus===sourceStatus&&scope.current.sourceNotes===sourceNotes&&
   scope.current.sourceUpdatedAt===sourceUpdatedAt;
  if(savingGeneration.current===generation||preparedGeneration.current!==generation||
     verificationPending||!reviewed||!editing||busy||loading||error)return;
  savingGeneration.current=generation;
  setBusy(true);setMessage('');
  try{
   const reason=validateMedicationAllergies(status,notes);
   if(reason)throw Error(reason);
   if(!statuses.includes(status as typeof statuses[number]))throw Error('A clinician-reviewed allergy status is required.');
   if(duplicate)throw Error('This allergy status and narrative already exist in the chart. Review existing history instead.');
   const result=await fetch('/api/emr/patients?id='+encodeURIComponent(patientId),{cache:'no-store'});
   const source=await read(result);
   if(!onOriginalScope())return;
   if(source.intake?.status!=='submitted')
    throw Error('Linked intake has not been submitted; medication-allergy history cannot be reconciled from a draft.');
   if(source.patients?.[0]?.id!==patientId||source.intake?.updated_at!==sourceUpdatedAt||
      (source.intake?.answers?.medication_allergy_status||'')!==sourceStatus||
      (source.intake?.answers?.medication_allergy_notes||'')!==sourceNotes)
      throw Error('The linked allergy intake changed. Reopen this patient and review the latest source before saving.');
   const latest=await chart(patientId);
   if(!onOriginalScope())return;
   if(latest.allergies.some(row=>matches(row,status,notes)))throw Error('An identical allergy history snapshot was already saved.');
   // The write may commit even if the response or follow-up chart read fails.
   // Lock retries until verified persistence or a fresh chart reopen.
   if(!onOriginalScope())return;
   setVerificationPending(true);
   const write=await fetch('/api/emr/workflow',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({patientId,path:'/api/save',method:'POST',expectedRevision:latest.revision,
     body:{patient_id:patientId,action:'medication_allergies',data:{allergy_status:status,allergy_notes:notes.trim()}}})});
   await read(write);
   if(!onOriginalScope())return;
   const refreshed=await chart(patientId);
   if(!onOriginalScope())return;
   const priorIds=new Set(latest.allergies.map(row=>row.id));
   // A matching historical entry or unchanged chart revision is not proof this write persisted.
   if(refreshed.revision<=latest.revision||!refreshed.allergies.some(row=>
     typeof row.id==='string'&&row.id.trim().length>0&&!priorIds.has(row.id)&&matches(row,status,notes)))
    throw Error('Allergy-history save was acknowledged, but the exact reviewed entry was not verified on chart readback. Reopen the chart before retrying.');
   setVerificationPending(false);
   setRecords(refreshed.allergies);setEditing(false);setReviewed(false);setStatus('');setNotes('');
   setMessage('A reviewed medication-allergy history entry was saved in the protected central chart. It is a documentation snapshot, not a signed allergy attestation or medication order.');
  }catch(e){if(onOriginalScope())setMessage(e instanceof Error?e.message:'Allergy history save was not confirmed.');}
  finally{if(savingGeneration.current===generation)savingGeneration.current=null;
   if(onOriginalScope())setBusy(false);}
 }
 return <section className="centralCard" aria-label="Medication allergy history reconciliation">
  <h3>Review reported medication allergies into central history</h3>
  <p>Never automatically convert a patient report into a verified absence or presence of allergies. A clinician must examine the source, confirm status and reactions, and explicitly save a new chart snapshot.</p>
  {loading?<p role="status">Checking central allergy history…</p>:error?<p role="alert">{error}</p>:
   !eligible?<p>{sourceError||'The intake does not have a reviewable allergy status. Confirm allergies directly with the patient.'}</p>:
   <><p>Existing central allergy history snapshots: {records.length}. Previously saved records are preserved.</p>
    {!editing?<button type="button" disabled={busy} onClick={()=>{preparedGeneration.current=scope.current.generation;setStatus(sourceStatus);setNotes(sourceNotes);setReviewed(false);setMessage('');setEditing(true);}}>Prepare medication-allergy review</button>:
     <form onSubmit={save}>
      <label>Clinician-reviewed allergy status<select value={status} onChange={e=>{setStatus(e.target.value);if(e.target.value==='No known medication allergies')setNotes('');setReviewed(false);}}>
       <option value="">Select one</option>{statuses.map(s=><option key={s} value={s}>{s}</option>)}
      </select></label>
      <label>Known medication allergies and reactions<textarea rows={4} maxLength={4000} value={notes}
       disabled={status==='No known medication allergies'} onChange={e=>{setNotes(e.target.value);setReviewed(false);}}/></label>
      <label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>
       I reviewed and corrected this patient's reported medication allergies for documentation. This does not create a prescription, signed attestation or automatic medication reconciliation.
      </label>
      {duplicate&&<p role="alert">An identical allergy status and narrative already exist in the chart.</p>}
      <button type="submit" disabled={busy||!reviewed||duplicate||verificationPending}>Save reviewed allergy-history entry</button>
      <button type="button" disabled={busy} onClick={()=>{setEditing(false);setReviewed(false);}}>Discard unsaved review</button>
     </form>}
   </>}
  {verificationPending&&<p role="alert">The prior save outcome is not independently verified. Reopen the protected chart and inspect history before another attempt; do not submit a duplicate clinical entry.</p>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
