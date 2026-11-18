'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {PlanSnapshot,ResolvedNode,PlannerNode} from '@/lib/emr/treatment-planner';

type Version={id:string;plan_id:string;revision:number;snapshot:PlanSnapshot;created_at:string};
type Source={patient:{id:string;name:string};versions:Version[];nodes:PlannerNode[];libraryRevision:number;entries:InterventionEntry[]};
import {implementedChoices,type ImplementedSelection,type InterventionEntry} from '@/lib/emr/implemented-interventions';
const headings={definition:'Problem Definitions',goal:'Goals',objective:'Objectives',intervention:'Planned Interventions'} as const;

// Current plans link definitions, goals and objectives directly to each problem.
// Earlier saved plans nest those levels; render their actual links without
// inventing a definition-to-goal or goal-to-objective association.
function PlanBranches({nodes,depth=0}:{nodes:ResolvedNode[];depth?:number}){
 return <>{(['definition','goal','objective','intervention'] as const).map(kind=>{
  const matches=nodes.filter(node=>node.kind===kind);
  if(!matches.length)return null;
  const Heading=`h${Math.min(depth+3,6)}` as 'h3'|'h4'|'h5'|'h6';
  return <section className="progressPlanBranch" key={kind}><Heading>{headings[kind]}</Heading><ol>{matches.map((node,index)=><li key={node.id+'-'+index}><p className="progressPlanWording">{node.text}</p>{node.children.length>0&&<PlanBranches nodes={node.children} depth={depth+1}/>}</li>)}</ol></section>;
 })}</>;
}

export default function IndividualProgressPlanner({patientId}:{patientId:string}){
 const [source,setSource]=useState<{patientId:string;data:Source}|null>(null);
 const [error,setError]=useState(''),[message,setMessage]=useState('');
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [refresh,setRefresh]=useState(0),[sessionDate,setSessionDate]=useState('');
 const [selected,setSelected]=useState<ImplementedSelection[]>([]);
 const [dirty,setDirty]=useState(false);
 const generation=useRef(0),requestId=useRef<string|null>(null);
 useEffect(()=>{
  const request=++generation.current,controller=new AbortController();
  setSource(null);setError('');setMessage('');setLoading(true);setSaving(false);setSelected([]);setSessionDate('');setDirty(false);requestId.current=null;
  if(!patientId){setLoading(false);return;}
  void (async()=>{
   try{
    const response=await fetch('/api/emr/implemented-interventions?patient='+encodeURIComponent(patientId),{cache:'no-store',signal:controller.signal});
    const data=await response.json();
    if(controller.signal.aborted||generation.current!==request)return;
    if(!response.ok)throw Error(data.error||'Saved treatment plan could not be loaded.');
    if(data.patient?.id!==patientId||!Array.isArray(data.versions)||!Array.isArray(data.nodes)||!Array.isArray(data.entries))throw Error('The saved treatment plan did not match the selected patient.');
    setSource({patientId,data});
   }catch(e){if(!controller.signal.aborted&&generation.current===request)setError(e instanceof Error?e.message:'Saved treatment plan could not be loaded.');}
   finally{if(!controller.signal.aborted&&generation.current===request)setLoading(false);}
  })();
  return ()=>controller.abort();
 },[patientId,refresh]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty)event.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const data=source?.patientId===patientId?source.data:null;
 const latest=data?.versions[0],plan=latest?.snapshot;
 const edit=()=>{setDirty(true);setMessage('Unsaved intervention selections.');setError('');requestId.current=null;};
 async function save(event:FormEvent){
  event.preventDefault();if(!data||!latest||saving)return;
  if(!sessionDate||!selected.length){setError('Choose a session date and at least one implemented intervention.');if(!sessionDate)document.querySelector<HTMLInputElement>('[name="sessionDate"]')?.focus();return;}
  const request=generation.current;requestId.current??=crypto.randomUUID();setSaving(true);setError('');setMessage('Saving implemented interventions…');
  try{
   const response=await fetch('/api/emr/implemented-interventions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:requestId.current,patientId,planVersionId:latest.id,libraryRevision:data.libraryRevision,sessionDate,selections:selected})});
   const result=await response.json();if(generation.current!==request)return;
   if(!response.ok||!result.saved||!result.entry)throw Error(result.error||'Save was not confirmed. Your selections remain open.');
   setSource(current=>current?.patientId===patientId?{...current,data:{...current.data,entries:[result.entry,...current.data.entries.filter(entry=>entry.id!==result.entry.id)].slice(0,50)}}:current);
   setSelected([]);setDirty(false);requestId.current=null;setMessage('Implemented interventions saved to this patient’s record as an unsigned session entry.');
  }catch(e){if(generation.current===request)setError(e instanceof Error?e.message:'Interventions could not be saved.');}
  finally{if(generation.current===request)setSaving(false);}
 }
 return <div className="progressPlanSummary" data-implemented-dirty={dirty?'true':'false'}>
  <header><h1>Individual Progress Notes Planner</h1><p>Review each problem’s saved treatment plan, then select the therapeutic interventions implemented during this session.</p></header>
  {!patientId?<p>Select a patient from the EMR directory first.</p>:<>
   <div className="progressPlanActions"><button type="button" disabled={loading||saving} onClick={()=>{if(!dirty||window.confirm('Refresh and discard unsaved intervention selections?'))setRefresh(value=>value+1);}}>Refresh saved treatment plan</button></div>
   {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
   {loading&&<p role="status">Loading this patient’s saved treatment plan…</p>}
   {!loading&&!error&&data&&!plan&&<p>No saved treatment plan is available for this patient in your account. Save the patient’s treatment plan to display its problems here.</p>}
   {!loading&&plan&&latest&&data&&<>
    <p><strong>{data.patient.name}</strong> · Source: {plan.title} · Version {latest.revision} · {plan.status==='finalized'?'Finalized plan':'Draft plan — not finalized'} · Saved {new Date(latest.created_at).toLocaleString('en-US',{timeZone:'America/Chicago'})} Central Time.</p>
    <p>Each panel contains the complete wording from this saved plan version. Scroll within a problem panel to read its full definitions, goals, objectives, and planned interventions.</p>
    {!plan.problems.length&&<p>This saved draft has no selected problems.</p>}
    <form onSubmit={save} aria-label="Session implemented interventions">
     <label className="progressSessionDate">Session date<input type="date" name="sessionDate" value={sessionDate} disabled={saving} onChange={event=>{setSessionDate(event.target.value);edit();}}/></label>
     {plan.problems.map((problem,index)=>{
      const options=implementedChoices(problem,data.nodes),picks=selected.filter(s=>s.problemId===problem.id);
      return <article className="progressPlanProblem" key={problem.id+'-'+index}>
       <section className="progressPlanContext" role="region" tabIndex={0} aria-labelledby={'progress-problem-'+index}>
        <h2 id={'progress-problem-'+index}>Problem {index+1}: {problem.text}</h2><p className="progressPlanRole">{problem.primary?'Primary problem':'Secondary problem'}</p>
        {!problem.children.length?<p>No definitions, goals, objectives, or planned interventions have been recorded for this problem in this version.</p>:<PlanBranches nodes={problem.children}/>}
       </section>
       <fieldset disabled={saving} className="progressImplementedPicker"><legend>Implemented interventions — Problem {index+1}</legend>
        <label htmlFor={'implemented-picker-'+index}>Select an implemented intervention for Problem {index+1}</label>
        <select id={'implemented-picker-'+index} value="" disabled={!options.length||selected.length>=100} onChange={event=>{
         if(event.target.value){setSelected(previous=>[...previous,{problemId:problem.id,implementedId:event.target.value}]);edit();}
        }}><option value="">{options.length?'Choose an intervention implemented this session':'No linked implemented intervention choices yet'}</option>
         {[...new Set(options.map(o=>o.plannedId))].map(id=><optgroup key={id} label={'Planned: '+options.find(o=>o.plannedId===id)!.plannedText}>{options.filter(o=>o.plannedId===id).map(option=><option key={option.id} value={option.id} disabled={picks.some(s=>s.implementedId===option.id)}>{option.text}</option>)}</optgroup>)}
        </select>
        {!options.length&&<p>Add implemented intervention wording under this problem’s planned interventions in Home → Manage Treatment Planners. Only choices aligned with this saved problem and its selected planned interventions appear here.</p>}
        <ul>{picks.map(pick=>{const choice=options.find(o=>o.id===pick.implementedId);return <li key={pick.implementedId}><p className="progressPlanWording">{choice?.text??'Choice no longer available; refresh before saving.'}</p><button type="button" onClick={()=>{setSelected(previous=>previous.filter(s=>s!==pick));edit();}}>Remove selection for Problem {index+1}</button></li>;})}</ul>
        {!picks.length&&<p>No implemented interventions selected for this problem. Leave it blank if this problem was not addressed in this session.</p>}
       </fieldset>
      </article>;
     })}
     <div className="progressPlanActions"><button type="submit" disabled={saving}>{saving?'Saving…':'Save implemented interventions'}</button><button type="button" disabled={saving||!dirty} onClick={()=>{setSelected([]);setSessionDate('');setDirty(false);requestId.current=null;setError('');setMessage('Unsaved selections cleared.');}}>Clear unsaved selections</button></div>
    </form>
   </>}
   {!!data?.entries.length&&<section><h2>Saved session intervention entries</h2><p>Most recent 50 entries. These unsigned selections retain their saved plan reference and library wording; they do not sign a progress note.</p>{data.entries.map(entry=><details className="progressSavedEntry" key={entry.id}><summary>{entry.session_date} · {entry.snapshot.plan_title} · Plan version {entry.snapshot.plan_revision}</summary>{entry.snapshot.selections.map(item=><section key={item.problemId+':'+item.id}><h3>{item.problemText}</h3><p><strong>Objective:</strong> {item.objectiveText}</p><p><strong>Planned intervention:</strong> {item.plannedText}</p><p className="progressPlanWording"><strong>Implemented intervention:</strong> {item.text}</p></section>)}</details>)}</section>}
  </>}
 </div>;
}
