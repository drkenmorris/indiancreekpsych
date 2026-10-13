import Link from "next/link";
import { patientAccess } from "@/lib/patient/access";
import { clinicalDevScreenList } from "@/lib/clinical-tests/catalog";
import { clinicalTestSuites } from "@/lib/clinical-tests/menu-catalog";

const categories = [
  { key: "Screening & self-esteem", label: "Screening and self-esteem", suiteKeys: ["dsm", "cseq"] },
  { key: "Neurodevelopmental", label: "Autism and neurodevelopmental", suiteKeys: ["asq"] },
  { key: "Relationships", label: "Relationships and attachment", suiteKeys: ["srrci", "rtafi", "rdii", "rvti"] },
  { key: "Cognitive", label: "Cognitive-motor assessment", suiteKeys: ["cogswitch"] },
] as const;

export default async function ClinicalTestsPage() {
  await patientAccess(true, "/clinical-tests");
  return (
    <main className="clinicalTestDashboard">
      <header className="clinicalDashboardIntro">
        <p className="eyebrow">Testing library / migration workspace</p>
        <h1>Clinical Psychological Tests</h1>
        <p>Select a suite to open its organized questionnaire and analysis sections.
          Use the navigation bar above to switch suites at any time.</p>
      </header>
      <aside className="clinicalQaBanner" role="note">
        <strong>Administrator-only development and quality assurance.</strong>
        These migrated instruments are prototypes, not validated diagnostic or patient-use services.
        Do not enter real patient data. Scores and responses are not saved to permanent clinical records or Supabase.
      </aside>
      {categories.map(category => (
        <section className="clinicalSuiteSection" key={category.key} aria-label={category.label}>
          <h2>{category.label}</h2>
          <div className="clinicalSuiteGrid">
            {clinicalTestSuites.filter(suite => (category.suiteKeys as readonly string[]).includes(suite.key)).map(suite => (
              <article className="clinicalSuiteCard" key={suite.key}>
                <span className="suiteCategory">{suite.area}</span>
                <h3>{suite.label}</h3>
                <p>{suite.description}</p>
                <small>{suite.stages}</small>
                <Link href={suite.href}>Open {suite.short} →</Link>
              </article>
            ))}
          </div>
        </section>
      ))}
      <section className="clinicalSuiteSection" aria-labelledby="dsm-modules-heading">
        <h2 id="dsm-modules-heading">DSM screening modules</h2>
        <details className="clinicalDsmModulePicker">
          <summary>Browse all {clinicalDevScreenList.length} Level 1 and Level 2 modules</summary>
          <ul className="clinicalDsmList">
            {clinicalDevScreenList.map(([key, label]) => (
              <li key={key}><Link href={`/clinical-tests/dev/${key}`}>{label} →</Link></li>
            ))}
          </ul>
        </details>
      </section>
      <p className="clinicalQaBanner" role="note">
        Additional autism/ADHD registry assessment prototypes remain in dependency review.
        They are not represented as working, patient-ready instruments until their scoring,
        permissions, consent and secure storage are verified.
      </p>
    </main>
  );
}
