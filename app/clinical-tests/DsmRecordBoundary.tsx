'use client';
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {clinicalSessionStore as store} from '@/lib/clinical-tests/clinicalSessionStore';
import {createClient} from '@/lib/supabase/client';
import {DsmSaveQueue} from '@/lib/emr/dsm-save-queue';
import '@/app/emr/central-emr.css';
type Context={id:string;patient_id:string;label:string;revision:number;patient_name?:string;patient_dob?:string};
type Snapshot={state:Record<string,string>;report:Record<string,unknown>;revision:number};
type Patient={id:string;demographics:Record<string,string>;profiles:{full_name?:string}|null};
const patientName=(p:Patient)=>[p.demographics.first_name,p.demographics.last_name].filter(Boolean).join(' ')||p.profiles?.full_name||'Patient account';
export default function DsmRecordBoundary({children}:{children:ReactNode}){
 const path=usePathname()??'',search=useSearchParams(),router=useRouter(),id=search.get('record'),historical=search.get('revision'),isDsm=path.startsWith('/clinical-tests/dev/');
 const [context,setContext]=useState<Context|null>(null),[loading,setLoading]=useState(!!id),[message,setMessage]=useState(''),[locked,setLocked]=useState(false);
 const [history,setHistory]=useState<{revision:number;created_at:string}[]>([]),[snapshot,setSnapshot]=useState<Snapshot|null>(null),[compatible,setCompatible]=useState(true),[saving,setSaving]=useState(false);
 const [linking,setLinking]=useState(false),[patients,setPatients]=useState<Patient[]>([]),[patientId,setPatientId]=useState(''),[label,setLabel]=useState('DSM assessment'),[verified,setVerified]=useState(false),[reload,setReload]=useState(0);
 const generation=useRef(0),loadKey=useRef(''),queue=useRef<DsmSaveQueue|null>(null),discard=useRef(false),alive=useRef(true);
 const save=useCallback(async()=>{
  const q=queue.current;if(!q||historical||locked)return;
  const captured=store.exportDsm();setSaving(true);
  try{const revision=await q.save(captured);if(!alive.current||queue.current!==q)return;setContext(c=>c&&c.id===q.id?{...c,revision}:c);setHistory(h=>h.some(x=>x.revision===revision)?h:[{revision,created_at:new Date().toISOString()},...h]);setMessage('Saved to the central patient record — revision '+revision+'.');}
  catch(e){if(alive.current&&queue.current===q){setMessage(e instanceof Error?e.message:'Save was not confirmed.');if(q.errorStatus===403)setLocked(true);}}
  finally{if(alive.current&&queue.current===q)setSaving(q.pending>0);}
 },[historical,locked]);
 useEffect(()=>{
  if(!isDsm)return;
  if(!id&&context){const q=new URLSearchParams(search.toString());q.set('record',context.id);router.replace(path+'?'+q);return;}
  if(!id){setLoading(false);return;}
  const key=id+':'+(historical??'latest');if(loadKey.current===key)return;
  loadKey.current=key;const g=++generation.current;setLoading(true);setMessage('Loading the protected assessment record…');
  const previous=queue.current,shouldFlush=previous&&!discard.current&&JSON.stringify(store.exportDsm())!==previous.lastSaved;
  discard.current=false;
  (async()=>{
   // Finish pending old-record answers before replacing the form store.
   if(shouldFlush)await previous.save(store.exportDsm());
   const response=await fetch('/api/emr/dsm-records?id='+encodeURIComponent(id)+(historical?'&revision='+encodeURIComponent(historical):''),{cache:'no-store'});
   const data=await response.json();if(!response.ok)throw Error(data.error);if(g!==generation.current||!alive.current)return;
   setContext(data.record);setHistory(data.history??[]);setSnapshot(data.snapshot);setCompatible(data.compatible!==false);
   if(!historical&&data.compatible!==false){store.importDsm(data.snapshot?.state??{});queue.current=new DsmSaveQueue(data.record.id,data.record.revision,store.exportDsm());}else queue.current=null;
   loadKey.current=key;setLoading(false);setLocked(false);setMessage('Connected to the central patient record. Changes are saved as new revisions.');
  })().catch(e=>{if(g===generation.current&&alive.current){setMessage(e.message);setLocked(true);setLoading(false);}});
 },[id,historical,isDsm,path,search,context,router,reload]);
 useEffect(()=>{
  if(!context||loading||historical||locked||!isDsm)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const q=queue.current;
  const unsubscribe=store.subscribe(()=>{setMessage('Unsaved changes — preparing a central record save…');clearTimeout(timer);timer=setTimeout(()=>void save(),1500);});
  return()=>{clearTimeout(timer);unsubscribe();if(q&&q===queue.current&&JSON.stringify(store.exportDsm())!==q.lastSaved)void q.save(store.exportDsm()).catch(()=>undefined);};
 },[context?.id,loading,historical,locked,isDsm,save]);
 useEffect(()=>{
  alive.current=true;
  const warn=(event:BeforeUnloadEvent)=>{if(queue.current&&JSON.stringify(store.exportDsm())!==queue.current.lastSaved){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',warn);
  return()=>{alive.current=false;generation.current++;window.removeEventListener('beforeunload',warn);};
 },[]);
 useEffect(()=>{const client=createClient();const {data}=client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){generation.current++;if(queue.current)queue.current.disabled=true;queue.current=null;store.importDsm({});setContext(null);setLocked(true);}});return()=>data.subscription.unsubscribe();},[]);
 async function linkRun(){
  if(!verified||!patientId)return;setSaving(true);
  try{
   const response=await fetch('/api/emr/dsm-records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',patientId,label})}),data=await response.json();if(!response.ok)throw Error(data.error);
   const patient=patients.find(p=>p.id===patientId),c={...data.record,patient_name:patient?patientName(patient):'Selected central patient',patient_dob:patient?.demographics.dob??''};
   const q=new DsmSaveQueue(c.id,c.revision,{});q.lastSaved='';queue.current=q;setContext(c);loadKey.current=c.id+':latest';
   const params=new URLSearchParams(search.toString());params.set('record',c.id);router.replace(path+'?'+params);setLinking(false);setMessage('Patient association created. Saving current answers…');await save();
  }catch(e){setMessage(e instanceof Error?e.message:'Record linking was not confirmed.');}finally{setSaving(false);}
 }
 if(!isDsm)return <>{children}</>;
 const blocked=loading||!!id&&context?.id!==id;
 return <>
  <section className="recordToolbar" aria-label="Central assessment record">
   <strong>{context?'Connected assessment: '+context.label:'Unlinked assessment preview'}</strong><p role="status">{message||'Choose a central patient record to save and resume an assessment.'}</p>
   {context?<>
    <p><strong>{context.patient_name||'Selected central patient'}</strong>{context.patient_dob?' · Birth date: '+context.patient_dob:''}<br/>Patient ID: {context.patient_id} · Saved revision {context.revision}</p>
    <button type="button" disabled={saving||blocked||!!historical||!compatible||locked} onClick={()=>void save()}>{saving?'Saving…':'Save current answers'}</button><Link href={'/emr?patient='+context.patient_id}>Open central patient record</Link>
    <details><summary>Saved revision history</summary><p>Each saved revision is retained; earlier responses are never overwritten.</p><ul>{history.map(h=><li key={h.revision}><Link href={path+'?record='+context.id+'&revision='+h.revision}>Revision {h.revision}</Link> — {new Date(h.created_at).toLocaleString()}</li>)}</ul><Link href={path+'?record='+context.id}>Open latest editable revision</Link><button type="button" disabled={saving} onClick={()=>{if(window.confirm('Reload the latest saved version and discard unsaved local changes?')){discard.current=true;loadKey.current='';if(queue.current)queue.current.disabled=true;queue.current=null;setLocked(false);setReload(n=>n+1);}}}>Reload latest saved answers</button></details>
   </>:<><Link href="/emr">Find/add patient and start a saved assessment</Link><button type="button" onClick={async()=>{setLinking(true);try{const r=await fetch('/api/emr/patients',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error);setPatients(d.patients);}catch(e){setMessage(e instanceof Error?e.message:'Patient directory unavailable.');}}}>Link this run to a central patient</button></>}
   {linking&&<form onSubmit={e=>{e.preventDefault();void linkRun();}}><label>Central patient<select required value={patientId} onChange={e=>{setPatientId(e.target.value);setVerified(false);}}><option value="">Choose the patient</option>{patients.map(p=><option key={p.id} value={p.id}>{patientName(p)} · {p.id.slice(0,8)}</option>)}</select></label><label>Assessment label<input maxLength={140} required value={label} onChange={e=>setLabel(e.target.value)}/></label><label><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)} required/>I verified that this assessment belongs to the selected patient. This association cannot be silently reassigned.</label><button disabled={saving||!verified}>Create linked record and save this run</button></form>}
  </section>
  {locked?<p role="alert">This assessment could not be opened safely. {message} Return to the central patient record or sign in with the authorized clinic account if requested.</p>:blocked?<p>Loading assessment…</p>:historical||!compatible?<><p>This is a retained, read-only assessment revision. Its answers are not re-scored under a different version.</p><FrozenReport report={snapshot?.report}/></>:<div key={loadKey.current}>{children}</div>}
 </>;
}
function FrozenReport({report}:{report?:Record<string,unknown>}){
 const clarification=report?.clarification as {candidates?:{id:string;label:string;status:string;evidence?:{tier:number;question:string;answer:string}[]}[]}|undefined;
 return <section><h2>Retained assessment report</h2>{clarification?.candidates?.map(c=><details key={c.id}><summary>{c.label} — {c.status}</summary>{c.evidence?.map((e,i)=><p key={i}>Tier {e.tier}: {e.question}<br/><strong>{e.answer}</strong></p>)}</details>)??<p>This revision contains an unfinished Tier 1 assessment. Resume the latest revision to continue.</p>}</section>;
}
