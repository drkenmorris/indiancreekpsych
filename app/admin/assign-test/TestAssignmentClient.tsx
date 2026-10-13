"use client";
import {useEffect,useState,type FormEvent} from "react";

type Test={value:string;label:string;patientReady:boolean};
type Assignment={
  id:string;recipient_first_name:string;recipient_last_name:string;
  recipient_email:string;test_key:string;status:string;created_at:string;
  expires_at:string;sent_at:string|null;
};
const defaults={firstName:"",lastName:"",email:"",dob:"",testKey:""};
export default function TestAssignmentClient(){
 const [form,setForm]=useState(defaults);
 const [tests,setTests]=useState<Test[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [emailReady,setEmailReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);

 async function load(){
  const response=await fetch("/api/admin/test-assignments",{cache:"no-store"});
  const json=await response.json();
  if(!response.ok)throw Error(json.error??"Unable to load assignments.");
  setTests(json.tests);
  setAssignments(json.assignments);
  setEmailReady(Boolean(json.deliveryReady));
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
     (emailReady?"Use Send Invitation on its row to email the secure link.":"Email delivery must be configured before invitations can be sent."));
  }catch(e){setError(e instanceof Error?e.message:"Could not create assignment.");}
  finally{setBusy(false);}
 }
 async function send(item:Assignment){
  if(busy)return;
  if(!window.confirm("Send a secure invitation to "+item.recipient_email+
    "? The patient will be able to view the assignment after verified sign-in, but the migrated testing forms are not yet released for patient completion."))return;
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
   <p>Enter the intended recipient's details. The date of birth is stored securely for patient matching and is never included in the invitation email.</p>
   <form className="assignmentForm" onSubmit={create}>
    <div className="assignmentTwoFields">
     <label>First name<input required autoComplete="off" maxLength={100} value={form.firstName}
       onChange={e=>setForm(f=>({...f,firstName:e.target.value}))}/></label>
     <label>Last name<input required autoComplete="off" maxLength={100} value={form.lastName}
       onChange={e=>setForm(f=>({...f,lastName:e.target.value}))}/></label>
    </div>
    <label>Patient email address<input type="email" required maxLength={254} autoComplete="off"
      value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
      placeholder="patient@example.com"/></label>
    <label>Date of birth<input type="date" required min="1900-01-01" max={new Date().toISOString().slice(0,10)}
      value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))}/></label>
    <label>Psychological test
     <select required value={form.testKey} onChange={e=>setForm(f=>({...f,testKey:e.target.value}))}>
      <option value="">Select a test</option>
      {tests.map(t=><option key={t.value} value={t.value}>{t.label} — {t.patientReady?"Available":"Patient release pending"}</option>)}
     </select>
    </label>
    <p className="assignmentCaution"><strong>Clinical release notice:</strong> The relocated psychological tests are still administrator-only prototypes. Creating an assignment does not allow a patient to complete an unapproved test. An invitation provides access to a secure assignment page only.</p>
    <button type="submit" disabled={busy||loading}>{busy?"Saving…":"Save Assignment Draft"}</button>
   </form>
  </section>
  <section className="assignmentCard">
   <div className="assignmentStatusRow"><h2>Invitation status</h2><span className={emailReady?"deliveryConfigured":"deliveryOffline"}>{emailReady?"Email provider configured":"Email not configured"}</span></div>
   <p>Invitations are delivered through a transactional email provider. They do not contain the patient's name, birth date, assessment name, or results.</p>
   {!emailReady&&<p className="assignmentCaution">To activate actual email delivery, configure <code>RESEND_API_KEY</code> and <code>TEST_INVITATION_FROM_EMAIL</code> as secure Vercel environment variables. Use an authenticated, verified sender domain. No message is sent until this is configured.</p>}
   <h3>Recent assignments</h3>
   {loading?<p>Loading securely…</p>:assignments.length===0?<p>No assignments saved yet.</p>:
    <div className="assignmentTableWrap"><table className="assignmentTable">
     <thead><tr><th>Recipient</th><th>Test</th><th>Status</th><th>Action</th></tr></thead>
     <tbody>{assignments.map(a=><tr key={a.id}>
      <td><strong>{a.recipient_first_name} {a.recipient_last_name}</strong><small>{a.recipient_email}</small></td>
      <td>{tests.find(t=>t.value===a.test_key)?.label??a.test_key}</td>
      <td><span className="assignmentPill">{a.status==="sent"?"Email accepted":"Draft — not sent"}</span></td>
      <td>{a.status==="draft"?<button disabled={busy||!emailReady||Date.parse(a.expires_at)<=Date.now()}
       onClick={()=>void send(a)}>Send Invitation</button>:<span>Sent</span>}</td>
     </tr>)}</tbody>
    </table></div>}
   <p className="assignmentHelp">Patients must sign in using the invited email address and complete required security verification. An invitation is not proof of identity and never overrides access rules.</p>
  </section>
  {(message||error)&&<div className={error?"assignmentFeedbackError":"assignmentFeedback"} role={error?"alert":"status"}>{error||message}</div>}
 </div>;
}
