"use client";
import {useEffect,useState,type FormEvent} from "react";

import {isConnectedKey} from '@/lib/clinical-tests/connected/definition';
import DsmVersionChoice from '@/app/components/DsmVersionChoice';
import Link from 'next/link';
import {asqRoleLabels,asqRoles,type AsqRole} from '@/lib/clinical-tests/asq-forms';
import {dsmVersionLabel} from '@/lib/clinical-tests/dsm/entry-choice';
type Test={value:string;label:string;patientReady:boolean};
type Assignment={
  id:string;recipient_first_name:string;recipient_last_name:string;
  recipient_email:string;test_key:string;dsm_version:string|null;asq_role:AsqRole|null;patient_id:string|null;dsm_source_hash:string|null;dsm_format?:string;dsm_progress:{status:string;answered_count:number;revision:number}|null;asq_progress:{status:string;answered_count:number;revision:number}|null;status:string;created_at:string;
  connected_source_hash?:string;connected_progress?:{status:string;answered_count:number;revision:number}|null;expires_at:string;sent_at:string|null;
};
const defaults={firstName:"",lastName:"",email:"",dob:"",testKey:"",dsmVersion:"",asqRole:"",patientId:""};
export default function TestAssignmentClient({initialTestKey="",initialPatientId=""}:{initialTestKey?:string;initialPatientId?:string}={}){
 const [patients,setPatients]=useState<{id:string;demographics:Record<string,string>;profiles:{full_name?:string}|{full_name?:string}[]|null}[]>([]);
 const [asqReleaseReady,setAsqReleaseReady]=useState(false);
 const [form,setForm]=useState({...defaults,testKey:initialTestKey,patientId:initialPatientId});
 const [tests,setTests]=useState<Test[]>([]);
 const selectedTest=form.testKey==='asq'?(form.asqRole?`asq:${form.asqRole}`:"asq-version-required"):form.testKey;
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [emailReady,setEmailReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [confirmInvitation,setConfirmInvitation]=useState<string|null>(null);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);

 async function load(){
  const response=await fetch("/api/admin/test-assignments",{cache:"no-store"});
  const json=await response.json();
  if(!response.ok)throw Error(json.error??"Unable to load assignments.");
  setTests(json.tests);
  setAssignments(json.assignments);
  setEmailReady(Boolean(json.deliveryReady));setAsqReleaseReady(Boolean(json.asqReleaseReady));
  const roster=await fetch('/api/emr/patients',{cache:'no-store'});const patientData=await roster.json();if(!roster.ok)throw Error(patientData.error||'Central patient list unavailable.');setPatients(patientData.patients);setForm(f=>f.testKey==='dsm'&&f.patientId&&!f.dob?{...f,dob:patientData.patients.find((p:{id:string})=>p.id===f.patientId)?.demographics.dob||''}:f);
  setLoading(false);
 }
 useEffect(()=>{void load().catch(e=>{setError(e instanceof Error?e.message:"Unable to load.");setLoading(false);});},[]);
 async function create(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  setBusy(true);setMessage("");setError("");
  try{
   const response=await fetch("/api/admin/test-assignments",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"create",...form})
   });
   const json=await response.json();
   if(!response.ok)throw Error(json.error??"Unable to create assignment.");
   setForm(defaults);
   await load();
   setMessage("Assignment saved as a draft. No email has been sent. "+
     (!tests.find(t=>t.value===form.testKey)?.patientReady?"This questionnaire’s recipient release is pending; Send Invitation remains disabled.":emailReady?"Use Send Invitation on its row to email the secure link.":"Secure email delivery must be activated before invitations can be sent."));
  }catch(e){setError(e instanceof Error?e.message:"Could not create assignment.");}
  finally{setBusy(false);}
 }
 async function send(item:Assignment){
  if(busy||confirmInvitation!==item.id)return;
  setConfirmInvitation(null);
  setBusy(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/admin/test-assignments",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"send",id:item.id})
   });
   const json=await response.json();
   if(!response.ok)throw Error(json.error??"Email was not sent.");
   await load();
   setMessage("The email provider accepted the invitation. Delivery to the recipient's inbox is not yet confirmed.");
  }catch(e){setError(e instanceof Error?e.message:"Email was not sent.");}
  finally{setBusy(false);}
 }
 return <div className="assignmentPanels">
  <section className="assignmentCard">
   <h2>New assignment</h2>
   <p>Enter the name and email of the person who will answer. For ASQ/ASEQ and DSM, select the patient/student separately from the respondent.</p>
   <form className="assignmentForm" onSubmit={create}>
    <div className="assignmentTwoFields">
     <label>Recipient first name<input required autoComplete="off" maxLength={100} value={form.firstName}
       onChange={e=>setForm(f=>({...f,firstName:e.target.value}))}/></label>
     <label>Recipient last name<input required autoComplete="off" maxLength={100} value={form.lastName}
       onChange={e=>setForm(f=>({...f,lastName:e.target.value}))}/></label>
    </div>
    <label>Recipient email address<input type="email" required maxLength={254} autoComplete="off" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="recipient@example.com"/></label>
    {form.testKey!=='asq'&&!isConnectedKey(form.testKey)&&<label>Patient date of birth<input type="date" required min="1900-01-01" max={new Date().toISOString().slice(0,10)} value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))}/></label>}
    <label>Psychological test
     <select required value={selectedTest} onChange={e=>{const [testKey,asqRole=""]=e.target.value.split(":");setForm(f=>({...f,testKey,dsmVersion:"",asqRole,patientId:['asq','dsm'].includes(testKey)||isConnectedKey(testKey)?f.patientId:""}));}}>
      <option value="">Select a test</option>
      {form.testKey==='asq'&&!form.asqRole&&<option value="asq-version-required" disabled>Select an ASQ / ASEQ version</option>}
      {tests.flatMap(t=>t.value==='asq'?asqRoles.map(role=><option key={`asq:${role}`} value={`asq:${role}`}>ASQ / ASEQ — {asqRoleLabels[role]} — {t.patientReady?"Available":"Patient release pending"}</option>):[<option key={t.value} value={t.value}>{t.label} — {t.patientReady?"Available":"Patient release pending"}</option>])}
     </select>
    </label>
    {form.testKey==='asq'&&<>
     <label>Patient / student this questionnaire concerns<select required value={form.patientId} onChange={e=>setForm(f=>({...f,patientId:e.target.value}))}><option value="">Select central patient record</option>{patients.map(p=><option key={p.id} value={p.id}>{[p.demographics.first_name,p.demographics.last_name].filter(Boolean).join(' ')||(Array.isArray(p.profiles)?p.profiles[0]?.full_name:p.profiles?.full_name)||'Patient demographics pending'} · {p.id.slice(0,8)}</option>)}</select></label>
     <p>The selected test version is assigned only to the individual named above at that email address. Create a separate assignment for each additional version or recipient, even when they concern the same patient.</p>
     {form.asqRole&&<p><Link href={'/assessment-preview/asq?version='+form.asqRole}>Preview {asqRoleLabels[form.asqRole as AsqRole]} recipient interface</Link></p>}
    </>}
    {isConnectedKey(form.testKey)&&<><label>Patient this questionnaire concerns<select required value={form.patientId} onChange={e=>setForm(f=>({...f,patientId:e.target.value}))}><option value="">Select central patient record</option>{patients.map(p=><option key={p.id} value={p.id}>{[p.demographics.first_name,p.demographics.last_name].filter(Boolean).join(' ')||'Patient demographics pending'} · {p.id.slice(0,8)}</option>)}</select></label><p>The named individual answers for this patient assignment. Demographics stay in the central patient record. A sent invitation provides 14 days from provider acceptance; inbox receipt is not confirmed.</p><p><Link href={'/assessment-preview/connected/'+form.testKey}>Preview questionnaire and report</Link></p></>}
    {form.testKey==='dsm'&&<><label>Patient this DSM questionnaire concerns<select required value={form.patientId} onChange={e=>{const p=patients.find(p=>p.id===e.target.value);setForm(f=>({...f,patientId:e.target.value,dob:p?.demographics.dob||'',dsmVersion:''}));}}><option value="">Select central patient record</option>{patients.map(p=><option key={p.id} value={p.id}>{[p.demographics.first_name,p.demographics.last_name].filter(Boolean).join(' ')||'Patient demographics pending'} · {p.id.slice(0,8)}</option>)}</select></label><p>Adult: all six tiers, with Tiers 2–6 for the domains selected by Tier 1. Adolescent and parent/guardian: Tier 1 only; youth follow-up is completed with the clinician. Clinical interpretation and diagnostic decisions remain with the clinician. The recipient cannot change versions.</p><DsmVersionChoice recipientReady value={form.dsmVersion} onChange={v=>setForm(f=>({...f,dsmVersion:v}))} dob={form.dob} disabled={busy} required/></>}
    <p className="assignmentCaution"><strong>Clinical release notice:</strong> {isConnectedKey(form.testKey)?'This questionnaire records individual responses for therapist review. Source scoring rules and interpretation limits accompany the report.':form.testKey==='dsm'?'DSM invitations record the assigned screening version for clinician review. This original screening tool does not establish or rule out diagnoses.':form.testKey==='asq'&&asqReleaseReady?'The ASQ/ASEQ recipient workflow is enabled. It records respondent answers for clinician review; it does not establish a diagnosis.':"Recipient release is pending for this questionnaire. Draft assignments and interface previews are available; invitations remain gated."}</p>
    <button type="submit" disabled={busy||loading||(form.testKey==='asq'&&!form.asqRole)}>{busy?"Saving…":"Save Assignment Draft"}</button>
   </form>
  </section>
  <section className="assignmentCard">
   <div className="assignmentStatusRow"><h2>Invitation status</h2><span className={emailReady?"deliveryConfigured":"deliveryOffline"}>{emailReady?"Email provider configured":"Secure email inactive"}</span></div>
   <p>Invitations are delivered through a transactional email provider. They do not contain the patient's name, birth date, assessment name, or results.</p>
   {!emailReady&&<p className="assignmentCaution">To activate patient email delivery, enroll with the healthcare email provider Paubox and verify your practice domain. Then configure <code>PAUBOX_API_KEY</code> and <code>TEST_INVITATION_FROM_EMAIL</code> as protected Vercel secrets. Once the signed BAA is confirmed and patient test release is approved, enable <code>PAUBOX_BAA_CONFIRMED</code> and <code>PATIENT_TEST_INVITATIONS_ENABLED</code>. No email is sent until all controls are satisfied.</p>}
   <h3>Recent assignments</h3>
   {loading?<p>Loading securely…</p>:assignments.length===0?<p>No assignments saved yet.</p>:
    <div className="assignmentTableWrap"><table className="assignmentTable">
     <thead><tr><th>Recipient</th><th>Test</th><th>Status</th><th>Action</th></tr></thead>
     <tbody>{assignments.map(a=><tr key={a.id}>
      <td><strong>{a.recipient_first_name} {a.recipient_last_name}</strong><small>{a.recipient_email}</small></td>
      <td>{tests.find(t=>t.value===a.test_key)?.label??a.test_key}{a.test_key==='asq'&&<><small>{a.asq_role?asqRoleLabels[a.asq_role]:'Legacy assignment — version not specified'}</small>{a.patient_id&&<small><Link href={'/emr?patient='+a.patient_id}>Patient record</Link></small>}</>}{a.test_key==='dsm'&&<><small>{dsmVersionLabel(a.dsm_version)}{a.dsm_version==='adult'?(a.dsm_format==='icps-dsm-recipient/2'?' · Tiers 1–6':' · Earlier Tier 1–2 version'):' · Tier 1 only'}</small>{a.patient_id&&<small><Link href={'/emr/dsm?patient='+a.patient_id}>Patient DSM results</Link></small>}</>}</td>
      <td>{a.connected_progress&&<small>{a.connected_progress.status==='submitted'?'Questionnaire submitted':'In progress'} · {a.connected_progress.answered_count} answers saved · revision {a.connected_progress.revision}</small>}{a.dsm_progress&&<small>{a.dsm_progress.status==='submitted'?'Questionnaire submitted':'In progress'} · {a.dsm_progress.answered_count} answers saved · revision {a.dsm_progress.revision}</small>}{a.asq_progress&&<small>{a.asq_progress.status==='submitted'?'Questionnaire submitted':'In progress'} · {a.asq_progress.answered_count} answers saved · revision {a.asq_progress.revision}</small>}<span className="assignmentPill">{a.status==="sent"?"Email accepted":"Draft — not sent"}</span></td>
      <td>{a.status==="draft"?<button disabled={busy||!emailReady||!tests.find(t=>t.value===a.test_key)?.patientReady||(a.test_key==='asq'&&!a.asq_role)||(a.test_key==='dsm'&&!a.dsm_source_hash)||(!isConnectedKey(a.test_key)&&Date.parse(a.expires_at)<=Date.now())||(isConnectedKey(a.test_key)&&!a.connected_source_hash)}
       onClick={()=>setConfirmInvitation(a.id)}>Send Invitation</button>:<span>Sent</span>}{confirmInvitation===a.id&&<div role="group" aria-label="Confirm assessment invitation">
       <p>Send a secure invitation to <strong>{a.recipient_email}</strong>? Only this recipient can open the assigned version.</p>
       <button type="button" onClick={()=>setConfirmInvitation(null)} autoFocus>Cancel invitation send</button>
       <button type="button" disabled={busy||!emailReady} onClick={()=>void send(a)}>Confirm and send invitation</button>
      </div>}{isConnectedKey(a.test_key)&&a.connected_source_hash&&<p><Link href={'/admin/assign-test/connected-responses/'+a.id}>View responses / clinical report / PDF</Link>{a.status==='sent'&&<small>Expires {new Date(a.expires_at).toLocaleString('en-US',{timeZone:'America/Chicago'})} Central</small>}</p>}{a.test_key==='dsm'&&!a.dsm_source_hash&&<small>Create a new DSM draft to link the patient and questionnaire version.</small>}{a.test_key==='dsm'&&a.dsm_source_hash&&<p><Link href={'/admin/assign-test/dsm-responses/'+a.id}>View DSM responses / evaluation</Link>{a.status==='sent'&&<small><Link href={'/patient/assigned-tests/'+a.id}>Assigned recipient link</Link></small>}</p>}{a.test_key==='asq'&&a.asq_role&&a.status==='sent'&&<p><Link href={'/patient/assigned-tests/'+a.id}>Assigned recipient link</Link><small>Only the invited account can open this questionnaire.</small></p>}{a.test_key==='asq'&&a.asq_role&&<p><Link href={'/admin/assign-test/asq-responses/'+a.id}>{a.asq_progress?.status==='submitted'?'Evaluate / view results':'View recorded responses'}</Link></p>}</td>
     </tr>)}</tbody>
    </table></div>}
   <p className="assignmentHelp">Patients must sign in using the invited email address and complete required security verification. An invitation is not proof of identity and never overrides access rules.</p>
  </section>
  {(message||error)&&<div className={error?"assignmentFeedbackError":"assignmentFeedback"} role={error?"alert":"status"}>{error||message}</div>}
 </div>;
}
