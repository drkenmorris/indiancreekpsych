import Link from "next/link";
import {notFound} from "next/navigation";
import {patientAccess} from "@/lib/patient/access";
import {assignedTestLabel} from "@/lib/clinical-tests/assignments";

export const dynamic="force-dynamic";
export default async function AssignedTestPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id))notFound();
  const destination="/patient/assigned-tests/"+id;
  const {supabase,user,role}=await patientAccess(false,destination);
  if(role!=="patient")return <main className="authPage"><div className="assignmentPatientCard">
    <h1>Patient account required</h1>
    <p>Sign in with a verified Patient account using the invited email address. This administrator account cannot access a patient's assigned test.</p>
    <Link href="/account">Account settings</Link></div></main>;
  const {data,error}=await supabase.from("psych_test_assignments")
    .select("id,recipient_email,test_key,status,expires_at")
    .eq("id",id).maybeSingle();
  if(error||!data||data.status!=="sent"||Date.parse(data.expires_at)<=Date.now()||
    data.recipient_email!==user.email?.toLowerCase())notFound();
  return <main className="authPage"><div className="assignmentPatientCard">
    <p className="eyebrow">Indian Creek Psychological Services</p>
    <h1>Secure psychological test assignment</h1>
    <p>Your practice has prepared an assignment for <strong>{assignedTestLabel(data.test_key)}</strong>.</p>
    <p><strong>Assignment available until:</strong> {new Date(data.expires_at).toLocaleString("en-US",{dateStyle:"long",timeStyle:"short",timeZone:"America/Chicago"})} Central Time.</p>
    <p>When your assessment is available for completion, use a quiet, private space with a reliable internet connection and set aside uninterrupted time. Follow the instructions in the assessment itself. Do not share your assignment link or have anyone else answer for you.</p>
    <p>If you experience a technical problem, are interrupted, or need more time, contact the office before the assignment expires.</p>
    <p><strong>This questionnaire has not yet been released for patient completion.</strong> Your assignment is visible here, but the underlying testing form remains restricted to the clinical testing environment until its patient permissions, validation and recording process are approved.</p>
    <p>Please contact the office at 913-353-6116 if you need assistance.</p>
    <Link href="/patient/psychological-tests">Return to Psychological Tests</Link>
  </div></main>;
}
