'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {soapLabels as labels,soapGroups,objectiveProgress,blankSoapQuick,blankSoapSections,assembleSoap,emptySoapPlan,soapPlanChoices,type SoapKey,type SoapQuickState,type SoapPlanChoices} from '@/lib/emr/soap-quick-entry';
type Note={id:string;patient_id:string;template:string;encounter_at:string;encounter_type:string;created_at:string;sections:Record<string,string>};
const blank=blankSoapSections;
export default function SoapNotes({patientId}:{patientId:string}){
 const [notes,setNotes]=useState<Note[]>([]),[narrative,setNarrative]=useState(blank);
 const [quick,setQuick]=useState(blankSoapQuick),[openNarrative,setOpenNarrative]=useState<Record<string,boolean>>({});
 const [planSource,setPlanSource]=useState<SoapPlanChoices>(emptySoapPlan),[planMessage,setPlanMessage]=useState('');
 const sections=assembleSoap(quick,narrative,planSource);
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
  const request=++generation.current,controller=new AbortController();setNotes([]);setNarrative(blank());setQuick(blankSoapQuick());setOpenNarrative({});setPlanSource(emptySoapPlan());setPlanMessage('Loading treatment-plan choices…');setDate('');setEncounterType('Individual therapy');setReviewed(false);setDirty(false);setLoading(true);setSaving(false);setError('');setMessage('');
  if(!patientId){setLoading(false);return;}
  void read(controller.signal).then(items=>{if(!controller.signal.aborted&&generation.current===request)setNotes(items);}).catch(e=>{if(!controller.signal.aborted&&generation.current===request)setError(e instanceof Error?e.message:'SOAP notes unavailable.');}).finally(()=>{if(!controller.signal.aborted&&generation.current===request)setLoading(false);});
  void (async()=>{
   try{
    const response=await fetch('/api/emr/implemented-interventions?patient='+encodeURIComponent(patientId),{cache:'no-store',signal:controller.signal});const data=await response.json();
    if(!response.ok||data.patient?.id!==patientId||!Array.isArray(data.versions)||!Array.isArray(data.nodes))throw Error('Treatment-plan choices unavailable. You can use the other quick entries and optional narratives.');
    if(controller.signal.aborted||generation.current!==request)return;
    const latest=data.versions[0];setPlanSource(soapPlanChoices(latest?.snapshot,data.nodes,latest?.revision));setPlanMessage(latest?'':'No saved treatment plan is available. You can use the other quick entries and optional narratives.');
   }catch(e){if(!controller.signal.aborted&&generation.current===request)setPlanMessage(e instanceof Error?e.message:'Treatment-plan choices unavailable.');}
  })();
  return()=>controller.abort();
 },[patientId,read]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty)event.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function edit(){setDirty(true);setReviewed(false);setMessage('');}
 function updateQuick(update:(previous:SoapQuickState)=>SoapQuickState){setQuick(update);edit();}
 function toggle(key:'problems'|'implemented'|'focus',id:string){updateQuick(previous=>({...previous,[key]:previous[key].includes(id)?previous[key].filter(value=>value!==id):[...previous[key],id]}));}
 function checks(key:'problems'|'implemented'|'focus',heading:string,choices:SoapPlanChoices['problems']){
  return choices.length?<fieldset className="soapChoiceGroup"><legend>{heading}</legend><div className="soapChecks">{choices.map(choice=><label key={choice.id}><input type="checkbox" name={key} value={choice.id} checked={quick[key].includes(choice.id)} onChange={()=>toggle(key,choice.id)}/><span>{choice.text}</span></label>)}</div></fieldset>:null;
 }
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(saving||loading)return;
  if(!date||!Number.isFinite(new Date(date).getTime())||!reviewed||Object.values(sections).some(value=>value.trim().length<2||value.length>4000)){setMessage('Complete the encounter date/time, add quick entries or narrative to each SOAP section (2–4000 characters), and review the note before saving.');return;}
  const request=generation.current;
  // Verify the exact unsigned clinical content that the clinician reviewed.
  // An ID-only readback can acknowledge another version or a changed note.
  const submittedSections=Object.fromEntries(Object.entries(sections).map(([key,value])=>[key,value.trim()]));
  const submittedEncounterAt=new Date(date).toISOString();
  const submittedEncounterType=encounterType;
  setSaving(true);setMessage('Saving SOAP note…');
  try{
   const response=await fetch('/api/emr/progress-notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'note',patient_id:patientId,encounter_at:submittedEncounterAt,encounter_type:submittedEncounterType,template:'SOAP',sections:submittedSections,reviewed:true})});const result=await response.json();if(generation.current!==request)return;
   if(!response.ok||result.saved!==true||result.unsigned!==true)throw Error(result.error||'Save was not confirmed.');
   const current=await read();if(generation.current!==request)return;
   const saved=current.find(note=>note.id===result.id);
   if(!saved||saved.encounter_type!==submittedEncounterType||
    new Date(saved.encounter_at).getTime()!==new Date(submittedEncounterAt).getTime()||
    !saved.sections||typeof saved.sections!=='object'||Array.isArray(saved.sections)||
    Object.keys(submittedSections).some(key=>saved.sections[key]!==submittedSections[key]))
    throw Error('The save was acknowledged but the independently read chart history did not match the reviewed SOAP note. Preserve this draft and inspect saved notes before retrying.');
   setNotes(current);setNarrative(blank());setQuick(blankSoapQuick());setOpenNarrative({});setReviewed(false);setDirty(false);setMessage('SOAP note saved unsigned in this patient’s clinical record.');
  }catch(e){if(generation.current===request)setMessage(e instanceof Error?e.message:'SOAP note could not be saved.');}
  finally{if(generation.current===request)setSaving(false);}
 }
 return <section className="centralCard" data-soap-dirty={dirty?'true':'false'}>
  <h1>SOAP Notes</h1><p>Record the patient’s subjective report, objective observations, clinical assessment, and plan for this encounter.</p>
  {!patientId?<p>Select a patient from Find/Add Patient before entering a note.</p>:loading?<p role="status">Loading SOAP notes…</p>:error?<p role="alert">{error}</p>:<>
   <form onSubmit={save} noValidate aria-label="New SOAP note"><fieldset disabled={saving}><legend>New SOAP note</legend>
    <label>Encounter date and time (your device’s timezone)<input type="datetime-local" name="encounter" value={date} required onChange={event=>{setDate(event.target.value);edit();}}/></label>
    <label>Type of encounter<select value={encounterType} onChange={event=>{setEncounterType(event.target.value);edit();}}><option>Individual therapy</option><option>Initial evaluation</option><option>Follow-up</option><option>Other clinical encounter</option></select></label>
    <p>Select only entries that apply to this session. Each section needs quick entries or narrative; narrative is optional.</p>
    {planMessage&&<p role="status">{planMessage}</p>}
    {planSource.context&&<p>{planSource.context}</p>}
    {(Object.keys(labels) as SoapKey[]).map(key=><section className="soapSection" key={key} aria-labelledby={'soap-heading-'+key}>
     <h2 id={'soap-heading-'+key}>{labels[key]}</h2>
     <div className="soapQuickFields">{soapGroups[key].map(group=>group.kind==='multi'?<fieldset className="soapChoiceGroup" key={group.id}><legend>{group.label}</legend><div className="soapChecks">{group.options.map(option=><label key={option}><input type="checkbox" name={group.id} value={option} checked={quick.groups[group.id]?.includes(option)??false} onChange={()=>updateQuick(previous=>{const values=previous.groups[group.id]??[];return {...previous,groups:{...previous.groups,[group.id]:values.includes(option)?values.filter(value=>value!==option):[...values,option]}};})}/><span>{option}</span></label>)}</div></fieldset>:<label key={group.id} htmlFor={'soap-'+group.id}>{group.label}<select id={'soap-'+group.id} name={group.id} value={quick.groups[group.id]?.[0]??''} onChange={event=>{const value=event.target.value;updateQuick(previous=>({...previous,groups:{...previous.groups,[group.id]:value?[value]:[]}}));}}><option value="">Select if assessed</option>{group.options.map(option=><option key={option}>{option}</option>)}</select></label>)}</div>
     {key==='objective'&&checks('implemented','Interventions implemented during this session',planSource.implemented)}
     {key==='objective'&&planSource.problems.length>0&&!planSource.implemented.length&&<p>No active implemented-intervention choices are linked to this saved plan. Use narrative to record interventions delivered.</p>}
     {key==='assessment'&&<>{checks('problems','Treatment-plan problems addressed',planSource.problems)}{planSource.objectives.length>0&&<fieldset className="soapChoiceGroup"><legend>Progress toward treatment-plan objectives</legend>{planSource.objectives.map(choice=><label key={choice.id} htmlFor={'soap-objective-'+choice.id}>{choice.text}<select id={'soap-objective-'+choice.id} name={'objective-progress-'+choice.id} value={quick.objectives[choice.id]??''} onChange={event=>{const value=event.target.value;updateQuick(previous=>({...previous,objectives:{...previous.objectives,[choice.id]:value}}));}}><option value="">Select if assessed</option>{objectiveProgress.map(value=><option key={value}>{value}</option>)}</select></label>)}</fieldset>}</>}
     {key==='plan'&&checks('focus','Next-session treatment-plan focus',planSource.problems)}
     <button type="button" aria-expanded={openNarrative[key]??false} aria-controls={'soap-narrative-'+key} onClick={()=>setOpenNarrative(previous=>({...previous,[key]:!previous[key]}))}>{openNarrative[key]?'Hide narrative':'Add narrative'} — {labels[key]}</button>
     <div id={'soap-narrative-'+key} hidden={!openNarrative[key]}><label htmlFor={'soap-text-'+key}>{labels[key]} narrative (optional)<textarea id={'soap-text-'+key} name={key} rows={4} maxLength={4000} value={narrative[key]} onChange={event=>{const value=event.target.value;setNarrative(previous=>({...previous,[key]:value}));edit();}}/></label></div>
     {!openNarrative[key]&&narrative[key]&&<p>Narrative retained and included in the note.</p>}
     <p className="soapCharacterCount">{sections[key].length} / 4000 characters</p>
    </section>)}
    <details className="soapPreview"><summary>Review assembled SOAP note</summary>{(Object.keys(labels) as SoapKey[]).map(key=><section key={key}><h3>{labels[key]}</h3><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{sections[key]||'No content entered.'}</p></section>)}</details>
    <label className="soapReview"><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/>I reviewed the date, patient identity and note content. Save as an unsigned, append-only clinical record.</label>
    <button type="submit">{saving?'Saving…':'Save SOAP note'}</button>
   </fieldset></form>
   <h2>Saved SOAP notes</h2>{!notes.length?<p>No SOAP notes have been recorded for this patient.</p>:notes.map(note=><details key={note.id}><summary>{new Date(note.encounter_at).toLocaleString()} · {note.encounter_type}</summary><dl>{(Object.keys(labels) as SoapKey[]).map(key=><div key={key}><dt>{labels[key]}</dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{note.sections[key]}</dd></div>)}</dl><p>Recorded {new Date(note.created_at).toLocaleString()}. Original content is retained in the patient record; corrections use the existing progress-note addendum workflow.</p></details>)}
  </>}{message&&<p role="status">{message}</p>}
 </section>;
}
