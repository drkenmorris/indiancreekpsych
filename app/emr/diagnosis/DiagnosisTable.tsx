'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {Diagnosis} from '@/lib/emr/diagnoses';
import type {CatalogChoice} from '@/lib/emr/diagnosis-reference';
import DiagnosticReferencePanel from './DiagnosticReferencePanel';

type Catalog={version:string;effectiveFrom:string;effectiveThrough:string;source:string;rows:{code:string;label:string;category:string;group:string;groupLabel:string}[]};
type Row=Diagnosis&{key:string;category:string;group:string};
type History={revision:number;diagnoses:Diagnosis[];recorded_at:string};
export default function DiagnosisTable({patientId}:{patientId:string}) {
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [rows,setRows]=useState<Row[]>([]);
 const [relatedSelections,setRelatedSelections]=useState<Record<string,CatalogChoice|null>>({});
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
  if(Object.hasOwn(patch,'code'))setRelatedSelections(current=>({...current,[key]:null}));
  setRows(current=>current.map(row=>row.key===key?{...row,...patch}:patch.priority==='primary'?{...row,priority:'secondary'}:row));
  setDirty(true);
 };
 function addDiagnosis(afterKey?:string,choice?:CatalogChoice){
  if(!catalog||rows.length>=30)return;
  if(choice&&rows.some(row=>row.code===choice.code)){setStatus('That code is already on the diagnosis list.');return;}
  const next:Row={key:crypto.randomUUID(),code:choice?.code??'',label:choice?.label??'',version:catalog.version,
   category:choice?.category??'',group:choice?.group??'',priority:rows.some(row=>row.priority==='primary')||choice?'secondary':'primary',status:'provisional',notes:''};
  setRows(current=>{const index=current.findIndex(row=>row.key===afterKey);return index<0?[...current,next]:[...current.slice(0,index+1),next,...current.slice(index+1)];});
  setDirty(true);
  if(choice)setStatus('Related code added as an unsaved provisional secondary diagnosis. Review before saving.');
 }
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
   <p className="treatmentHint">{catalog.version} · Effective {catalog.effectiveFrom} through {catalog.effectiveThrough}. ICD code descriptions organized into diagnostic families; source-linked clinical overviews and advisory coding notes appear after a selection. Overviews summarize selected disorders; they are not the full DSM-5-TR criteria.</p>
   <p><a href="/emr/diagnosis?coverage=1" target="_blank" rel="noopener noreferrer">View missing DSM-referenced codes and coverage audit</a></p>
   <form aria-labelledby="diagnosis-title" onSubmit={save}>
    <fieldset disabled={busy||!loaded}>
     <legend>Patient diagnoses</legend>
     {rows.map((row,index)=>{
        const groups=[...new Map(catalog.rows.filter(c=>c.category===row.category).map(c=>[c.group,c.groupLabel])).entries()];
        const codes=catalog.rows.filter(c=>c.category===row.category&&c.group===row.group);
        const name='Diagnosis '+(index+1);
        return <section className="diagnosisCard" key={row.key} aria-label={name}>
         <h2>{name}{row.label?' — '+row.label:''}</h2>
         <div className="diagnosisTableScroll" role="region" aria-label={name+' selection table'} tabIndex={0}>
          <table className="diagnosisTable"><caption>{name} selection</caption>
           <thead><tr>{['Diagnostic family','Disorder group','Specific diagnosis','ICD-10-CM','Priority','Status'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead>
           <tbody><tr>
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
           </tr></tbody>
          </table>
         </div>
         {row.code&&<DiagnosticReferencePanel code={row.code} name={name} selectedCodes={rows.map(r=>r.code)} selectedRelatedCode={relatedSelections[row.key]?.code??''} onSelectRelated={choice=>setRelatedSelections(current=>({...current,[row.key]:choice}))}/>}
         <div className="diagnosisNotesLine">
          <label htmlFor={'diagnosis-notes-'+row.key}>{name} clinical notes</label>
          <textarea id={'diagnosis-notes-'+row.key} aria-label={name+' clinical notes'} maxLength={1000} rows={4} value={row.notes} onChange={e=>edit(row.key,{notes:e.target.value})}/>
         </div>
         <div className="diagnosisActionsLine" role="group" aria-label={name+' actions'}>
          <strong>Actions</strong>
          <button type="button" aria-label={'Remove diagnosis '+(index+1)} onClick={()=>{setRows(current=>current.filter(r=>r.key!==row.key));setDirty(true);}}>Remove diagnosis</button>
          <button type="button" disabled={rows.length>=30} onClick={()=>addDiagnosis(row.key)}>Add diagnosis below</button>
          {relatedSelections[row.key]&&<button type="button" disabled={rows.length>=30||rows.some(r=>r.code===relatedSelections[row.key]?.code)} onClick={()=>{
           const choice=relatedSelections[row.key];
           if(choice)addDiagnosis(row.key,choice);
           setRelatedSelections(current=>({...current,[row.key]:null}));
          }}>Add {relatedSelections[row.key]?.code} as secondary diagnosis</button>}
         </div>
        </section>;
       })}
     {!rows.length&&<p>No diagnoses entered.</p>}
     <div className="treatmentActions diagnosisActionsLine" role="group" aria-label="Diagnosis list actions">
      <button type="button" disabled={rows.length>=30} onClick={()=>addDiagnosis()}>Add diagnosis</button>
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
