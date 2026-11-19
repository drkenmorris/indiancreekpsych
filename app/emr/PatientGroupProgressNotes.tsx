'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import PatientGroupNoteAmendments from './PatientGroupNoteAmendments';
import PatientGroupNoteAttestation from './PatientGroupNoteAttestation';

type Template='DAP'|'SOAP'|'Narrative';
type SavedNote={
 id:string;patient_id:string;session_id:string|null;template:Template;group_name?:string;encounter_at?:string;
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

type GroupNoteProps={patientId:string;sessionId:string|null;groupName:string;inWorkspace?:boolean};
export default function PatientGroupProgressNotes(props:GroupNoteProps){return <GroupNoteEditor key={props.patientId+':'+(props.sessionId??'independent')} {...props}/>;}
function GroupNoteEditor({
 patientId,sessionId,groupName,inWorkspace=false,
}:{patientId:string;sessionId:string|null;groupName:string;inWorkspace?:boolean}){
 const independent=sessionId===null;
 const [sessionName,setSessionName]=useState(''),[encounter,setEncounter]=useState('');
 const active=useRef(true);useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const [template,setTemplate]=useState<Template>('DAP');
 const [sections,setSections]=useState<Record<string,string>>(()=>blankSections('DAP'));
 const [reviewed,setReviewed]=useState(false);
 const [notes,setNotes]=useState<SavedNote[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const endpoint='/api/emr/groups/individual-notes';
 const query='?patient='+encodeURIComponent(patientId)+'&session='+encodeURIComponent(sessionId??'independent');
 const load=useCallback(async()=>{
  const response=await fetch(endpoint+query,{cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Individual group notes are unavailable.');
  if(data.patientId!==patientId||data.sessionId!==sessionId||!Array.isArray(data.notes))
   throw Error('The note response did not match the selected central patient and session.');
  if(data.notes.some((note:SavedNote)=>note.patient_id!==patientId||note.session_id!==sessionId||independent&&(!note.group_name||!note.encounter_at||!Number.isFinite(Date.parse(note.encounter_at)))))
   throw Error('The note response contained records outside the selected chart.');
  return data.notes as SavedNote[];
 },[patientId,sessionId,query,independent]);
 useEffect(()=>{
  let active=true;
  setLoading(true);setNotes([]);setError('');setMessage('');setReviewed(false);
  load().then(rows=>{if(active)setNotes(rows);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Individual group notes unavailable.');})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[load]);
 const groupDirty=Object.values(sections).some(value=>value.trim().length>0)||independent&&(!!sessionName.trim()||!!encounter);
 useEffect(()=>{if(!inWorkspace)return;const warn=(event:BeforeUnloadEvent)=>{if(groupDirty)event.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[groupDirty,inWorkspace]);
 const complete=templateFields[template].every(key=>{
  const length=sections[key]?.trim().length??0;
  return length>=2&&length<=4000;
 });
 function chooseTemplate(next:Template){
  if(Object.values(sections).some(value=>value.trim())&&!window.confirm('Discard the current note text and change template?'))return;
  setTemplate(next);setSections(blankSections(next));setReviewed(false);setMessage('');
 }
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!reviewed||!complete||loading||saving||error||independent&&(sessionName.trim().length<2||!encounter||!Number.isFinite(new Date(encounter).getTime())))return;
  setSaving(true);setMessage('');
  try{
   const normalized=Object.fromEntries(templateFields[template].map(key=>[key,sections[key].trim()]));
   const response=await fetch(endpoint,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({patient_id:patientId,session_id:sessionId,template,sections:normalized,reviewed:true,...(independent?{group_name:sessionName.trim(),encounter_at:new Date(encounter).toISOString()}:{})}),
   });
   const data=await response.json();
   if(!response.ok||data.saved!==true||data.unsigned!==true)throw Error(data.error||'Individual note save was not confirmed.');
   const updated=await load();
   if(!updated.some(note=>note.id===data.id))throw Error('Save acknowledged but not verified in this patient chart. Reload before retrying.');
   if(!active.current)return;setNotes(updated);setSections(blankSections(template));setReviewed(false);if(independent){setSessionName('');setEncounter('');}
   setMessage('Reviewed individual progress note saved as an unsigned, append-only patient record. No signature or billing claim was created.');
  }catch(e){if(active.current)setMessage(e instanceof Error?e.message:'Individual note save was not confirmed.');}
  finally{if(active.current)setSaving(false);}
 }
 return <section aria-label={'Individual progress notes — '+groupName} data-clinical-note-dirty={inWorkspace&&groupDirty?'true':'false'}>
  <h4>{independent?'Individual Group Session Notes':'Individual progress notes — '+groupName}</h4>
  <p>{independent?'Enter a group-session note directly for the active patient. No Treatment Teams/Groups record, shared session or attendance entry is required.':'These notes belong only to the selected patient’s documented attendance. They are separate from the shared group record.'} Original notes are saved unsigned; corrections and author attestations remain separate.</p>
  {loading?<p role="status">Loading patient-specific group notes…</p>:error?
    <p role="alert">{error} This note editor is unavailable until records can be verified.</p>:
    <><h5>Previous reviewed notes ({notes.length})</h5>
     {notes.length===0?<p>No individual progress note has been saved for this session.</p>:
      <ol>{notes.map(note=><li key={note.id}>
       {independent&&<p><strong>{note.group_name}</strong> · Session: {new Date(note.encounter_at!).toLocaleString('en-US')}</p>}
       <strong>{note.template} — recorded original</strong> · {new Date(note.created_at).toLocaleString('en-US')}
       <dl>{templateFields[note.template].map(key=><div key={key}>
        <dt>{fieldNames[key]||key}</dt><dd className="soapNoteWording">{note.sections[key]}</dd>
       </div>)}</dl>
       <PatientGroupNoteAttestation key={'signature-'+note.id} noteId={note.id} patientId={patientId} sessionId={sessionId}/>
       <PatientGroupNoteAmendments key={note.id} noteId={note.id} patientId={patientId} sessionId={sessionId}/>
      </li>)}</ol>}
     <form onSubmit={save}>
      <fieldset disabled={saving}>
       <legend>New patient-specific group note</legend>
       {independent&&<><label>Group name<input required minLength={2} maxLength={160} value={sessionName} onChange={e=>{setSessionName(e.target.value);setReviewed(false);}}/></label><label>Session date and time (your device’s timezone)<input type="datetime-local" required value={encounter} onChange={e=>{setEncounter(e.target.value);setReviewed(false);}}/></label></>}
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
       <button type="submit" disabled={!reviewed||!complete||saving||independent&&(!sessionName.trim()||!encounter)}>Save unsigned individual note</button>
      </fieldset>
     </form>
    </>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
