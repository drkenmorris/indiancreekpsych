import Link from "next/link";
import { patientAccess } from "@/lib/patient/access";
import SelfEsteemQuestionnaire from "@/lib/clinical-tests/legacy/selfesteem/SelfEsteemQuestionnaire";
import ClinicalStageMenu from "../ClinicalStageMenu";
export default async function CseqPage() {
  await patientAccess(true, "/clinical-tests/cseq");
  return <main className="authPage" style={{maxWidth:1050,margin:"auto",padding:24}}>
    <Link href="/clinical-tests">← Clinical testing library</Link>
    <h1>Comprehensive Self-Esteem Quotient Questionnaire (CSEQ)</h1>
    <p role="alert">Administrator-only synthetic testing. No clinical records are saved; do not enter real patient information.</p>
    <ClinicalStageMenu label="CSEQ questionnaire and scoring pages" activeKey="questionnaire" stages={[
      {key:"questionnaire",label:"Questionnaire",href:"/clinical-tests/cseq"},
      {key:"results",label:"Scoring and narrative",href:"/clinical-tests/cseq/results"}
    ]}/>
    <SelfEsteemQuestionnaire />
    <Link href="/clinical-tests/cseq/results">Review CSEQ results</Link>
  </main>;
}
