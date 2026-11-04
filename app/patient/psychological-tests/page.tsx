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
] as const;

export default async function PatientPsychologicalTestsPage() {
  // This is patient-facing navigation, NOT a bypass around the
  // administrator-only prototype modules in /clinical-tests.
  const {supabase,user}=await patientAccess();
  const {data:assignments,error}=await supabase.from('psych_test_assignments').select('id,test_key,expires_at').eq('status','sent').eq('recipient_email',user.email?.toLowerCase()??'').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false});

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
          <h2 id="patient-tests-notice">Your assigned questionnaires</h2>
          <p>Open a questionnaire assigned to your verified email below. Your therapist selects the patient record and version; you do not need to re-enter demographics.</p>
          <p>Save progress before closing. New CSEQ, SRRCI-X, RTAFI, RDII and RVTI invitations allow fourteen days from email-provider acceptance. The exact deadline appears in your assignment; inbox receipt is not confirmed. Contact the office if you need a new invitation.</p>
          {error?<p role="alert">Your assignments could not be loaded. Please retry or contact the office.</p>:assignments?.some(a=>a.test_key!=='cogswitch')?<ul>{assignments.filter(a=>a.test_key!=='cogswitch').map(a=><li key={a.id}><Link href={'/patient/assigned-tests/'+a.id}>Open {migratedSuites.find(s=>s[0].toLowerCase().startsWith(a.test_key))?.[0]??a.test_key.toUpperCase()} questionnaire</Link> · Available until {new Date(a.expires_at).toLocaleString('en-US',{timeZone:'America/Chicago'})} Central Time</li>)}</ul>:<p>No current invitations are available for this email. Contact your therapist if you expected an assignment.</p>}
          <Link className="patientTestsIntakeLink" href="/patient/intake">Open Intake Questionnaire</Link>
        </section>
        <section className="patientTestsLibrary" aria-labelledby="patient-tests-library">
          <h2 id="patient-tests-library">Relocated testing library</h2>
          <p>Your therapist selects the questionnaire that fits the assessment plan. Use only the individual invitation assigned to you.</p>
          <div className="patientTestsGrid">
            {migratedSuites.map(([name, description]) => (
              <article className="patientTestsItem" key={name}>
                <h3>{name}</h3>
                <p>{description}</p>
                <span>Therapist assignment required</span>
              </article>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}