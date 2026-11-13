import {isConnectedKey} from '@/lib/clinical-tests/connected/definition';
import "./emr-assignment.css";
import Link from "next/link";
import {patientAccess} from "@/lib/patient/access";
import TestAssignmentClient from "./TestAssignmentClient";

export const metadata={title:"Assign Psychological Test | Indian Creek"};
export default async function AssignTestPage({searchParams}:{searchParams:Promise<{test?:string;patient?:string}>}){
  const params=await searchParams;
  await patientAccess(true,"/admin/assign-test");
  return <main className="authPage assignmentPage emrAssignmentPage">
    <div className="assignmentWrap"><div className="emrAssignmentBanner"><span>Indian Creek Psychological Services · Clinical workspace</span><a href="/emr" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open EMR</a></div>
      <div className="assignmentTop">
        <Link href="/admin/questionnaires">← Questionnaire Center</Link> <Link href="/admin/paubox-test">Paubox Email Diagnostic</Link>
        <p className="eyebrow">Administrator · MFA required</p>
        <h1>Patient Questionnaire Assignment</h1>
        {params.patient&&<p><Link href={'/admin/assign-test/completed?patient='+encodeURIComponent(params.patient)}>View this patient’s assigned and completed assessments</Link></p>}
        <p>Assign a questionnaire to a named individual and email. For ASQ/ASEQ, choose Student / Self, Parent or Teacher and the central patient record it concerns.</p>
      </div>
      <TestAssignmentClient initialTestKey={(['asq','dsm'].includes(params.test??'')||isConnectedKey(params.test))?params.test:''} initialPatientId={params.patient??''}/>
    </div>
  </main>;
}
