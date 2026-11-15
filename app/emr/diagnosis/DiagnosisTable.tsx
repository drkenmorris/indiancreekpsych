'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {Diagnosis} from '@/lib/emr/diagnoses';

type Catalog={version:string;effectiveFrom:string;effectiveThrough:string;source:string;rows:{code:string;label:string;category:string;group:string;groupLabel:string}[]};
type Row=Diagnosis&{key:string;category:string;group:string};
type History={revision:number;diagnoses:Diagnosis[];recorded_at:string};
export default function DiagnosisTable({patientId}:{patientId:string}) {
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [rows,setRows]=useState<Row[]>([]);
 const [history,setHistory]=useState<History[]>([]);
 const [revision,setRevision]=useState(0);
 const [loaded,setLoaded]=useState(false);
 const [busy,setBusy]=useState(true);
 const [dirty,setDirty]=useState(false);
 const [status,setStatus]=useState('Loading diagnoses…');
 const alive=useRef(true);
 const endpoint='/api/emr/diagnoses';
 useEffect(()=>{
  alive.current=true;
  const controller=new AbortController();
  async function load(){
   try{
    const response=await fetch(endpoint+'?patient='+encodeURIComponent(patientId),{signal:controller.signal,cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw Error(data.error);
    if(controller.signal.aborted)return;
    if(data.patientId!==patientId)throw Error('The patient chart changed. Reload Diagnosis.');
    const library:Catalog=data.catalog;
    setCatalog(library);setRevision(data.revision);setHistory(data.history);
    setRows(data.diagnoses.map((d:Diagnosis)=>{
     const option=library.rows.find(c=>c.code===d.code);
     return {...d,key:crypto.randomUUID(),category:option?.category??'',group:option?.group??''};
    }));
    setLoaded(true);setStatus('');
   }catch(error){if(!controller.signal.aborted)setStatus(error instanceof Error?error.message:'Diagnoses could not be loaded.');}
   finally{if(!controller.signal.aborted)setBusy(false);}
  }
  void load();
  return ()=>{alive.current=false;controller.abort();};
 },[patientId]);
 useEffect(()=>{
  const warn=(event:BeforeUnloadEvent)=>{if(dirty)event.preventDefault();};
  window.addEventListener('beforeunload',warn);
  return ()=>window.removeEventListener('beforeunload',warn);
 },[dirty]);
 const edit=(key:string,patch:Partial<Row>)=>{
  setRows(current=>current.map(row=>row.key===key?{...row,...patch}:patch.priority==='primary'?{...row,priority:'secondary'}:row));
  setDirty(true);
 };
 async function save(event:FormEvent){
  event.preventDefault();
  if(busy||!loaded||!catalog)return;
  if(rows.some(row=>!row.code)){setStatus('Choose a specific diagnosis and code for every row, or remove the incomplete row.');return;}
  if(new Set(rows.map(row=>row.code)).size!==rows.length){setStatus('Each ICD-10-CM code can appear only once.');return;}
  const diagnoses=rows.map(({code,label,version,priority,status,notes})=>({code,label,version,priority,status,notes}));
  setBusy(true);setStatus('Saving diagnoses…');
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patientId,revision,diagnoses})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error);
   if(!alive.current)return;
   setRevision(data.revision);setDirty(false);setStatus(data.history?'Diagnoses saved.':'Diagnoses saved. Reload to view updated history.');
   if(data.history)setHistory(data.history);
  }catch(error){if(alive.current)setStatus(error instanceof Error?error.message:'Diagnoses could not be saved.');}
  finally{if(alive.current)setBusy(false);}
 }
 return <section data-diagnosis-dirty={dirty?'true':'false'}>
  <h1 id="diagnosis-title">Diagnosis</h1>
  <p>Select a diagnostic family, disorder group, then the specific diagnosis. The ICD-10-CM code fills automatically.</p>
  <p role="status" aria-live="polite">{status}</p>
  {!loaded&&!busy&&<button type="button" onClick={()=>window.location.reload()}>Retry loading Diagnosis</button>}
  {catalog&&<>
   <p className="treatmentHint">{catalog.version} · Effective {catalog.effectiveFrom} through {catalog.effectiveThrough}. ICD code descriptions organized into diagnostic families; this library does not reproduce the full DSM-5-TR or its criteria.</p>
   <form aria-labelledby="diagnosis-title" onSubmit={save}>
    <fieldset disabled={busy||!loaded}>
     <legend>Patient diagnoses</legend>
     <div className="diagnosisTableScroll" role="region" aria-label="Patient diagnosis table" tabIndex={0}>
      <table className="diagnosisTable">
       <caption>Current diagnosis list</caption>
       <thead><tr>{['Diagnostic family','Disorder group','Specific diagnosis','ICD-10-CM','Priority','Status','Clinical notes','Actions'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead>
       <tbody>{rows.map((row,index)=>{
        const groups=[...new Map(catalog.rows.filter(c=>c.category===row.category).map(c=>[c.group,c.groupLabel])).entries()];
        const codes=catalog.rows.filter(c=>c.category===row.category&&c.group===row.group);
        const name='Diagnosis '+(index+1);
        return <tr key={row.key}>
         <td><select aria-label={name+' family'} required value={row.category} onChange={e=>edit(row.key,{category:e.target.value,group:'',code:'',label:''})}>
          <option value="">Choose family</option>{[...new Set(catalog.rows.map(c=>c.category))].sort().map(c=><option key={c}>{c}</option>)}
         </select></td>
         <td><select aria-label={name+' disorder group'} required disabled={!row.category} value={row.group} onChange={e=>edit(row.key,{group:e.target.value,code:'',label:''})}>
          <option value="">Choose disorder group</option>{groups.map(([code,label])=><option key={code} value={code}>{label} ({code})</option>)}
         </select></td>
         <td><select aria-label={name+' specific diagnosis'} required disabled={!row.group} value={row.code} onChange={e=>{
          const choice=codes.find(c=>c.code===e.target.value);
          edit(row.key,{code:choice?.code??'',label:choice?.label??'',version:catalog.version});
         }}><option value="">Choose diagnosis</option>{codes.map(c=><option key={c.code} value={c.code}>{c.label} — {c.code}</option>)}</select></td>
         <td><output aria-label={name+' ICD-10-CM code'}>{row.code||'—'}</output></td>
         <td><select aria-label={name+' priority'} value={row.priority} onChange={e=>edit(row.key,{priority:e.target.value as Diagnosis['priority']})}><option value="primary">Primary</option><option value="secondary">Secondary</option></select></td>
         <td><select aria-label={name+' status'} value={row.status} onChange={e=>edit(row.key,{status:e.target.value as Diagnosis['status']})}><option value="provisional">Provisional</option><option value="confirmed">Confirmed</option><option value="rule_out">Rule out</option></select></td>
         <td><textarea aria-label={name+' clinical notes'} maxLength={1000} rows={2} value={row.notes} onChange={e=>edit(row.key,{notes:e.target.value})}/></td>
         <td><button type="button" aria-label={'Remove '+name.toLowerCase()} onClick={()=>{setRows(current=>current.filter(r=>r.key!==row.key));setDirty(true);}}>Remove</button></td>
        </tr>;
       })}</tbody>
      </table>
     </div>
     {!rows.length&&<p>No diagnoses entered.</p>}
     <div className="treatmentActions">
      <button type="button" disabled={rows.length>=30} onClick={()=>{
       setRows(current=>[...current,{key:crypto.randomUUID(),code:'',label:'',version:catalog.version,category:'',group:'',priority:current.some(r=>r.priority==='primary')?'secondary':'primary',status:'provisional',notes:''}]);
       setDirty(true);
      }}>Add diagnosis</button>
      <button type="submit" disabled={!dirty}>{busy?'Saving…':'Save diagnoses'}</button>
      <button type="button" onClick={()=>{if(!dirty||window.confirm('Reload Diagnosis and discard unsaved changes?'))window.location.reload();}}>Reload saved diagnoses</button>
     </div>
    </fieldset>
   </form>
   <details><summary>Saved diagnosis history</summary>
    <p>Earlier saved versions remain available. Questionnaire results do not assign diagnoses to this table.</p>
    {history.length?history.map(version=><article key={version.revision}>
     <h2>Revision {version.revision}</h2>
     <p>{new Date(version.recorded_at).toLocaleString()}</p>
     <ul>{version.diagnoses.map(d=><li key={d.code}>{d.label} — {d.code} · {d.priority} · {d.status.replace('_',' ')}{d.notes&&<p>{d.notes}</p>}</li>)}</ul>
     {!version.diagnoses.length&&<p>Diagnosis list cleared.</p>}
    </article>):<p>No diagnosis versions saved.</p>}
   </details>
  </>}
 </section>;
}
