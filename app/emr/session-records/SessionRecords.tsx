'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {isAfterWindow,noteState,sectionKeys,sectionLabels,validSections,type SessionNote,type NoteRevision,type Sections} from '@/lib/emr/session-records';
import TrackedText from './TrackedText';
import './session-records.css';
type Addendum={id:string;note_id:string;reason:string;amendment:string;created_at:string};
type Attestation={id:string;note_id:string;signer_name:string;signed_at:string};
type RecordSet={patientId:string;patientName:string;notes:SessionNote[];revisions:NoteRevision[];addenda:Addendum[];attestations:Attestation[];total:number;page:number;serverNow:string};
const endpoint='/api/emr/session-records';
const when=(s:string)=>new Date(s).toLocaleString('en-US');
function validate(data:RecordSet,pid:string,page:number){
 if(data.patientId!==pid||typeof data.patientName!=='string'||data.page!==page||!Number.isSafeInteger(data.total)||data.total<0||!Number.isFinite(Date.parse(data.serverNow))||![data.notes,data.revisions,data.addenda,data.attestations].every(Array.isArray))throw Error('Session records did not match the active patient.');
 const ids=new Set(data.notes.map(n=>n.id));
 if(data.notes.some(n=>n.patient_id!==pid||!Object.hasOwn(sectionKeys,n.template)||!validSections(n.sections,n.template)||!Number.isFinite(Date.parse(n.created_at))))throw Error('Invalid patient session record.');
 if([...data.revisions,...data.addenda,...data.attestations].some(r=>!ids.has(r.note_id)))throw Error('Amendment did not match this patient’s session records.');
 for(const note of data.notes){const history=noteState(note,data.revisions).history;let prior:string|null=null;let before=note.sections;for(const [index,revision] of history.entries()){if(revision.revision!==index+1||revision.prior_id!==prior||typeof revision.after_window!=='boolean'||!validSections(revision.sections,note.template)||!validSections(revision.before_sections,note.template)||JSON.stringify(Object.entries(revision.before_sections).sort())!==JSON.stringify(Object.entries(before).sort()))throw Error('Session revision history is incomplete or invalid.');prior=revision.id;before=revision.sections;}}
 return data;
}
export default function SessionRecords(props:{patientId:string;inWorkspace?:boolean}){return <PatientSessionRecords key={props.patientId} {...props}/>;}
function PatientSessionRecords({patientId,inWorkspace=false}:{patientId:string;inWorkspace?:boolean}){
 const [records,setRecords]=useState<RecordSet|null>(null),[page,setPage]=useState(0),[open,setOpen]=useState(''),[historyOpen,setHistoryOpen]=useState(''),[historyLimit,setHistoryLimit]=useState(20),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[,setTick]=useState(0);
 const active=useRef(true),clock=useRef({server:0,local:0});
 async function read(signal?:AbortSignal){const response=await fetch(endpoint+'?patient='+encodeURIComponent(patientId)+'&page='+page,{cache:'no-store',signal});const data=await response.json();if(!response.ok)throw Error(data.error||'Session records unavailable.');return validate(data,patientId,page);}
 function apply(data:RecordSet){setRecords(data);clock.current={server:Date.parse(data.serverNow),local:Date.now()};}
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setRecords(null);setOpen('');setDirty(false);setError('');setMessage('');void read(controller.signal).then(data=>{if(!controller.signal.aborted)apply(data);}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Records unavailable.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();/* page/identity own each request */ // eslint-disable-next-line react-hooks/exhaustive-deps
 },[patientId,page]);
 useEffect(()=>{const timer=setInterval(()=>setTick(n=>n+1),30000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty)e.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function leave(action:()=>void){if(busy)return;if(dirty&&!window.confirm('Discard unsaved session-note edits?'))return;setDirty(false);setHistoryOpen('');setHistoryLimit(20);setMessage('');action();}
 async function refresh(){if(busy)return;if(dirty&&!window.confirm('Discard unsaved session-note edits and reload saved records?'))return;setBusy(true);setError('');try{const data=await read();if(active.current){apply(data);setDirty(false);setOpen('');setMessage('Saved session records reloaded.');}}catch(e){if(active.current)setError(e instanceof Error?e.message:'Records unavailable.');}finally{if(active.current)setBusy(false);}}
 async function save(note:SessionNote,sections:Sections,reason:string,expected:string|null){
  setBusy(true);setError('');setMessage('');
  try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient_id:patientId,note_id:note.id,template:note.template,expected_prior_id:expected,sections,reason,reviewed:true})});const result=await response.json();if(!response.ok||result.saved!==true||result.kind!=='revision'||result.unsigned!==true)throw Error(result.error||'Revision save was not confirmed.');const loaded=await read();if(!loaded.revisions.some(r=>r.id===result.id&&r.note_id===note.id))throw Error('Save acknowledged but the revision was not visible. Reload saved records before retrying.');if(active.current){apply(loaded);setDirty(false);setMessage('Session revision saved and reloaded. The original note is retained.');}}
  catch(e){if(active.current)setError(e instanceof Error?e.message:'Revision could not be confirmed.');}
  finally{if(active.current)setBusy(false);}
 }
 async function attest(noteId:string,typedName:string){
  if(dirty||busy)return;setBusy(true);setError('');setMessage('');
  try{const response=await fetch('/api/emr/progress-notes/attest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient_id:patientId,note_id:noteId,typed_name:typedName,attested:true})});const result=await response.json();if(!response.ok||result.signed!==true||result.scope!=='original-note-only')throw Error(result.error||'Original note attestation was not confirmed.');const loaded=await read();if(!loaded.attestations.some(a=>a.id===result.id&&a.note_id===noteId))throw Error('Attestation acknowledged but not verified. Reload saved records before retrying.');if(active.current){apply(loaded);setMessage('Original note attestation recorded. Revisions remain separate and unsigned.');}}
  catch(e){if(active.current)setError(e instanceof Error?e.message:'Attestation unavailable.');}finally{if(active.current)setBusy(false);}
 }
 const serverNow=clock.current.server+(Date.now()-clock.current.local);
 return <article className="centralCard sessionRecords" data-clinical-note-dirty={inWorkspace&&dirty?'true':'false'}>
  <h2>Session Records/Amendments</h2><p>Open a SOAP or DAP session record to review its full note, make corrections, or add information.</p>
  <button type="button" disabled={loading||busy} onClick={()=>void refresh()}>Reload saved records</button>
  {loading&&<p role="status">Loading this patient’s session records…</p>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  {records&&<><p>{records.total} SOAP/DAP session records</p>{records.notes.length===0?<p>No SOAP or DAP session records on this page.</p>:<div aria-label="Patient session records">{records.notes.map(note=>{
   const state=noteState(note,records.revisions),isOpen=open===note.id;
   return <section className="sessionRecord" key={note.id}><h3><button type="button" className="sessionRecordSummary" aria-expanded={isOpen} aria-controls={'session-record-'+note.id} disabled={busy} onClick={()=>leave(()=>setOpen(isOpen?'':note.id))}>{records.patientName} · {note.encounter_type} ({note.template}) · {when(note.encounter_at)}</button></h3>
   {isOpen&&<div id={'session-record-'+note.id}><p>Original note recorded: {when(note.created_at)} · Standard editing window ends: {when(new Date(Date.parse(note.created_at)+72*3600000).toISOString())}</p>
   <p>After 72 hours, deleted wording is retained in <del className="sessionDeleted">red strikethrough</del> and additions appear in <ins className="sessionAdded">red</ins>. Earlier corrections remain in version history.</p>
   <SessionRecordEditor key={note.id+':'+(state.latest?.id??'original')} note={note} state={state} afterWindow={isAfterWindow(note.created_at,serverNow)} busy={busy} onDirty={setDirty} onSave={save}/>
   {records.attestations.filter(a=>a.note_id===note.id).map(a=><p key={a.id}>Original note attested by {a.signer_name} · {when(a.signed_at)}. The attestation applies to the original note; later revisions remain separate and unsigned.</p>)}
   {!records.attestations.some(a=>a.note_id===note.id)&&<OriginalAttestation key={note.id} disabled={busy||dirty} onSave={name=>attest(note.id,name)}/>}
   <details open={historyOpen===note.id} onToggle={event=>{const expanded=event.currentTarget.open;setHistoryOpen(current=>expanded?note.id:current===note.id?'':current);}}><summary>Original note and revision history</summary>{historyOpen===note.id&&<><h4>Original note · {when(note.created_at)}</h4><SectionsView sections={note.sections}/>{state.history.slice(-historyLimit).map(r=><section key={r.id}><h4>Revision {r.revision} · {when(r.created_at)}</h4><p>Reason: {r.reason} · {r.after_window?'After 72 hours':'Within 72 hours'} · Unsigned revision</p>{sectionKeys[note.template].map(k=><section key={k}><h5>{sectionLabels[k]}</h5><TrackedText before={r.before_sections[k]} after={r.sections[k]} marked={r.after_window}/></section>)}</section>)}{state.history.length>historyLimit&&<button type="button" onClick={()=>setHistoryLimit(limit=>limit+20)}>Show 20 earlier revisions</button>}</>}</details>
   {records.addenda.some(a=>a.note_id===note.id)&&<details><summary>Earlier corrections and addenda</summary>{records.addenda.filter(a=>a.note_id===note.id).map(a=><section key={a.id}><h4>Unsigned addendum · {when(a.created_at)}</h4><p>Reason: {a.reason}</p><p className="sessionRecordText">{a.amendment}</p></section>)}</details>}
   </div>}</section>;
  })}</div>}
  <nav aria-label="Session record pages"><button type="button" disabled={page===0||busy} onClick={()=>leave(()=>setPage(p=>p-1))}>Previous records</button><span>Page {page+1}</span><button type="button" disabled={(page+1)*50>=records.total||busy} onClick={()=>leave(()=>setPage(p=>p+1))}>Next records</button></nav></>}
 </article>;
}
function SectionsView({sections}:{sections:Sections}){return <>{Object.entries(sections).sort(([a],[b])=>['subjective','objective','data','assessment','plan'].indexOf(a)-['subjective','objective','data','assessment','plan'].indexOf(b)).map(([key,text])=><section key={key}><h4>{sectionLabels[key]}</h4><p className="sessionRecordText">{text||'Not recorded'}</p></section>)}</>;}
function SessionRecordEditor({note,state,afterWindow,busy,onDirty,onSave}:{note:SessionNote;state:ReturnType<typeof noteState>;afterWindow:boolean;busy:boolean;onDirty:(dirty:boolean)=>void;onSave:(note:SessionNote,sections:Sections,reason:string,expected:string|null)=>Promise<void>}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState({...state.current}),[reason,setReason]=useState(''),[reviewed,setReviewed]=useState(false);
 const dirty=JSON.stringify(draft)!==JSON.stringify(state.current)||!!reason;
 const valid=validSections(draft,note.template)&&reason.trim().length>=5&&reason.trim().length<=200&&JSON.stringify(draft)!==JSON.stringify(state.current);
 function change(key:string,value:string){setDraft(previous=>({...previous,[key]:value}));setReviewed(false);onDirty(true);}
 function cancel(){if(dirty&&!window.confirm('Discard unsaved session-note edits?'))return;setDraft({...state.current});setReason('');setReviewed(false);setEditing(false);onDirty(false);}
 function submit(e:FormEvent){e.preventDefault();if(valid&&reviewed&&!busy)void onSave(note,draft,reason,state.latest?.id??null);}
 return <><h4>Current clinical note{state.latest?' · Revision '+state.latest.revision:''}</h4>{sectionKeys[note.template].map(key=><section key={key}><h4>{sectionLabels[key]}</h4><TrackedText before={state.baseline[key]} after={state.current[key]} marked={state.marked}/></section>)}
 {!editing?<button type="button" disabled={busy} onClick={()=>setEditing(true)}>Edit clinical note</button>:<form aria-label="Edit session clinical note" onSubmit={submit}><fieldset disabled={busy}><legend>Corrections and additions</legend><p>{afterWindow?'This save will show deletions in red strikethrough and additions in red.':'The 72-hour window is still open. Changes saved within it display normally; the original remains in history.'} The server checks the original recorded time again when saving.</p>
 {sectionKeys[note.template].map(key=><label key={key}>{sectionLabels[key]} — revised text<textarea rows={6} maxLength={4000} value={draft[key]} onChange={e=>change(key,e.target.value)}/></label>)}
 <label>Reason for correction or addition<input required minLength={5} maxLength={200} value={reason} onChange={e=>{setReason(e.target.value);setReviewed(false);onDirty(true);}}/></label>
 <details><summary>Preview revised note</summary>{sectionKeys[note.template].map(key=><section key={key}><h4>{sectionLabels[key]}</h4><TrackedText before={afterWindow?state.baseline[key]:state.current[key]} after={draft[key]} marked={afterWindow}/></section>)}</details>
 <label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I reviewed these corrections and additions for the active patient. Save a separate unsigned revision.</label>
 <button type="submit" disabled={!valid||!reviewed}>Save session revision</button><button type="button" onClick={cancel}>Cancel editing</button>
 </fieldset></form>}</>;
}

function OriginalAttestation({disabled,onSave}:{disabled:boolean;onSave:(name:string)=>Promise<void>}){
 const [open,setOpen]=useState(false),[name,setName]=useState(''),[reviewed,setReviewed]=useState(false);
 return <><button type="button" disabled={disabled} onClick={()=>{setOpen(v=>!v);setName('');setReviewed(false);}}>{open?'Cancel author attestation':'Attest original progress note'}</button>{open&&<form onSubmit={e=>{e.preventDefault();if(reviewed&&name.trim().length>=3&&!disabled)void onSave(name);}}><fieldset disabled={disabled}><legend>Author attestation — original note only</legend><p>This is irreversible and applies only to the original recorded note. Review the original in version history first. Revisions and addenda remain unsigned.</p><label>Type your full profile name<input required minLength={3} maxLength={160} value={name} onChange={e=>{setName(e.target.value);setReviewed(false);}}/></label><label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I personally authored or reviewed this encounter documentation, verified the patient identity, and attest that the original note is accurate to the best of my knowledge.</label><button type="submit" disabled={!reviewed||name.trim().length<3}>Record permanent author attestation</button></fieldset></form>}</>;
}
