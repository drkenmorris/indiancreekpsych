'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import Link from 'next/link';
import {homeworkChoices,validHomeworkInput,type HomeworkPlanVersion,type SavedHomework} from '@/lib/emr/homework';
import {emptyRichDoc,type RichNode} from '@/lib/emr/treatment-response';
import RichTextEditor from '../treatment-response/RichTextEditor';
import RichTextReadOnly from '../treatment-response/RichTextReadOnly';
export default function HomeworkForm({patientId}:{patientId:string}){
 const selectionId=useId();
 const [versions,setVersions]=useState<HomeworkPlanVersion[]>([]),[versionId,setVersionId]=useState(''),[problemId,setProblemId]=useState(''),[objectiveId,setObjectiveId]=useState(''),[interventionId,setInterventionId]=useState('');
 const [narrative,setNarrative]=useState<RichNode>(emptyRichDoc),[draftId,setDraftId]=useState(''),[editorKey,setEditorKey]=useState(0);
 const [history,setHistory]=useState<SavedHomework[]>([]),[offset,setOffset]=useState(0),[hasMore,setHasMore]=useState(false),[preview,setPreview]=useState<SavedHomework|null>(null);
 const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[attempt,setAttempt]=useState(0),[message,setMessage]=useState('Loading patient treatment plan…');
 const alive=useRef(true),historyRequest=useRef<AbortController|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;historyRequest.current?.abort();};},[]);
 useEffect(()=>{
  const controller=new AbortController();setLoaded(false);setMessage('Loading patient treatment plan…');setPreview(null);
  async function load(){try{
   const [pr,hr]=await Promise.all([fetch('/api/emr/treatment-plans?patient='+encodeURIComponent(patientId),{signal:controller.signal,cache:'no-store'}),fetch('/api/emr/homework?patient='+encodeURIComponent(patientId),{signal:controller.signal,cache:'no-store'})]);
   const [plans,homework]=await Promise.all([pr.json(),hr.json()]);
   if(!pr.ok||!hr.ok)throw Error(plans.error||homework.error||'Homework could not be loaded.');
   if(plans.patient?.id!==patientId||homework.patientId!==patientId||!Array.isArray(plans.versions)||!Array.isArray(homework.assignments))throw Error('Homework did not match the selected patient.');
   if(controller.signal.aborted)return;
   setVersions(plans.versions);setVersionId(plans.versions[0]?.id??'');setProblemId('');setObjectiveId('');setInterventionId('');setNarrative(emptyRichDoc());setEditorKey(n=>n+1);setDraftId(crypto.randomUUID());
   setHistory(homework.assignments);setOffset(0);setHasMore(homework.hasMore);setDirty(false);setLoaded(true);setMessage(plans.versions.length?'Choose a problem from this patient’s saved treatment plan.':'No saved treatment plan is available for this patient. Save patient-specific problems, objectives, and interventions in Treatment Plan to make them available here.');
  }catch(error){if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Homework unavailable.');}}
  void load();return()=>controller.abort();
 },[patientId,attempt]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const version=versions.find(v=>v.id===versionId)??null;
 const {problems,problem,objectives,objective,interventions}=homeworkChoices(version,problemId,objectiveId);
 const intervention=interventions.find(item=>item.id===interventionId);
 function edit(){setDirty(true);}
 function newAssignment(){if(dirty&&!window.confirm('Discard unsaved homework changes and start a new assignment?'))return;setProblemId('');setObjectiveId('');setInterventionId('');setNarrative(emptyRichDoc());setEditorKey(n=>n+1);setDraftId(crypto.randomUUID());setDirty(false);setPreview(null);setMessage('Choose a problem for a new homework assignment.');}
 async function save(){
  const body={id:draftId,patientId,planVersionId:versionId,problemId,objectiveId,interventionId,narrative};
  if(busy||!loaded)return;
  if(!validHomeworkInput(body)){setMessage('Choose the problem, objective, and intervention, then enter the homework assignment.');return;}
  setBusy(true);setMessage('Saving homework assignment…');
  try{const result=await fetch('/api/emr/homework',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await result.json();
   if(!result.ok||!data.saved)throw Error(data.error||'Homework save was not confirmed.');
   if(data.assignment?.id!==draftId||data.assignment?.patient_id!==patientId)throw Error('Homework save confirmation did not match this assignment.');
   if(!alive.current)return;
   setPreview(data.assignment);setHistory(current=>[data.assignment,...current.filter(row=>row.id!==data.assignment.id)].slice(0,50));setOffset(0);setHasMore(hasMore||history.length>=50);setDirty(false);setDraftId(crypto.randomUUID());setMessage('Homework saved. Review the handout below, then print it for the patient.');
   try{const refreshed=await fetch('/api/emr/homework?patient='+encodeURIComponent(patientId),{cache:'no-store'});const directory=await refreshed.json();if(refreshed.ok&&directory.patientId===patientId&&Array.isArray(directory.assignments)&&alive.current){setHistory(directory.assignments);setOffset(0);setHasMore(directory.hasMore);}}catch{/* The confirmed saved handout remains printable if history refresh fails. */}
  }catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Homework save failed.');}finally{if(alive.current)setBusy(false);}
 }
 async function pageHistory(next:number){
  historyRequest.current?.abort();const controller=new AbortController();historyRequest.current=controller;setBusy(true);
  try{const result=await fetch('/api/emr/homework?'+new URLSearchParams({patient:patientId,offset:String(next)}),{cache:'no-store',signal:controller.signal});const data=await result.json();if(!result.ok)throw Error(data.error);
   if(data.patientId!==patientId||!Array.isArray(data.assignments))throw Error('Homework history did not match this patient.');
   if(!controller.signal.aborted){setHistory(data.assignments);setOffset(next);setHasMore(data.hasMore);}
  }catch(error){if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Homework history unavailable.');}finally{if(!controller.signal.aborted&&alive.current)setBusy(false);}
 }
 function print(assignment:SavedHomework){flushSync(()=>setPreview(assignment));window.print();}
 return <section data-homework-dirty={dirty?'true':'false'}>
  <div className="noHomeworkPrint">
   <h1>Homework</h1><p>Target a problem in this patient’s saved treatment plan, choose its objective and intervention, then write the assignment.</p><p role="status">{message}</p>
   {!loaded?<button type="button" onClick={()=>setAttempt(n=>n+1)}>Retry loading Homework</button>:<>
    <p><Link href={'/emr/treatment-plan?patient='+patientId} target="_blank" rel="noopener noreferrer">Open this patient’s treatment plan</Link></p>
    {!!versions.length&&<form onSubmit={event=>{event.preventDefault();void save();}}><fieldset disabled={busy}><legend>Patient homework assignment</legend>
     <label>Treatment plan version<select value={versionId} onChange={event=>{setVersionId(event.target.value);setProblemId('');setObjectiveId('');setInterventionId('');edit();}}>{versions.map(v=><option key={v.id} value={v.id}>{v.snapshot.title} · Version {v.revision} · {v.snapshot.status} · {new Date(v.created_at).toLocaleString()}</option>)}</select></label>
     {version?.snapshot.status==='draft'&&<p>This saved treatment plan is a draft. Review its selected items before assigning homework.</p>}
     <label>Homework for<select required value={problemId} onChange={event=>{setProblemId(event.target.value);setObjectiveId('');setInterventionId('');edit();}}><option value="">Choose a patient problem</option>{problems.map(p=><option key={p.id} value={p.id}>{p.text}</option>)}</select></label>
     <div className="homeworkSelectionField"><label>Objective<select aria-describedby={objective?selectionId+'-objective':undefined} required disabled={!problemId||!objectives.length} value={objectiveId} onChange={event=>{setObjectiveId(event.target.value);setInterventionId('');edit();}}><option value="">{!problemId?'Choose a problem first':objectives.length?'Choose a linked objective':'No objectives saved for this problem'}</option>{objectives.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></label>{objective&&<div id={selectionId+'-objective'} className="homeworkSelectedNarrative"><strong>Selected objective</strong><p>{objective.text}</p></div>}</div>
     {problemId&&!objectives.length&&<p>No objective has been saved for this problem. Add and save its objectives in the treatment plan, then reload Homework.</p>}
     <div className="homeworkSelectionField"><label>Intervention<select aria-describedby={intervention?selectionId+'-intervention':undefined} required disabled={!objectiveId||!interventions.length} value={interventionId} onChange={event=>{setInterventionId(event.target.value);edit();}}><option value="">{!objectiveId?'Choose an objective first':interventions.length?'Choose a linked intervention':'No interventions saved for this objective'}</option>{interventions.map(i=><option key={i.id} value={i.id}>{i.text}</option>)}</select></label>{intervention&&<div id={selectionId+'-intervention'} className="homeworkSelectedNarrative"><strong>Selected intervention</strong><p>{intervention.text}</p></div>}</div>
     {objectiveId&&!interventions.length&&<p>No intervention has been saved for this objective. Add and save its interventions in the treatment plan, then reload Homework.</p>}
     <RichTextEditor key={patientId+':'+editorKey} label="Homework assignment" value={narrative} disabled={busy} onChange={value=>{setNarrative(value);edit();}}/>
     <div className="treatmentActions"><button type="submit" disabled={!dirty||busy}>Save homework assignment</button><button type="button" onClick={newAssignment}>New homework assignment</button><button type="button" onClick={()=>{if(!dirty||window.confirm('Reload Homework and discard unsaved changes?'))setAttempt(n=>n+1);}}>Reload treatment plan and homework</button><button type="button" disabled={!preview||dirty} onClick={()=>preview&&print(preview)}>Print saved homework</button></div>
     {dirty&&preview&&<p>Save the current changes before printing them. Saved assignments remain available below.</p>}
    </fieldset></form>}
    <section><h2>Saved homework assignments</h2><p>Each save keeps the selected treatment-plan wording and assignment together. Later plan edits do not rewrite an earlier homework handout.</p>
     {history.length?<ul>{history.map(row=><li key={row.id}><strong>{row.snapshot.problem.text}</strong> · {new Date(row.created_at).toLocaleString()} <button type="button" disabled={busy} onClick={()=>setPreview(row)}>View saved handout</button> <button type="button" disabled={busy} onClick={()=>print(row)}>Print this homework</button></li>)}</ul>:<p>No saved homework assignments.</p>}
     {(offset>0||hasMore)&&<div className="treatmentActions"><button type="button" disabled={offset===0||busy} onClick={()=>void pageHistory(Math.max(0,offset-50))}>Newer assignments</button><button type="button" disabled={!hasMore||busy} onClick={()=>void pageHistory(offset+50)}>Older assignments</button></div>}
    </section>
   </>}
  </div>
  {preview&&<article className="homeworkHandout" aria-label="Printable saved homework assignment"><h1>Indian Creek Psychological Services</h1><h2>Homework assignment</h2><p><strong>Patient:</strong> {preview.snapshot.patient_name}</p><p><strong>Clinician:</strong> {preview.snapshot.clinician_name}</p><p><strong>Assigned:</strong> {new Date(preview.created_at).toLocaleDateString()}</p>
   <h3>Homework for</h3><p>{preview.snapshot.problem.text}</p><h3>Objective</h3><p>{preview.snapshot.objective.text}</p><h3>Intervention</h3><p>{preview.snapshot.intervention.text}</p><h3>Homework assignment</h3><RichTextReadOnly value={preview.snapshot.assignment}/>
   <p className="homeworkPlanReference">Treatment plan: {preview.snapshot.plan_title} · Version {preview.snapshot.plan_revision} · {preview.snapshot.plan_status==='draft'?'Draft plan':'Finalized plan'}</p>
  </article>}
  {!preview&&<p className="homeworkPrintEmpty">Select a saved homework assignment before printing.</p>}
 </section>;
}
