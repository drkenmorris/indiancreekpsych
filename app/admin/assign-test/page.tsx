import "./emr-assignment.css";
import Link from "next/link";
import {patientAccess} from "@/lib/patient/access";
import TestAssignmentClient from "./TestAssignmentClient";

export const metadata={title:"Assign Psychological Test | Indian Creek"};
export default async function AssignTestPage(){
  await patientAccess(true,"/admin/assign-test");
  return <main className="authPage assignmentPage emrAssignmentPage">
    <div className="assignmentWrap"><div className="emrAssignmentBanner"><span>Indian Creek Psychological Services · Clinical workspace</span><a href="https://emr-workflow-demo.vercel.app/?module=questionnaires" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open EMR</a></div>
      <div className="assignmentTop">
        <Link href="/admin/questionnaires">← Questionnaire Center</Link> <Link href="/admin/paubox-test">Paubox Email Diagnostic</Link>
        <p className="eyebrow">Administrator · MFA required</p>
        <h1>Patient Questionnaire Assignment</h1>
        <p>Create a secure assignment using a patient's first and last name, email address, date of birth, and an assessment from the practice's library.</p>
      </div>
      <TestAssignmentClient/>
    </div>
  </main>;
}
