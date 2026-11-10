'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';

type Template='DAP'|'SOAP'|'Narrative';
type SavedNote={
 id:string;patient_id:string;session_id:string;template:Template;
 sections:Record<string,string>;created_at:string;
};
const templateFields:Record<Template,readonly string[]>={
 DAP:['data','assessment','plan'],
 SOAP:['subjective','objective','assessment','plan'],
 Narrative:['narrative'],
};
const fieldNames:Record<string,string>={
 data:'Data',assessment:'Assessment',plan:'Plan',
 subjective:'Subjective',objective:'Objective',narrative:'Narrative',
};
const blankSections=(template:Template)=>Object.fromEntries(templateFields[template].map(key=>[key,''])) as Record<string,string>;

export default function PatientGroupProgressNotes({
 patientId,sessionId,groupName,
}:{patientId:string;sessionId:string;groupName:string}){
 const [template,setTemplate]=useState<Template>('DAP');
 const [sections,setSections]=useState<Record<string,string>>(()=>blankSections('DAP'));
 const [reviewed,setReviewed]=useState(false);
 const [notes,setNotes]=useState<SavedNote[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const endpoint='/api/emr/groups/individual-notes';
 const query='?patient='+encodeURIComponent(patientId)+'&session='+encodeURIComponent(sessionId);
 const load=useCallback(async()=>{
  const response=await fetch(endpoint+query,{cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Individual group notes are unavailable.');
  if(data.patientId!==patientId||data.sessionId!==sessionId||!Array.isArray(data.notes))
   throw Error('The note response did not match the selected central patient and session.');
  if(data.notes.some((note:SavedNote)=>note.patient_id!==patientId||note.session_id!==sessionId))
   throw Error('The note response contained records outside the selected chart.');
  return data.notes as SavedNote[];
 },[patientId,sessionId,query]);
 useEffect(()=>{
  let active=true;
  setLoading(true);setNotes([]);setError('');setMessage('');setReviewed(false);
  load().then(rows=>{if(active)setNotes(rows);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Individual group notes unavailable.');})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[load]);
 const complete=templateFields[template].every(key=>{
  const length=sections[key]?.trim().length??0;
  return length>=2&&length<=4000;
 });
 function chooseTemplate(next:Template){
  setTemplate(next);setSections(blankSections(next));setReviewed(false);setMessage('');
 }
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!reviewed||!complete||loading||saving||error)return;
  setSaving(true);setMessage('');
  try{
   const normalized=Object.fromEntries(templateFields[template].map(key=>[key,sections[key].trim()]));
   const response=await fetch(endpoint,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({patient_id:patientId,session_id:sessionId,template,sections:normalized,reviewed:true}),
   });
   const data=await response.json();
   if(!response.ok||data.saved!==true||data.unsigned!==true)throw Error(data.error||'Individual note save was not confirmed.');
   const updated=await load();
   setNotes(updated);setSections(blankSections(template));setReviewed(false);
   setMessage('Reviewed individual progress note saved as an unsigned, append-only patient record. No signature or billing claim was created.');
  }catch(e){setMessage(e instanceof Error?e.message:'Individual note save was not confirmed.');}
  finally{setSaving(false);}
 }
 return <section aria-label={'Individual progress notes — '+groupName}>
  <h4>Individual progress notes — {groupName}</h4>
  <p>These notes belong only to the selected patient's documented attendance. They are separate from the shared group record. Saved entries remain unsigned and cannot be edited or treated as claims.</p>
  {loading?<p role="status">Loading patient-specific group notes…</p>:error?
    <p role="alert">{error} This note editor is unavailable until records can be verified.</p>:
    <><h5>Previous reviewed notes ({notes.length})</h5>
     {notes.length===0?<p>No individual progress note has been saved for this session.</p>:
      <ol>{notes.map(note=><li key={note.id}>
       <strong>{note.template} — unsigned</strong> · {new Date(note.created_at).toLocaleString('en-US')}
       <dl>{Object.entries(note.sections).map(([key,value])=><div key={key}>
        <dt>{fieldNames[key]||key}</dt><dd>{value}</dd>
       </div>)}</dl>
      </li>)}</ol>}
     <form onSubmit={save}>
      <fieldset disabled={saving}>
       <legend>New patient-specific group note</legend>
       <label>Note template
        <select value={template} onChange={event=>chooseTemplate(event.target.value as Template)}>
         <option value="DAP">DAP</option><option value="SOAP">SOAP</option><option value="Narrative">Narrative</option>
        </select>
       </label>
       {templateFields[template].map(key=><label key={key}>{fieldNames[key]}
        <textarea required rows={3} minLength={2} maxLength={4000} value={sections[key]??''}
         onChange={event=>{setSections(current=>({...current,[key]:event.target.value}));setReviewed(false);}}/>
       </label>)}
       <label><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/>
        I reviewed this patient's individual note and understand this saves an unsigned clinical record.
       </label>
       <button type="submit" disabled={!reviewed||!complete||saving}>Save unsigned individual note</button>
      </fieldset>
     </form>
    </>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
