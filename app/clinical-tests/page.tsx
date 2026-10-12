import Link from "next/link";
import { patientAccess } from "@/lib/patient/access";
import { clinicalDevScreenList } from "@/lib/clinical-tests/catalog";

export default async function ClinicalTestsPage() {
  await patientAccess(true);
  return (
    <main className="authPage" style={{ maxWidth: 1050, margin: "0 auto", padding: "24px" }}>
      <Link href="/account">← Account</Link>
      <h1>Clinical psychological testing — migration workspace</h1>
      <p>This workspace is separate from ConscienceOS X's 21-assessment governance suite.</p>
      <p role="alert" style={{ background: "#fff7ed", color: "#7c2d12", padding: 12, border: "1px solid #fed7aa" }}>
        Internal administrator testing only. Do not use these developmental screening prototypes for diagnosis or real patients.
        No permanent clinical results database is connected.
      </p>
      <h2>DSM-aligned symptom screening: Level 1 and Level 2</h2>
      <ul>{clinicalDevScreenList.map(([key, label]) => (
        <li key={key}><Link href={`/clinical-tests/dev/${key}`}>{label}</Link></li>
      ))}</ul>
      <h2>Self-Esteem — CSEQ</h2>
      <p><Link href="/clinical-tests/cseq">Open CSEQ questionnaire</Link> · <Link href="/clinical-tests/cseq/results">Review CSEQ results</Link></p>
      <h2>Other independent assessment suites</h2>
      <p>ASQ/ASEQ, SRRCI-X, RTAFI, RDII, RVTI, autism/ADHD screeners, and their reports remain in dependency review.
        They must not be linked here as working assessments until administration, scoring, storage,
        consent, and permissions have migrated.</p>
    </main>
  );
}
