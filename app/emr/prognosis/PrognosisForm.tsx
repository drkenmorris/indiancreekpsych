'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {blankPrognosis,prognosisRatings,validPrognosis,prognosisFromRecord,type Prognosis} from '@/lib/emr/prognosis';
import RichTextEditor from '../treatment-response/RichTextEditor';
import RichTextReadOnly from '../treatment-response/RichTextReadOnly';
type Entry=Record<string,unknown>&{id:string;kind:string;created:string;schema?:string};
async function workspace(patientId:string,body?:Prognosis,revision?:number,signal?:AbortSignal){
 const response=await fetch('/api/emr/workflow',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',signal,body:JSON.stringify({patientId,path:body?'/api/save':'/api/chart?patient='+encodeURIComponent(patientId),method:body?'POST':'GET',...(body?{expectedRevision:revision,body:{patient_id:patientId,action:'prognosis',data:body}}:{})})});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Prognosis could not be loaded or saved.');return data;
}
export default function PrognosisForm({patientId}:{patientId:string}){
 const [draft,setDraft]=useState<Prognosis>(blankPrognosis),[history,setHistory]=useState<Entry[]>([]),[revision,setRevision]=useState(0),[editorKey,setEditorKey]=useState(0);
 const [ready,setReady]=useState(false),[refreshing,setRefreshing]=useState(false),[saving,setSaving]=useState(false),[dirty,setDirty]=useState(false),[sourceError,setSourceError]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const generation=useRef(0),dirtyRef=useRef(false);
 async function read(signal?:AbortSignal){
  const data=await workspace(patientId,undefined,undefined,signal);
  if(data.value?.patient?.id!==patientId||!Array.isArray(data.value.records)||!Number.isSafeInteger(data.revision)||data.revision<0)throw Error('The prognosis history did not match the active patient.');
  const entries=(data.value.records as Entry[]).filter(row=>row.kind==='prognosis');
  if(entries.some(row=>row.schema==='prognosis/2'&&!validPrognosis(prognosisFromRecord(row))))throw Error('A saved prognosis entry could not be verified.');
  return {entries,revision:data.revision};
 }
 function apply(data:{entries:Entry[];revision:number},populate:boolean){
  setHistory(data.entries);setRevision(data.revision);setReady(true);setSourceError(false);
  if(populate){const latest=[...data.entries].reverse().find(row=>row.schema==='prognosis/2');setDraft(latest?prognosisFromRecord(latest):blankPrognosis());setEditorKey(key=>key+1);setDirty(false);dirtyRef.current=false;}
 }
 useEffect(()=>{
  const request=++generation.current,controller=new AbortController();setReady(false);setHistory([]);setDraft(blankPrognosis());setRevision(0);setDirty(false);dirtyRef.current=false;setSaving(false);setRefreshing(false);setError('');setMessage('');setSourceError(false);
  if(patientId)void read(controller.signal).then(data=>{if(!controller.signal.aborted&&generation.current===request)apply(data,true);}).catch(e=>{if(!controller.signal.aborted&&generation.current===request){setSourceError(true);setError(e instanceof Error?e.message:'Prognosis unavailable.');}});
  return()=>controller.abort();
  // A different patient always starts a new chart-bound load and editor.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[patientId]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty)event.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function edit(patch:Partial<Prognosis>){setDraft(previous=>({...previous,...patch}));dirtyRef.current=true;setDirty(true);setError('');setMessage('');}
 async function refresh(){const request=generation.current;setRefreshing(true);setError('');try{const data=await read();if(generation.current!==request)return;apply(data,!dirtyRef.current);setMessage(dirtyRef.current?'Saved entries refreshed. Your unsaved draft is retained.':'Saved prognosis entries refreshed.');}catch(e){if(generation.current===request){setSourceError(true);setError(e instanceof Error?e.message:'History unavailable.');}}finally{if(generation.current===request)setRefreshing(false);}}
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!ready||saving||refreshing||sourceError)return;
  if(!validPrognosis(draft)){setError('Choose 10–100% in 10% steps, a whole session count from 1–100, a valid date and rating if entered, and rationale within 20,000 characters. Enter at least one field before saving.');return;}
  const request=generation.current;setSaving(true);setError('');setMessage('Saving prognosis…');
  try{const saved=await workspace(patientId,draft,revision);if(generation.current!==request)return;if(!saved.value?.id||saved.value.kind!=='prognosis'||saved.value.schema!=='prognosis/2')throw Error('The prognosis save was not confirmed. Check saved entries before retrying.');const loaded=await read();if(generation.current!==request)return;if(!loaded.entries.some(row=>row.id===saved.value.id))throw Error('The save was acknowledged but is not yet visible in this chart. Refresh saved entries before retrying.');apply(loaded,false);setDirty(false);dirtyRef.current=false;setMessage('Prognosis saved in this patient’s chart. Earlier entries are retained.');}
  catch(e){if(generation.current===request){setError(e instanceof Error?e.message:'Save could not be confirmed. Check saved entries before retrying.');setMessage('');}}
  finally{if(generation.current===request)setSaving(false);}
 }
 return <section className="centralCard prognosisPage" data-prognosis-dirty={dirty?'true':'false'}>
  <h2>Prognosis</h2><p>Record the therapist’s discharge threshold and treatment projections.</p>
  <button type="button" disabled={!patientId||saving||refreshing} onClick={()=>void refresh()}>{refreshing?'Refreshing…':'Refresh saved entries'}</button>
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  {!patientId?<p>Select a patient using Find/Add Patient before entering prognosis.</p>:!ready?!error&&<p role="status">Loading prognosis…</p>:<>
   <form onSubmit={save} noValidate aria-label="Prognosis projections"><fieldset disabled={saving||sourceError}><legend>Treatment projections</legend>
    <label>Percent of Objectives/Interventions Required for Discharge<select value={draft.discharge_percent??''} onChange={e=>edit({discharge_percent:e.target.value?Number(e.target.value):null})}><option value="">Select percentage</option>{Array.from({length:10},(_,i)=>(i+1)*10).map(value=><option key={value} value={value}>{value}%</option>)}</select></label>
    <label>Projected Number of Sessions Before Treatment End<input type="number" min="1" max="100" step="1" value={draft.projected_sessions??''} onChange={e=>edit({projected_sessions:e.target.value?Number(e.target.value):null})}/></label>
    <label>Projected Date of Treatment End<input type="date" value={draft.projected_end_date} onChange={e=>edit({projected_end_date:e.target.value})}/></label>
    <label>Prognosis Rating of Successful Achievement Goals<select value={draft.rating} onChange={e=>edit({rating:e.target.value as Prognosis['rating']})}><option value="">Select rating</option>{prognosisRatings.map(value=><option key={value}>{value}</option>)}</select></label>
    <RichTextEditor key={editorKey} label="Rationale for Prognosis Rating" value={draft.rationale} onChange={rationale=>edit({rationale})} disabled={saving||sourceError} emoticons/>
    <button type="submit">{saving?'Saving…':'Save prognosis'}</button>
   </fieldset></form>
   <h2>Saved prognosis entries</h2>{!history.length?<p>No saved prognosis entries.</p>:[...history].reverse().map(row=><details key={row.id}><summary>{new Date(row.created).toLocaleString()} · {row.schema==='prognosis/2'?(String(row.rating||'Rating not entered')):'Earlier prognosis format'}</summary>{row.schema==='prognosis/2'?<><dl><dt>Percent of Objectives/Interventions Required for Discharge</dt><dd>{row.discharge_percent==null?'Not entered':String(row.discharge_percent)+'%'}</dd><dt>Projected Number of Sessions Before Treatment End</dt><dd>{String(row.projected_sessions??'Not entered')}</dd><dt>Projected Date of Treatment End</dt><dd>{String(row.projected_end_date||'Not entered')}</dd><dt>Prognosis Rating of Successful Achievement Goals</dt><dd>{String(row.rating||'Not entered')}</dd></dl><h3>Rationale for Prognosis Rating</h3><RichTextReadOnly value={prognosisFromRecord(row).rationale}/></>:<dl>{['statement','supporting_factors','barriers','review_date'].map(key=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{String(row[key]||'Not entered')}</dd></div>)}</dl>}</details>)}
  </>}
 </section>;
}
