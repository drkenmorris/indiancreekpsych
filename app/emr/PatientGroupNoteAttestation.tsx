'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';

type Attestation={id:string;note_id:string;signer_name:string;signed_at:string};
export default function PatientGroupNoteAttestation({noteId,patientId,sessionId}:{
 noteId:string;patientId:string;sessionId:string
}){
 const [attestation,setAttestation]=useState<Attestation|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [open,setOpen]=useState(false);
 const [name,setName]=useState('');
 const [attested,setAttested]=useState(false);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const url='/api/emr/groups/individual-notes/attest';
 const load=useCallback(async()=>{
  const response=await fetch(url+'?note='+encodeURIComponent(noteId)
   +'&patient='+encodeURIComponent(patientId)+'&session='+encodeURIComponent(sessionId),{cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Group note attestation unavailable.');
  if(data.noteId!==noteId||data.patientId!==patientId||data.sessionId!==sessionId
   ||(data.attestation!==null&&(!data.attestation||data.attestation.note_id!==noteId
      ||typeof data.attestation.id!=='string'||typeof data.attestation.signer_name!=='string')))
   throw Error('Attestation record does not match the selected patient and group session.');
  return data.attestation as Attestation|null;
 },[noteId,patientId,sessionId]);
 useEffect(()=>{
  let active=true;setLoading(true);setError('');setMessage('');setAttestation(null);
  setOpen(false);setAttested(false);setName('');
  load().then(row=>{if(active)setAttestation(row);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Attestation unavailable.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[load]);
 async function sign(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(saving||loading||error||!open||!attested||attestation||name.trim().length<3)return;
  setSaving(true);setMessage('');
  try{
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({note_id:noteId,patient_id:patientId,session_id:sessionId,
     typed_name:name.trim(),attested:true})});
   const data=await response.json();
   if(!response.ok||data.signed!==true||data.scope!=='original-group-note-only')
    throw Error(data.error||'Author attestation was not confirmed.');
   const verified=await load();
   if(!verified||verified.id!==data.id||verified.note_id!==noteId)
    throw Error('Attestation acknowledged but was not verified on chart readback; refresh before retrying.');
   setAttestation(verified);setOpen(false);setName('');setAttested(false);
   setMessage('Original group note attested. Later addenda remain separate and unsigned; no billing claim was created.');
  }catch(e){setMessage(e instanceof Error?e.message:'Group note attestation unavailable.');}
  finally{setSaving(false);}
 }
 return <section aria-label={'Author attestation for group note '+noteId}>
  {loading?<p role="status">Checking group note signature…</p>:error?
   <p role="alert">{error} Signing is disabled until the original note and its author can be verified.</p>:
   attestation?<p><strong>Author-attested:</strong> {attestation.signer_name} · {new Date(attestation.signed_at).toLocaleString('en-US')}.
    Attestation covers the original note only; later addenda are unsigned.</p>:
   <><p><strong>Unsigned original group note.</strong> Author attestation is optional until reviewed.
    This workflow does not verify professional licensure or authorize billing.</p>
    {!open?<button type="button" disabled={saving} onClick={()=>setOpen(true)}>Attest original group note</button>:
     <form autoComplete="off" onSubmit={e=>void sign(e)}>
      <fieldset disabled={saving}><legend>Permanent author attestation for original group note</legend>
       <p>Your full name must match the verified administrator profile. This signs the original note only, not subsequent amendments.</p>
       <label>Type your full profile name
        <input required minLength={3} maxLength={160} value={name}
         onChange={e=>{setName(e.target.value);setAttested(false);}}/>
       </label>
       <label><input type="checkbox" checked={attested} onChange={e=>setAttested(e.target.checked)}/>
        I personally authored or reviewed this group encounter note, verified the patient and attended session, and attest its original content is accurate to the best of my knowledge.
       </label>
       <button type="submit" disabled={!attested||name.trim().length<3||saving}>Record permanent group-note attestation</button>
       <button type="button" disabled={saving} onClick={()=>{setOpen(false);setAttested(false);setName('');}}>Cancel</button>
      </fieldset>
     </form>}
   </>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
