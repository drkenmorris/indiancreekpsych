'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';

type Amendment={id:string;note_id:string;reason:string;amendment:string;created_at:string};
export default function PatientGroupNoteAmendments({noteId,patientId,sessionId}:
 {noteId:string;patientId:string;sessionId:string}){
 const [items,setItems]=useState<Amendment[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [editing,setEditing]=useState(false);
 const [reason,setReason]=useState('');
 const [amendment,setAmendment]=useState('');
 const [reviewed,setReviewed]=useState(false);
 const endpoint='/api/emr/groups/individual-notes/amendments';
 const query='?note='+encodeURIComponent(noteId)+'&patient='+encodeURIComponent(patientId)
  +'&session='+encodeURIComponent(sessionId);
 const load=useCallback(async()=>{
  const response=await fetch(endpoint+query,{cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Note amendments unavailable.');
  if(data.noteId!==noteId||data.patientId!==patientId||data.sessionId!==sessionId
   ||!Array.isArray(data.amendments)||data.amendments.some((a:Amendment)=>a.note_id!==noteId))
   throw Error('Amendment response did not match the selected patient note.');
  return data.amendments as Amendment[];
 },[noteId,patientId,sessionId,query]);
 useEffect(()=>{
  let active=true;setLoading(true);setItems([]);setError('');setEditing(false);setReviewed(false);
  load().then(rows=>{if(active)setItems(rows);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Amendments unavailable.');})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[load]);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!reviewed||saving||loading||error||reason.trim().length<5||amendment.trim().length<5)return;
  setSaving(true);setMessage('');
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({note_id:noteId,patient_id:patientId,session_id:sessionId,
     reason:reason.trim(),amendment:amendment.trim(),reviewed:true})});
   const data=await response.json();
   if(!response.ok||data.saved!==true||data.unsigned!==true)throw Error(data.error||'Amendment save unconfirmed.');
   const updated=await load();
   if(!updated.some(item=>item.id===data.id))throw Error('Amendment was not returned on verification read.');
   setItems(updated);setEditing(false);setReviewed(false);setReason('');setAmendment('');
   setMessage('Unsigned amendment saved. The original note remains unchanged and all addenda are retained.');
  }catch(e){setMessage(e instanceof Error?e.message:'Amendment save was not confirmed.');}
  finally{setSaving(false);}
 }
 return <section aria-label={'Amendments for progress note '+noteId}>
  <h6>Corrections and addenda</h6>
  <p>Original note remains permanently unchanged. Each clinician-reviewed addition is dated, immutable and unsigned.</p>
  {loading?<p role="status">Loading note amendments…</p>:error?
   <p role="alert">{error} Addenda cannot be saved until the original note is verified.</p>:
   <>{items.length===0?<p>No amendments recorded.</p>:
    <ol>{items.map(item=><li key={item.id}>
     <strong>Unsigned addendum — {new Date(item.created_at).toLocaleString('en-US')}</strong>
     <p>Reason: {item.reason}</p><p>{item.amendment}</p>
    </li>)}</ol>}
    {!editing?<button type="button" onClick={()=>{setEditing(true);setMessage('');}}>Add correction or clarification</button>:
     <form onSubmit={save} autoComplete="off"><fieldset disabled={saving}>
      <legend>New unsigned addendum — original note will not be changed</legend>
      <label>Reason for amendment
       <input required minLength={5} maxLength={200} value={reason} onChange={e=>{setReason(e.target.value);setReviewed(false);}}/>
      </label>
      <label>Corrective or supplementary clinical information
       <textarea required minLength={5} maxLength={4000} rows={3} value={amendment}
        onChange={e=>{setAmendment(e.target.value);setReviewed(false);}}/>
      </label>
      <label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>
       I reviewed this addition for the selected patient and understand it is not a signature, an overwrite, or a billing claim.
      </label>
      <button type="submit" disabled={!reviewed||reason.trim().length<5||amendment.trim().length<5||saving}>Save unsigned addendum</button>
      <button type="button" onClick={()=>{setEditing(false);setReviewed(false);setMessage('');}}>Discard draft</button>
     </fieldset></form>}
   </>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
