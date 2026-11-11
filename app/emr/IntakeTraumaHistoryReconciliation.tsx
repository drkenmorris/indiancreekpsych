'use client';
import {useEffect,useMemo,useState,type FormEvent} from 'react';
import IntakeTraumaHistory from '@/app/components/IntakeTraumaHistory';
import {parseTraumaHistory,traumaHistoryDefinition,validateTraumaHistory} from '@/lib/patient/trauma-history';

type TraumaRecord={kind:string;selections:Record<string,string[]>;notes?:Record<string,string>;definition?:{version?:string}};
type Notes={context_notes:string;followup_notes:string;source_notes:string};
const emptyNotes=():Notes=>({context_notes:'',followup_notes:'',source_notes:''});
const noteFields=[['context_notes','Clinical context / approximate timing'],['followup_notes','Follow-up and patient preferences'],['source_notes','Source limitations and review details']] as const;
const normalized=(value:string,notes:Notes)=>JSON.stringify({selections:parseTraumaHistory(value).selections,notes:Object.fromEntries(noteFields.map(([key])=>[key,notes[key].trim()]))});
const matches=(record:TraumaRecord,value:string,notes:Notes)=>record.definition?.version===traumaHistoryDefinition.version&&
 JSON.stringify({selections:record.selections,notes:Object.fromEntries(noteFields.map(([key])=>[key,record.notes?.[key]||'']))})===normalized(value,notes);
async function requireJson(response:Response){
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'The protected EMR request was not confirmed.');
 return data;
}
async function chart(patientId:string):Promise<{revision:number;records:TraumaRecord[]}>{
 const response=await fetch('/api/emr/workflow',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({patientId,path:'/api/chart?patient='+encodeURIComponent(patientId),method:'GET',expectedRevision:0})});
 const data=await requireJson(response);
 if(!Number.isInteger(data.revision)||!Array.isArray(data.value?.records))throw Error('Central chart response was incomplete.');
 return {revision:data.revision,records:data.value.records.filter((r:TraumaRecord)=>r.kind==='biopsychosocial_trauma_history')};
}

/** Only an explicit, reviewed, append-only transfer from the linked patient intake. */
export default function IntakeTraumaHistoryReconciliation({patientId,sourceJson,sourceUpdatedAt,sourceStatus}:
 {patientId:string;sourceJson:string;sourceUpdatedAt:string;sourceStatus:string}){
 const source=useMemo(()=>{
  try{
   const parsed=parseTraumaHistory(sourceJson);
   return {error:'',hasSelections:Object.values(parsed.selections).some(items=>items.length>0)};
  }catch{return {error:'The source checklist is invalid or has an unsupported version. Review the original intake; transfer is disabled.',hasSelections:false};}
 },[sourceJson]);
 const [records,setRecords]=useState<TraumaRecord[]>([]);
 const [draft,setDraft]=useState<string|null>(null);
 const [notes,setNotes]=useState<Notes>(emptyNotes);
 const [reviewed,setReviewed]=useState(false);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 useEffect(()=>{
  let active=true;setLoading(true);setRecords([]);setDraft(null);setNotes(emptyNotes());setReviewed(false);setError('');setMessage('');
  chart(patientId).then(data=>{if(active)setRecords(data.records);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Central history unavailable.');})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[patientId]);
 const duplicate=useMemo(()=>{
  if(draft===null)return false;
  try{return records.some(r=>matches(r,draft,notes));}catch{return false;}
 },[records,draft,notes]);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(draft===null||busy||loading||error||source.error||!reviewed)return;
  setBusy(true);setMessage('');
  try{
   const problem=validateTraumaHistory(draft);
   if(problem)throw Error(problem);
   if(noteFields.some(([key])=>notes[key].length>4000))throw Error('Each history note must be at most 4000 characters.');
   const parsed=parseTraumaHistory(draft);
   if(!Object.values(parsed.selections).some(values=>values.length>0)&&!Object.values(notes).some(n=>n.trim()))
    throw Error('Enter at least one reviewed observation before saving.');
   if(duplicate)throw Error('An identical trauma history snapshot is already saved. No duplicate was added.');
   // Re-read the linked account through the existing admin + MFA gate. Never join on a name.
   const sourceNow=await requireJson(await fetch('/api/emr/patients?id='+encodeURIComponent(patientId),{cache:'no-store'}));
   if(sourceNow.patients?.[0]?.id!==patientId||
      sourceNow.intake?.updated_at!==sourceUpdatedAt||
      sourceNow.intake?.status!==sourceStatus||
      sourceNow.intake?.answers?.trauma_history_checklist!==sourceJson)
    throw Error('Linked intake trauma history changed or was unlinked. Reopen the patient and review the latest source.');
   const current=await chart(patientId);
   if(current.records.some(r=>matches(r,draft,notes)))throw Error('An identical history was saved by another session. Refresh the chart.');
   await requireJson(await fetch('/api/emr/workflow',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({patientId,path:'/api/save',method:'POST',expectedRevision:current.revision,
     body:{patient_id:patientId,action:'biopsychosocial_trauma_history',data:{selections:parsed.selections,notes}}})}));
   const updated=await chart(patientId);
   setRecords(updated.records);setDraft(null);setNotes(emptyNotes());setReviewed(false);
   setMessage('The reviewed trauma-history snapshot was saved in the protected patient chart. It is not a diagnosis, signed assessment or emergency safety evaluation.');
  }catch(e){setMessage(e instanceof Error?e.message:'The trauma-history save could not be confirmed.');}
  finally{setBusy(false);}
 }
 return <section className="centralCard" aria-label="Trauma history reconciliation">
  <h3>Review intake trauma history into biopsychosocial chart</h3>
  <p>The linked patient's checklist is self-reported, optional and not diagnostic. Do not interpret unanswered groups as negative responses. A clinician must review each selection before saving an immutable snapshot; existing chart entries are preserved. Urgent safety concerns require separate clinical follow-up.</p>
  {source.error?<p role="alert">{source.error}</p>:loading?<p role="status">Checking protected trauma history…</p>:error?<p role="alert">{error}</p>:!source.hasSelections?<p>No selected trauma-history items are available in the linked intake. No transfer is offered.</p>:
   <><p>Saved biopsychosocial trauma-history snapshots: {records.length}.</p>
    {draft===null?<><details><summary>Review original intake checklist</summary><IntakeTraumaHistory value={sourceJson} readOnly/></details>
      <button type="button" disabled={busy} onClick={()=>{setDraft(sourceJson);setNotes(emptyNotes());setReviewed(false);setMessage('');}}>Prepare clinician trauma-history draft</button></>:
     <form onSubmit={save} autoComplete="off">
      <h4>Editable clinical history draft</h4>
      <IntakeTraumaHistory value={draft} onChange={value=>{setDraft(value);setReviewed(false);}} disabled={busy}/>
      {noteFields.map(([key,description])=><label key={key}>{description}<textarea maxLength={4000} rows={3} value={notes[key]} onChange={e=>{setNotes(prev=>({...prev,[key]:e.target.value}));setReviewed(false);}}/></label>)}
      <label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>
       I reviewed these reported details with clinical judgment and understand that this is an unsigned history snapshot, not proof of events, a diagnosis or a completed safety assessment.
      </label>
      {duplicate&&<p role="alert">An identical history snapshot is already saved.</p>}
      <button type="submit" disabled={busy||!reviewed||duplicate}>Save reviewed trauma-history snapshot</button>
      <button type="button" disabled={busy} onClick={()=>{setDraft(null);setReviewed(false);}}>Discard unsaved draft</button>
     </form>}</>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
