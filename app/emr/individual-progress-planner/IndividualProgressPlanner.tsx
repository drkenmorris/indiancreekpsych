'use client';
import {useEffect,useRef,useState} from 'react';
import type {PlanSnapshot,ResolvedNode} from '@/lib/emr/treatment-planner';

type Version={id:string;plan_id:string;revision:number;snapshot:PlanSnapshot;created_at:string};
type Source={patient:{id:string;name:string};versions:Version[]};
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
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [refresh,setRefresh]=useState(0);
 const generation=useRef(0);
 useEffect(()=>{
  const request=++generation.current,controller=new AbortController();
  setSource(null);setError('');setLoading(true);
  if(!patientId){setLoading(false);return;}
  void (async()=>{
   try{
    const response=await fetch('/api/emr/treatment-plans?patient='+encodeURIComponent(patientId),{cache:'no-store',signal:controller.signal});
    const data=await response.json();
    if(controller.signal.aborted||generation.current!==request)return;
    if(!response.ok)throw Error(data.error||'Saved treatment plan could not be loaded.');
    if(data.patient?.id!==patientId||!Array.isArray(data.versions))throw Error('The saved treatment plan did not match the selected patient.');
    setSource({patientId,data});
   }catch(e){if(!controller.signal.aborted&&generation.current===request)setError(e instanceof Error?e.message:'Saved treatment plan could not be loaded.');}
   finally{if(!controller.signal.aborted&&generation.current===request)setLoading(false);}
  })();
  return ()=>controller.abort();
 },[patientId,refresh]);
 const data=source?.patientId===patientId?source.data:null;
 const latest=data?.versions[0];
 const plan=latest?.snapshot;
 return <div className="progressPlanSummary">
  <header><h1>Individual Progress Notes Planner</h1><p>Review each patient problem and its saved definitions, goals, objectives, and planned interventions before writing the session note.</p></header>
  {!patientId?<p>Select a patient from the EMR directory first.</p>:<>
   <div className="progressPlanActions"><button type="button" disabled={loading} onClick={()=>setRefresh(value=>value+1)}>Refresh saved treatment plan</button><a href={'/emr/treatment-plan?patient='+encodeURIComponent(patientId)} target="_top">Open patient treatment plan</a></div>
   {error&&<p role="alert">{error}</p>}
   {loading&&<p role="status">Loading this patient’s saved treatment plan…</p>}
   {!loading&&!error&&data&&!plan&&<p>No saved treatment plan is available for this patient in your account. Save the patient’s treatment plan to display its problems here.</p>}
   {!loading&&!error&&plan&&latest&&<>
    <p><strong>{data?.patient.name}</strong> · Source: {plan.title} · Version {latest.revision} · {plan.status==='finalized'?'Finalized plan':'Draft plan — not finalized'} · Saved {new Date(latest.created_at).toLocaleString('en-US',{timeZone:'America/Chicago'})} Central Time.</p>
    <p>This is the most recent saved plan available to your account. Unsaved treatment-plan edits are not included. Wording below is retained from that saved version.</p>
    {!plan.problems.length&&<p>This saved draft has no selected problems.</p>}
    {plan.problems.map((problem,index)=><article className="progressPlanProblem" key={problem.id+'-'+index}>
     <h2>Problem {index+1}: {problem.text}</h2><p className="progressPlanRole">{problem.primary?'Primary problem':'Secondary problem'}</p>
     {!problem.children.length?<p>No definitions, goals, objectives, or planned interventions have been recorded for this problem in this version.</p>:<PlanBranches nodes={problem.children}/>}
    </article>)}
   </>}
  </>}
 </div>;
}
