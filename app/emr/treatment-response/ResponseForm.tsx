'use client';
import {useEffect,useRef,useState} from 'react';
import type {FormEvent} from 'react';
import {emptyTreatmentResponse,narrativeLabels,responseRoles,validTreatmentResponse,responsePlanLabel,responsePlanReference,type ResponsePlanChoice,type TreatmentResponse,type ResponseParticipant} from '@/lib/emr/treatment-response';
import RichTextEditor from './RichTextEditor';
import RichTextReadOnly from './RichTextReadOnly';
type History={revision:number;response:TreatmentResponse;recorded_at:string;recorded_by:string};
const endpoint='/api/emr/treatment-response';
export default function ResponseForm({patientId}:{patientId:string}) {
 const [response,setResponse]=useState<TreatmentResponse|null>(null),[revision,setRevision]=useState(0),[history,setHistory]=useState<History[]>([]);
 const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('Loading treatment response…'),[attempt,setAttempt]=useState(0),[loaded,setLoaded]=useState(false);
 const [patientName,setPatientName]=useState(''),[plans,setPlans]=useState<ResponsePlanChoice[]>([]),[showNarratives,setShowNarratives]=useState(false);
 const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
  const controller=new AbortController();setLoaded(false);setResponse(null);setDirty(false);setPatientName('');setPlans([]);setShowNarratives(false);setMessage('Loading treatment response…');
  async function load(){try{
   const result=await fetch(endpoint+'?patient='+encodeURIComponent(patientId),{signal:controller.signal,cache:'no-store'});const data=await result.json();
   if(!result.ok)throw Error(data.error||'Treatment response unavailable.');
   if(data.patientId!==patientId||typeof data.patientName!=='string'||!data.patientName.trim()||!Array.isArray(data.plans)||!Number.isSafeInteger(data.revision)||data.response!==null&&!validTreatmentResponse(data.response)||!Array.isArray(data.history))throw Error('The response record did not match this patient.');
   if(!controller.signal.aborted){setPatientName(data.patientName);setPlans(data.plans);const current=data.response??emptyTreatmentResponse();setResponse({...current,participants:current.participants.map((row:ResponseParticipant)=>row.role==='patient'?{...row,name:data.patientName}:row)});setRevision(data.revision);setHistory(data.history);setLoaded(true);setMessage('Response loaded. Unchecked Yes/No boxes mean approval has not been recorded.');}
  }catch(error){if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Treatment response unavailable.');}}
  void load();return()=>controller.abort();
 },[patientId,attempt]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function edit(patch:Partial<TreatmentResponse>){setResponse(current=>current?{...current,...patch}:current);setDirty(true);}
 function person(id:string,patch:Partial<ResponseParticipant>){if(response)edit({participants:response.participants.map(row=>row.id===id?{...row,...patch}:row)});}
 function reload(){if(!dirty||window.confirm('Reload Response and discard unsaved changes?'))setAttempt(value=>value+1);}
 async function save(event:FormEvent){
  event.preventDefault();if(!loaded||busy||!response)return;
  if(!validTreatmentResponse(response)){setMessage('Check the approval rows and optional narrative formatting. Name each additional person whose approval is recorded. Narratives are optional and allow up to 20,000 characters each.');return;}
  setBusy(true);setMessage('Saving treatment response…');
  try{const result=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patientId,revision,response})});const data=await result.json();
   if(!result.ok)throw Error(data.error||'Treatment response could not be saved.');
   if(!Number.isSafeInteger(data.revision)||data.revision!==revision+1)throw Error('Save confirmation was incomplete. Reload before saving again.');
   if(alive.current){setRevision(data.revision);if(data.response&&validTreatmentResponse(data.response))setResponse(data.response);setDirty(false);if(data.history)setHistory(data.history);setMessage(data.history?'Treatment response saved.':'Treatment response saved. Reload to view updated history.');}
  }catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Treatment response could not be saved.');}finally{if(alive.current)setBusy(false);}
 }
 return <section data-response-dirty={dirty?'true':'false'}>
  <h1>Treatment Plan Response</h1>
  <p>Record each person’s approval of the selected treatment plan. Narrative responses are optional. This records the clinician’s documentation of the discussion; it is not a patient signature.</p>
  <p role="status">{message}</p>
  {!loaded?<button type="button" onClick={reload}>Retry loading Response</button>:response&&<>
   <form onSubmit={save}>
    <fieldset disabled={busy}>
     <legend>Plan approval and responses</legend>
     <label className="responsePlanLabel">Treatment plan first recorded (optional)<select value={response.planReference} onChange={event=>edit({planReference:event.target.value})}>
      <option value="">{plans.length?'Choose a saved treatment plan':'No saved treatment plans available to your account'}</option>
      {response.planReference&&!plans.some(plan=>responsePlanReference(plan.id)===response.planReference)&&<option value={response.planReference}>Previously recorded reference: {response.planReference}</option>}
      {plans.map(plan=><option key={plan.id} value={responsePlanReference(plan.id)}>{responsePlanLabel(plan)}</option>)}
     </select></label>
     <p className="responsePlanHint">Dates identify when each plan was first documented. Later versions also show when that version was recorded. Times are Central Time.</p>
     <h2>Approval of treatment plan</h2>
     <p>Check Yes or No for each person. Leave both unchecked if not discussed or not applicable. Add a separate row for every participating parent, guardian, or family member.</p>
     <div className="responseTableScroll" role="region" aria-label="Treatment plan approvals" tabIndex={0}>
      <table className="responseApprovalTable"><caption>Who is on board with treatment?</caption><thead><tr><th scope="col">Person / role</th><th scope="col">Name</th><th scope="col">Yes</th><th scope="col">No</th><th scope="col">Recorded approval</th><th scope="col">Actions</th></tr></thead><tbody>
       {response.participants.map((row,index)=>{const label=responseRoles[row.role]+' '+(index+1);return <tr key={row.id}>
        <td>{row.role==='patient'?'Active patient':<select aria-label={label+' role'} value={row.role} onChange={event=>person(row.id,{role:event.target.value as ResponseParticipant['role']})}>{Object.entries(responseRoles).filter(([role])=>role!=='patient').map(([role,name])=><option key={role} value={role}>{name}</option>)}</select>}</td>
        <td>{row.role==='patient'?<span className="responsePatientName">{patientName}</span>:<input aria-label={label+' name'} value={row.name} maxLength={120} onChange={event=>person(row.id,{name:event.target.value})}/>}</td>
        <td><label><input type="checkbox" aria-label={label+' approves Yes'} checked={row.approval==='yes'} onChange={event=>person(row.id,{approval:event.target.checked?'yes':'unanswered'})}/> Yes</label></td>
        <td><label><input type="checkbox" aria-label={label+' approves No'} checked={row.approval==='no'} onChange={event=>person(row.id,{approval:event.target.checked?'no':'unanswered'})}/> No</label></td>
        <td>{row.approval==='unanswered'?'Not recorded':row.approval==='yes'?'Approves':'Does not approve'}</td>
        <td>{row.role!=='patient'&&<button type="button" aria-label={'Remove '+label} onClick={()=>edit({participants:response.participants.filter(p=>p.id!==row.id)})}>Remove</button>}</td>
       </tr>;})}
      </tbody></table>
     </div>
     <button type="button" disabled={response.participants.length>=30} onClick={()=>edit({participants:[...response.participants,{id:crypto.randomUUID(),role:'family',name:'',approval:'unanswered'}]})}>Add significant other, parent, guardian, or family member</button>
     <div className="responseOptionalNarratives"><button type="button" aria-expanded={showNarratives} aria-controls="response-optional-narratives" onClick={()=>setShowNarratives(value=>!value)}>{showNarratives?'Hide optional narratives':'Show optional narratives'}</button><p>These narratives are optional. Hiding them keeps any entered or previously saved wording.</p></div>
     <div id="response-optional-narratives" hidden={!showNarratives}>{showNarratives&&(Object.keys(narrativeLabels) as (keyof typeof narrativeLabels)[]).map(key=><RichTextEditor key={patientId+':'+attempt+':'+key} label={narrativeLabels[key]} value={response.narratives[key]} disabled={busy} onChange={value=>edit({narratives:{...response.narratives,[key]:value}})}/>)}</div>
     <div className="responseActions"><button type="submit" disabled={!dirty||busy}>{busy?'Saving…':'Save treatment response'}</button><button type="button" onClick={reload}>Reload saved response</button></div>
    </fieldset>
   </form>
   <details className="responseHistory"><summary>Saved response history ({history.length}{history.length===50?'+':''} versions)</summary>
    <p>Each saved change keeps the prior approval choices and formatted narratives. Strikethrough preserves visible wording in a narrative; saved history preserves earlier versions independently. Earlier treatment-plan narratives remain in their original plan history.</p>
    {history.map(item=><article key={item.revision}><h2>Revision {item.revision} · {new Date(item.recorded_at).toLocaleString()}</h2>{item.response.planReference&&<p>Plan / version: {plans.find(plan=>responsePlanReference(plan.id)===item.response.planReference)?responsePlanLabel(plans.find(plan=>responsePlanReference(plan.id)===item.response.planReference)!):item.response.planReference}</p>}
     <ul>{item.response.participants.map(row=><li key={row.id}>{responseRoles[row.role]}{row.name?' — '+row.name:''}: {row.approval==='unanswered'?'Not recorded':row.approval==='yes'?'Yes':'No'}</li>)}</ul>
     <details><summary>View recorded narratives (optional)</summary>{(Object.keys(narrativeLabels) as (keyof typeof narrativeLabels)[]).map(key=><section key={key}><h3>{narrativeLabels[key]}</h3><RichTextReadOnly value={item.response.narratives[key]}/></section>)}</details>
    </article>)}
    {!history.length&&<p>No response versions saved yet.</p>}
   </details>
  </>}
 </section>;
}
