import Link from "next/link";
import { patientAccess } from "@/lib/patient/access";
import CSEQResultsPage from "@/lib/clinical-tests/legacy/selfesteem/CSEQResultsPage";
export default async function CseqResultRoute() {
  await patientAccess(true);
  return <main className="authPage" style={{maxWidth:1050,margin:"auto",padding:24}}>
    <Link href="/clinical-tests/cseq">← Questionnaire</Link>
    <h1>CSEQ scoring and narrative</h1>
    <p role="alert">Internal QA only; results are not a patient record or a validated clinical diagnosis.</p>
    <CSEQResultsPage />
  </main>;
}
