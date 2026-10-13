import Link from "next/link";
import {patientAccess} from "@/lib/patient/access";
import TestAssignmentClient from "./TestAssignmentClient";

export const metadata={title:"Assign Psychological Test | Indian Creek"};
export default async function AssignTestPage(){
  await patientAccess(true,"/admin/assign-test");
  return <main className="authPage assignmentPage">
    <div className="assignmentWrap">
      <div className="assignmentTop">
        <Link href="/admin/questionnaires">← Questionnaire Center</Link>
        <p className="eyebrow">Administrator · MFA required</p>
        <h1>Assign a Psychological Test</h1>
        <p>Create a secure assignment using a patient's first and last name, email address, date of birth, and an assessment from the practice's library.</p>
      </div>
      <TestAssignmentClient/>
    </div>
  </main>;
}
