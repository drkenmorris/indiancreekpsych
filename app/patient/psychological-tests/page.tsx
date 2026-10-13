import Link from "next/link";
import PublicHeader from "@/app/components/PublicHeader";
import PublicFooter from "@/app/components/PublicFooter";
import { patientAccess } from "@/lib/patient/access";

const migratedSuites = [
  ["DSM symptom screening", "Level 1 and Level 2 screening modules"],
  ["CSEQ", "Comprehensive Self-Esteem Quotient Questionnaire"],
  ["ASQ / ASEQ", "Autism questionnaire suite"],
  ["SRRCI-X", "Relationship assessment"],
  ["RTAFI", "Relational trauma and attachment assessment"],
  ["RDII", "Relationship assessment and reporting module"],
  ["RVTI", "Relationship assessment dashboard"],
  ["CogSwitch", "Cognitive-motor switching assessment"],
] as const;

export default async function PatientPsychologicalTestsPage() {
  // This is patient-facing navigation, NOT a bypass around the
  // administrator-only prototype modules in /clinical-tests.
  await patientAccess();

  return (
    <div className="publicSite">
      <PublicHeader />
      <main className="patientTestsPage">
        <section className="patientTestsIntro">
          <p className="eyebrow">Patient account</p>
          <h1>Psychological Tests</h1>
          <p>The practice has relocated its independent psychological testing library to Indian Creek Psychological Services. This is your patient testing area.</p>
        </section>
        <section className="patientTestsNotice" aria-labelledby="patient-tests-notice">
          <h2 id="patient-tests-notice">Patient testing is not open yet</h2>
          <p>The relocated questionnaires are currently in administrator-only quality assurance. Patient test-taking, secure result storage, and clinician assignments are not enabled yet. Please do not enter clinical answers into testing prototypes.</p>
          <p>When individual assessments are cleared for patient administration, they can be made available securely from this page.</p>
          <Link className="patientTestsIntakeLink" href="/patient/intake">Open Intake Questionnaire</Link>
        </section>
        <section className="patientTestsLibrary" aria-labelledby="patient-tests-library">
          <h2 id="patient-tests-library">Relocated testing library</h2>
          <p>These modules are listed for reference. They are not currently available for patient submission.</p>
          <div className="patientTestsGrid">
            {migratedSuites.map(([name, description]) => (
              <article className="patientTestsItem" key={name}>
                <h3>{name}</h3>
                <p>{description}</p>
                <span>In preparation</span>
              </article>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
