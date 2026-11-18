'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
const labels={subjective:'Subjective (S)',objective:'Objective (O)',assessment:'Assessment (A)',plan:'Plan (P)'} as const;
type Sections=Record<keyof typeof labels,string>;
type Note={id:string;patient_id:string;template:string;encounter_at:string;encounter_type:string;created_at:string;sections:Record<string,string>};
const blank=():Sections=>({subjective:'',objective:'',assessment:'',plan:''});
export default function SoapNotes({patientId}:{patientId:string}){
 const [notes,setNotes]=useState<Note[]>([]),[sections,setSections]=useState<Sections>(blank);
 const [date,setDate]=useState(''),[encounterType,setEncounterType]=useState('Individual therapy');
 const [reviewed,setReviewed]=useState(false),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[dirty,setDirty]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState('');const generation=useRef(0);
 const read=useCallback(async(signal?:AbortSignal)=>{
  const response=await fetch('/api/emr/progress-notes?patient='+encodeURIComponent(patientId),{cache:'no-store',signal});const data=await response.json();
  if(!response.ok)throw Error(data.error||'SOAP notes could not be loaded.');
  if(data.patientId!==patientId||!Array.isArray(data.notes)||data.notes.some((note:Note)=>note.patient_id!==patientId))throw Error('The note history did not match the selected patient.');
  return (data.notes as Note[]).filter(note=>note.template==='SOAP');
 },[patientId]);
 useEffect(()=>{
  const request=++generation.current,controller=new AbortController();setNotes([]);setSections(blank());setDate('');setReviewed(false);setDirty(false);setLoading(true);setSaving(false);setError('');setMessage('');
  if(!patientId){setLoading(false);return;}
  void read(controller.signal).then(items=>{if(!controller.signal.aborted&&generation.current===request)setNotes(items);}).catch(e=>{if(!controller.signal.aborted&&generation.current===request)setError(e instanceof Error?e.message:'SOAP notes unavailable.');}).finally(()=>{if(!controller.signal.aborted&&generation.current===request)setLoading(false);});
  return()=>controller.abort();
 },[patientId,read]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty)event.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function edit(){setDirty(true);setReviewed(false);setMessage('');}
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(saving||loading)return;
  if(!date||!Number.isFinite(new Date(date).getTime())||!reviewed||Object.values(sections).some(value=>value.trim().length<2)){setMessage('Complete the encounter date/time, all four SOAP sections, and the review checkbox before saving.');return;}
  const request=generation.current;setSaving(true);setMessage('Saving SOAP note…');
  try{
   const response=await fetch('/api/emr/progress-notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'note',patient_id:patientId,encounter_at:new Date(date).toISOString(),encounter_type:encounterType,template:'SOAP',sections:Object.fromEntries(Object.entries(sections).map(([key,value])=>[key,value.trim()])),reviewed:true})});const result=await response.json();if(generation.current!==request)return;
   if(!response.ok||result.saved!==true||result.unsigned!==true)throw Error(result.error||'Save was not confirmed.');
   const current=await read();if(generation.current!==request)return;if(!current.some(note=>note.id===result.id))throw Error('The save was acknowledged but could not be confirmed in the chart. Check saved notes before retrying.');
   setNotes(current);setSections(blank());setReviewed(false);setDirty(false);setMessage('SOAP note saved unsigned in this patient’s clinical record.');
  }catch(e){if(generation.current===request)setMessage(e instanceof Error?e.message:'SOAP note could not be saved.');}
  finally{if(generation.current===request)setSaving(false);}
 }
 return <section className="centralCard" data-soap-dirty={dirty?'true':'false'}>
  <h1>SOAP Notes</h1><p>Record the patient’s subjective report, objective observations, clinical assessment, and plan for this encounter.</p>
  {!patientId?<p>Select a patient from Find/Add Patient before entering a note.</p>:loading?<p role="status">Loading SOAP notes…</p>:error?<p role="alert">{error}</p>:<>
   <form onSubmit={save} noValidate aria-label="New SOAP note"><fieldset disabled={saving}><legend>New SOAP note</legend>
    <label>Encounter date and time (your device’s timezone)<input type="datetime-local" name="encounter" value={date} required onChange={event=>{setDate(event.target.value);edit();}}/></label>
    <label>Type of encounter<select value={encounterType} onChange={event=>{setEncounterType(event.target.value);edit();}}><option>Individual therapy</option><option>Initial evaluation</option><option>Follow-up</option><option>Other clinical encounter</option></select></label>
    {(Object.keys(labels) as (keyof Sections)[]).map(key=><label key={key}>{labels[key]}<textarea name={key} rows={5} required minLength={2} maxLength={4000} value={sections[key]} onChange={event=>{setSections(previous=>({...previous,[key]:event.target.value}));edit();}}/></label>)}
    <label><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/>I reviewed the date, patient identity and note content. Save as an unsigned, append-only clinical record.</label>
    <button type="submit">{saving?'Saving…':'Save SOAP note'}</button>
   </fieldset></form>
   <h2>Saved SOAP notes</h2>{!notes.length?<p>No SOAP notes have been recorded for this patient.</p>:notes.map(note=><details key={note.id}><summary>{new Date(note.encounter_at).toLocaleString()} · {note.encounter_type}</summary><dl>{(Object.keys(labels) as (keyof Sections)[]).map(key=><div key={key}><dt>{labels[key]}</dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{note.sections[key]}</dd></div>)}</dl><p>Recorded {new Date(note.created_at).toLocaleString()}. Original content is retained in the patient record; corrections use the existing progress-note addendum workflow.</p></details>)}
  </>}{message&&<p role="status">{message}</p>}
 </section>;
}
