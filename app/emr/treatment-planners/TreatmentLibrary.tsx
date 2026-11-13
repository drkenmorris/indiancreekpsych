'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {plannerKinds,plannerLabels,plannerParents,type PlannerNode,type PlannerKind} from '@/lib/emr/treatment-planner';
export default function TreatmentLibrary(){
 const [nodes,setNodes]=useState<PlannerNode[]>([]),[revision,setRevision]=useState(0),[selectedId,setSelectedId]=useState(''),[message,setMessage]=useState('Loading library…'),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[text,setText]=useState(''),[level,setLevel]=useState<PlannerKind>('problem'),[inactive,setInactive]=useState(false);
 async function load(){setBusy(true);try{const r=await fetch('/api/emr/treatment-library',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error);setNodes(d.nodes);setRevision(d.revision);setProblemId('');setObjectiveId('');setSelectedId('');setDirty(false);setMessage('Library loaded. Follow the dropdowns to edit a branch, or add choices below.');}catch(e){setMessage(e instanceof Error?e.message:'Library unavailable.');}finally{setBusy(false);}}
 useEffect(()=>{void load();},[]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty)e.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const [problemId,setProblemId]=useState('');
 const [objectiveId,setObjectiveId]=useState('');
 const current=nodes.find(n=>n.id===selectedId);
 const parentFor=(kind:PlannerKind)=>plannerParents[kind]==='problem'?problemId:plannerParents[kind]==='objective'?objectiveId:null;
 function select(kind:PlannerKind,id:string){
  if(kind==='problem'){setProblemId(id);setObjectiveId('');}
  if(kind==='objective')setObjectiveId(id);
  setSelectedId(id);
 }
 function update(patch:Partial<PlannerNode>){if(!current)return;setNodes(old=>old.map(n=>n.id===current.id?{...n,...patch}:n));setDirty(true);}
 function add(){const parent=parentFor(level),parentKind=plannerParents[level];if(parentKind&&!parent){setMessage('Select the parent '+plannerLabels[parentKind]+' first.');return;}const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(!lines.length||lines.length>100||lines.some(x=>x.length>2000)){setMessage('Enter 1–100 choices, one per line, up to 2000 characters each.');return;}if(new Set(lines.map(x=>x.toLowerCase())).size!==lines.length||lines.some(t=>nodes.some(n=>n.kind===level&&n.parent===parent&&n.text.toLowerCase()===t.toLowerCase()))){setMessage('Remove duplicate choices under this parent.');return;}const fresh=lines.map(t=>({id:crypto.randomUUID(),kind:level,parent,text:t,active:true}));setNodes([...nodes,...fresh]);select(level,fresh[0].id);setText('');setDirty(true);setMessage(`${fresh.length} choices added to this draft. Save shared library to publish them.`);}
 function removeChoice(){
  if(!current||!window.confirm('Delete this option and its descendants from future selections? Saved patient plans retain their wording.'))return;
  const removed=new Set([current.id]);
  for(const kind of plannerKinds)for(const node of nodes)if(node.kind===kind&&node.parent&&removed.has(node.parent))removed.add(node.id);
  setNodes(old=>old.map(node=>removed.has(node.id)?{...node,active:false}:node));
  if(current.kind==='problem')setProblemId('');
  if(current.kind==='problem'||current.kind==='objective')setObjectiveId('');
  setSelectedId(current.parent??'');setDirty(true);
  setMessage('Choice removed from the draft option list. Save shared library to publish the removal.');
 }
 async function save(){setBusy(true);try{const r=await fetch('/api/emr/treatment-library',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:revision,nodes})}),d=await r.json();if(!r.ok)throw Error(d.error);setRevision(d.revision);setDirty(false);setMessage('Shared treatment library saved as revision '+d.revision+'. Patient planners will load these choices.');}catch(e){setMessage(e instanceof Error?e.message:'Save failed.');}finally{setBusy(false);}}
 return <><header><p>Indian Creek · Shared library administration</p><h1>Manage Treatment Planners</h1><p>Build the shared dropdown options for primary and secondary problems in patient treatment plans.</p><nav><Link href="/emr">Central EMR directory</Link> · <Link href="/emr/descriptor-library">Strengths / Challenges table</Link></nav></header><p role="status" aria-live="polite">{message}</p><div className="treatmentActions"><button disabled={busy||!dirty||!revision} onClick={()=>void save()}>Save shared library</button><button disabled={busy} onClick={()=>{if(!dirty||window.confirm('Discard unsaved library edits and reload?'))void load();}}>Reload saved library</button><span>Revision {revision} · {dirty?'Unsaved changes':'Saved'} · {nodes.filter(n=>n.kind==='problem').length} problems</span></div><p>Original editable starter content. Selecting a problem label does not assign a diagnosis. Individualize wording and confirm clinical appropriateness before use.</p>
 <section><h2>Choose a problem and its options</h2><label className="treatmentCheck"><input type="checkbox" checked={inactive} onChange={e=>setInactive(e.target.checked)}/>Show inactive choices</label><div className="treatmentFields">{plannerKinds.map(kind=>{
  const parent=parentFor(kind);
  const value=kind==='problem'?problemId:kind==='objective'?objectiveId:current?.kind===kind?current.id:'';
  const choices=nodes.filter(n=>n.kind===kind&&n.parent===parent&&(inactive||n.active||value===n.id));
  return <label key={kind}>{plannerLabels[kind]}<select disabled={busy||kind!=='problem'&&!parent} value={value} onChange={e=>{
   select(kind,e.target.value);
   if(kind==='problem')setLevel('definition');
   if(kind==='objective')setLevel('intervention');
  }}><option value="">Choose {plannerLabels[kind].toLowerCase()}</option>{choices.map(n=><option key={n.id} value={n.id}>{n.active?'':'[Inactive] '}{n.text}</option>)}</select></label>;
 })}</div>
 {current&&<fieldset disabled={busy}><legend>Edit selected {plannerLabels[current.kind]}</legend><label>Library wording<textarea value={current.text} maxLength={2000} rows={4} onChange={e=>update({text:e.target.value})}/></label><label className="treatmentCheck"><input type="checkbox" checked={current.active} onChange={e=>update({active:e.target.checked})}/>Active choice</label><button type="button" disabled={!current.active} onClick={removeChoice}>Delete selected {plannerLabels[current.kind].toLowerCase()}</button><p>Deactivating a parent also hides its branch from new patient selections. Previously saved plans retain their wording.</p></fieldset>}</section>
 <section><h2>Build dropdown options</h2><p>Select a problem to add definitions, goals, or objectives. Select an objective to add its interventions.</p><form onSubmit={e=>{e.preventDefault();add();}}><fieldset disabled={busy||!revision}><label>Level to add<select value={level} onChange={e=>setLevel(e.target.value as PlannerKind)}>{plannerKinds.map(k=><option value={k} key={k}>{plannerLabels[k]}</option>)}</select></label><p>Parent: {level==='problem'?'Root problem list':nodes.find(n=>n.id===parentFor(level))?.text||'Select its parent using the dropdowns above.'}</p><label>New choices — one per line<textarea value={text} maxLength={100000} rows={4} onChange={e=>setText(e.target.value)} required/></label><button disabled={level!=='problem'&&!parentFor(level)}>Add choices to library draft</button></fieldset></form></section><section><h2>How therapists use this library</h2><p>The patient planner allows one to five problems, up to two definitions per problem, and multiple linked goals, objectives, and interventions. Review the starter wording and replace examples with your own approved library content. Save this library before opening a new patient plan.</p></section></>;
}
