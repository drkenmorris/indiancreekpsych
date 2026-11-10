'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';

type Template='DAP'|'SOAP'|'Narrative';
type Note={id:string;patient_id:string;encounter_at:string;encounter_type:string;template:Template;sections:Record<string,string>;created_at:string};
type Addendum={id:string;note_id:string;reason:string;amendment:string;created_at:string};
const fields:Record<Template,readonly string[]>={DAP:['data','assessment','plan'],SOAP:['subjective','objective','assessment','plan'],Narrative:['narrative']};
const labels:Record<string,string>={data:'Data',assessment:'Assessment',plan:'Plan',subjective:'Subjective',objective:'Objective',narrative:'Narrative'};
const blank=(kind:Template)=>Object.fromEntries(fields[kind].map(key=>[key,''])) as Record<string,string>;
const localDateTime=()=>{
 const now=new Date();
 return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
};
const endpoint='/api/emr/progress-notes';

export default function PatientProgressNotes({patientId}:{patientId:string}){
 const [notes,setNotes]=useState<Note[]>([]);
 const [addenda,setAddenda]=useState<Addendum[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [template,setTemplate]=useState<Template>('DAP');
 const [sections,setSections]=useState<Record<string,string>>(()=>blank('DAP'));
 const [encounter,setEncounter]=useState(localDateTime);
 const [encounterType,setEncounterType]=useState('Individual therapy');
 const [reviewed,setReviewed]=useState(false);
 const [addTo,setAddTo]=useState('');
 const [reason,setReason]=useState('');
 const [amendment,setAmendment]=useState('');
 const [addendumReviewed,setAddendumReviewed]=useState(false);
 const load=useCallback(async()=>{
  const response=await fetch(endpoint+'?patient='+encodeURIComponent(patientId),{cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Progress notes unavailable.');
  if(data.patientId!==patientId||!Array.isArray(data.notes)||!Array.isArray(data.addenda))
   throw Error('Progress-note response does not match selected patient.');
  if(data.notes.some((note:Note)=>note.patient_id!==patientId))
   throw Error('Patient mismatch in progress-note response.');
  const ids=new Set((data.notes as Note[]).map(note=>note.id));
  if(data.addenda.some((add:Addendum)=>!ids.has(add.note_id)))
   throw Error('An addendum was not bound to the selected patient chart.');
  return {notes:data.notes as Note[],addenda:data.addenda as Addendum[]};
 },[patientId]);
 useEffect(()=>{
  let active=true;setLoading(true);setNotes([]);setAddenda([]);setError('');setMessage('');setAddTo('');setReviewed(false);
  load().then(data=>{if(active){setNotes(data.notes);setAddenda(data.addenda);}})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Progress notes unavailable.');})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[load]);
 async function save(payload:unknown,kind:'note'|'addendum'){
  setSaving(true);setMessage('');
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const data=await response.json();
   if(!response.ok||data.saved!==true||data.unsigned!==true||data.kind!==kind)
    throw Error(data.error||'Save was not confirmed.');
   const refreshed=await load();
   if(!(kind==='note'?refreshed.notes:refreshed.addenda).some(item=>item.id===data.id))
    throw Error('Save was acknowledged but confirmation read did not include the new record. Check the chart before retrying.');
   setNotes(refreshed.notes);setAddenda(refreshed.addenda);
   if(kind==='note'){setSections(blank(template));setReviewed(false);}
   else{setAddTo('');setReason('');setAmendment('');setAddendumReviewed(false);}
   setMessage(kind==='note'?
    'Reviewed individual progress note saved unsigned. No signature or claim was created.':
    'Reviewed addendum saved unsigned. The original clinical note was not changed.');
  }catch(e){setMessage(e instanceof Error?e.message:'Save could not be confirmed.');}
  finally{setSaving(false);}
 }
 const valid=fields[template].every(key=>{const length=sections[key]?.trim().length??0;return length>=2&&length<=4000;});
 const validAdd=reason.trim().length>=5&&reason.trim().length<=200&&amendment.trim().length>=5&&amendment.trim().length<=4000;
 function submitNote(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(loading||saving||error||!reviewed||!valid||!encounter)return;
  const date=new Date(encounter);if(!Number.isFinite(date.getTime()))return;
  void save({action:'note',patient_id:patientId,encounter_at:date.toISOString(),encounter_type:encounterType,
   template,sections:Object.fromEntries(fields[template].map(key=>[key,sections[key].trim()])),reviewed:true},'note');
 }
 function submitAddendum(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(loading||saving||error||!addendumReviewed||!validAdd||!addTo)return;
  void save({action:'addendum',patient_id:patientId,note_id:addTo,reason:reason.trim(),amendment:amendment.trim(),reviewed:true},'addendum');
 }
 return <article className="centralCard" aria-label="Individual clinical progress notes">
  <h2>Individual clinical progress notes</h2>
  <p>Patient-bound outpatient notes and dated corrections. All entries remain unsigned, append-only and separate from group attendance, billing and the prototype's synthetic data.</p>
  {loading?<p role="status">Loading this patient's clinical notes…</p>:error?
   <p role="alert">{error} Clinical note entry is disabled until the selected chart can be verified.</p>:<>
    <h3>Saved individual notes ({notes.length})</h3>
    {notes.length===0?<p>No individual progress notes are saved for this patient.</p>:
     <ol>{notes.map(note=><li key={note.id}>
      <strong>{note.encounter_type} — {note.template} — unsigned</strong>
      <p>Encounter: {new Date(note.encounter_at).toLocaleString('en-US')} · Recorded: {new Date(note.created_at).toLocaleString('en-US')}</p>
      <dl>{Object.entries(note.sections).map(([key,value])=><div key={key}><dt>{labels[key]||key}</dt><dd>{value}</dd></div>)}</dl>
      <h4>Corrections and addenda</h4>
      {addenda.filter(add=>add.note_id===note.id).length===0?<p>No amendments.</p>:
       <ol>{addenda.filter(add=>add.note_id===note.id).map(add=><li key={add.id}>
        <strong>Unsigned addendum — {new Date(add.created_at).toLocaleString('en-US')}</strong>
        <p>Reason: {add.reason}</p><p>{add.amendment}</p></li>)}</ol>}
      <button type="button" disabled={saving} onClick={()=>{setAddTo(note.id===addTo?'':note.id);setReason('');setAmendment('');setAddendumReviewed(false);}}>
       {note.id===addTo?'Cancel addendum':'Add correction or clarification'}
      </button>
      {note.id===addTo&&<form autoComplete="off" onSubmit={submitAddendum}>
       <fieldset disabled={saving}><legend>New addendum — original note remains unchanged</legend>
        <label>Reason for correction<input required minLength={5} maxLength={200} value={reason}
         onChange={e=>{setReason(e.target.value);setAddendumReviewed(false);}}/></label>
        <label>Corrected or additional clinical information<textarea required minLength={5} maxLength={4000} rows={3}
         value={amendment} onChange={e=>{setAmendment(e.target.value);setAddendumReviewed(false);}}/></label>
        <label><input type="checkbox" checked={addendumReviewed} onChange={e=>setAddendumReviewed(e.target.checked)}/>
         I reviewed this correction for the selected patient; it is unsigned and does not alter the original note or create a claim.</label>
        <button type="submit" disabled={!addendumReviewed||!validAdd||saving}>Save unsigned addendum</button>
       </fieldset>
      </form>}
     </li>)}</ol>}
    <form autoComplete="off" onSubmit={submitNote}><fieldset disabled={saving}>
     <legend>New individual progress note</legend>
     <label>Encounter date and time (your device's timezone; verify before saving)
      <input type="datetime-local" required value={encounter} onChange={e=>{setEncounter(e.target.value);setReviewed(false);}}/>
     </label>
     <label>Clinical encounter type<select value={encounterType} onChange={e=>{setEncounterType(e.target.value);setReviewed(false);}}>
      <option>Individual therapy</option><option>Initial evaluation</option><option>Follow-up</option><option>Other clinical encounter</option>
     </select></label>
     <label>Progress-note format<select value={template} onChange={e=>{const next=e.target.value as Template;setTemplate(next);setSections(blank(next));setReviewed(false);}}>
      <option>DAP</option><option>SOAP</option><option>Narrative</option></select></label>
     {fields[template].map(key=><label key={key}>{labels[key]}
      <textarea required minLength={2} maxLength={4000} rows={3} value={sections[key]??''}
       onChange={e=>{setSections(current=>({...current,[key]:e.target.value}));setReviewed(false);}}/>
     </label>)}
     <label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>
      I reviewed the date, patient identity and note content. Save as an unsigned, append-only clinical record.</label>
     <button type="submit" disabled={!reviewed||!valid||!encounter||saving}>Save unsigned individual note</button>
    </fieldset></form>
   </>}
  {message&&<p role="status">{message}</p>}
 </article>;
}
