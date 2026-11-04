import Link from "next/link";
import {notFound} from "next/navigation";
import {patientAccess} from "@/lib/patient/access";
import {dsmVersionLabel} from '@/lib/clinical-tests/dsm/entry-choice';
import {assignedTestLabel} from "@/lib/clinical-tests/assignments";

import DsmRecipient from '@/app/components/dsm/DsmRecipient';
import AsqRecipient from '@/app/components/asq/AsqRecipient';
import {asqRecipientReleaseApproved} from '@/lib/clinical-tests/asq/recipient-access';
import '@/app/components/asq/asq-recipient.css';

export const dynamic="force-dynamic";
export default async function AssignedTestPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id))notFound();
  const destination="/patient/assigned-tests/"+id;
  const {supabase,user,role}=await patientAccess(false,destination);
  const {data:asq,error:asqError}=await supabase.from('psych_test_assignments').select('id,test_key,asq_role,dsm_source_hash,status,expires_at,recipient_email').eq('id',id).maybeSingle();
  if(!asqError&&asq?.test_key==='asq'&&asq.asq_role&&asq.status==='sent'&&Date.parse(asq.expires_at)>Date.now()&&asq.recipient_email===user.email?.toLowerCase())return <main className="asqRecipient"><header className="asqRecipientHeader"><img src="/images/indian-creek-full-color-logo.png" width="300" height="200" alt="Indian Creek Psychological Services"/><div className="asqRecipientAccount"><span>Secure assigned questionnaire</span><a href="/account">Account and sign-out</a></div></header>{asqRecipientReleaseApproved()?<AsqRecipient key={id} id={id}/>:<><h1>ASQ / ASEQ assignment</h1><p>The practice is preparing recipient access. Please contact the office before starting this questionnaire.</p></>}<p>Questions or interruptions? Contact the office at 913-353-6116.</p></main>;
  if(!asqError&&asq?.test_key==='dsm'&&asq.dsm_source_hash&&asq.status==='sent'&&Date.parse(asq.expires_at)>Date.now()&&asq.recipient_email===user.email?.toLowerCase())return <main className="asqRecipient"><header className="asqRecipientHeader"><img src="/images/indian-creek-full-color-logo.png" width="300" height="200" alt="Indian Creek Psychological Services"/><div className="asqRecipientAccount"><span>Secure assigned questionnaire</span><a href="/account">Account and sign-out</a></div></header><DsmRecipient key={id} id={id}/><p>Questions or interruptions? Contact the office at 913-353-6116.</p></main>;
  if(role!=="patient")return <main className="authPage"><div className="assignmentPatientCard">
    <h1>Patient account required</h1>
    <p>Sign in with a verified Patient account using the invited email address. This administrator account cannot access a patient's assigned test.</p>
    <Link href="/account">Account settings</Link></div></main>;
  const {data,error}=await supabase.from("psych_test_assignments")
    .select("id,recipient_email,test_key,dsm_version,status,expires_at")
    .eq("id",id).maybeSingle();
  if(error||!data||data.status!=="sent"||Date.parse(data.expires_at)<=Date.now()||
    data.recipient_email!==user.email?.toLowerCase())notFound();
  return <main className="authPage"><div className="assignmentPatientCard">
    <p className="eyebrow">Indian Creek Psychological Services</p>
    <h1>Secure psychological test assignment</h1>
    <p>Your practice has prepared an assignment for <strong>{assignedTestLabel(data.test_key)}</strong>.</p>
    {data.test_key==='dsm'&&<p><strong>Questionnaire version:</strong> {dsmVersionLabel(data.dsm_version)}</p>}
    <p><strong>Assignment available until:</strong> {new Date(data.expires_at).toLocaleString("en-US",{dateStyle:"long",timeStyle:"short",timeZone:"America/Chicago"})} Central Time.</p>
    <p>When your assessment is available for completion, use a quiet, private space with a reliable internet connection and set aside uninterrupted time. Follow the instructions in the assessment itself. Do not share your assignment link or have anyone else answer for you.</p>
    <p>If you experience a technical problem, are interrupted, or need more time, contact the office before the assignment expires.</p>
    <p><strong>This questionnaire has not yet been released for patient completion.</strong> Your assignment is visible here, but the underlying testing form remains restricted to the clinical testing environment until its patient permissions, validation and recording process are approved.</p>
    <p>Please contact the office at 913-353-6116 if you need assistance.</p>
    <Link href="/patient/psychological-tests">Return to Psychological Tests</Link>
  </div></main>;
}
