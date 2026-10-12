import Link from "next/link";
import { patientAccess } from "@/lib/patient/access";
import SelfEsteemQuestionnaire from "@/lib/clinical-tests/legacy/selfesteem/SelfEsteemQuestionnaire";
export default async function CseqPage() {
  await patientAccess(true);
  return <main className="authPage" style={{maxWidth:1050,margin:"auto",padding:24}}>
    <Link href="/clinical-tests">← Clinical testing library</Link>
    <h1>Comprehensive Self-Esteem Quotient Questionnaire (CSEQ)</h1>
    <p role="alert">Administrator-only synthetic testing. No clinical records are saved; do not enter real patient information.</p>
    <SelfEsteemQuestionnaire />
    <Link href="/clinical-tests/cseq/results">Review CSEQ results</Link>
  </main>;
}
