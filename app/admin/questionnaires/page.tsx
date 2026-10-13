import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const tools = [
  {
    key: "preview",
    title: "Open Patient Questionnaire Preview",
    type: "Safe field testing",
    href: "/admin/intake-preview",
    description: "Enter fictional answers in the complete patient intake questionnaire. Check every section, input, and navigation control without storing clinical data.",
    button: "Test all questionnaire fields",
  },
  {
    key: "records",
    title: "Review Submitted Questionnaires",
    type: "Protected clinical records",
    href: "/admin/intakes",
    description: "Review authorized submitted patient questionnaires and consent documents. Second-factor verification is required.",
    button: "Review submissions",
  },
  {
    key: "kiosk",
    title: "Office Intake Questionnaire",
    type: "Front-desk workflow",
    href: "/admin/intake-kiosk",
    description: "Create an office questionnaire session. Use clearly fictional information when testing save and submit functions.",
    button: "Start office intake",
  },
] as const;

export default async function AdminQuestionnairesPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) redirect("/login?next=%2Fadmin%2Fquestionnaires");

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("account_type").eq("id", user.id).maybeSingle();
  if (profileError || !profile || !["admin", "staff"].includes(profile.account_type)) {
    redirect("/account");
  }

  const isAdmin = profile.account_type === "admin";
  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const isAal2 = assurance?.currentLevel === "aal2";

  return (
    <main className="authPage adminQuestionnaireHub">
      <section className="adminQuestionnaireIntro">
        <p className="eyebrow">Indian Creek Psychological Services</p>
        <h1>Questionnaires and Testing</h1>
        <p>Authorized office access to the psychological testing library and the complete patient intake questionnaire.</p>
        {!isAal2 && (
          <p className="adminQuestionnaireSecurity">
            Your current session has not completed second-factor verification.
            Clinical test administration and patient records require MFA.
            <Link href="/account/security?next=%2Fadmin%2Fquestionnaires"> Verify this session →</Link>
          </p>
        )}
      </section>
      <section className="adminQuestionnaireCards" aria-label="Available administrative questionnaires">
        {isAdmin && (
          <article className="adminQuestionnaireCard adminPsychTestsCard">
            <span>Administrator · Patient invitations</span>
            <h2>Assign Psychological Tests</h2>
            <p>Create a patient assessment assignment with first and last name, email, date of birth, and a test selected from the library. Review invitation delivery readiness before emailing.</p>
            <Link href="/admin/assign-test">Open test assignment center →</Link>
          </article>
        )}
        {isAdmin && (
          <article className="adminQuestionnaireCard adminPsychTestsCard">
            <span>Administrator-only testing</span>
            <h2>Psychological Testing Library</h2>
            <p>Open the relocated DSM screening modules, CSEQ, ASQ/ASEQ, SRRCI-X, RTAFI, RDII, RVTI, and CogSwitch. Their internal questionnaires and reports remain synthetic QA tools.</p>
            <Link href="/clinical-tests">Open psychological tests →</Link>
          </article>
        )}
        {tools.map(tool => (
          <article key={tool.key} className="adminQuestionnaireCard">
            <span>{tool.type}</span>
            <h2>{tool.title}</h2>
            <p>{tool.description}</p>
            <Link href={tool.href}>{tool.button} →</Link>
          </article>
        ))}
        {isAdmin && (
          <article className="adminQuestionnaireCard">
            <span>Administrator-only tools</span>
            <h2>Temporary Test Patient Accounts</h2>
            <p>Use controlled, synthetic Patient accounts to test the full patient workflow and secure draft saving. Never use real patient information for quality assurance.</p>
            <Link href="/admin/test-accounts">Manage test accounts →</Link>
          </article>
        )}
      </section>
      <div className="adminQuestionnaireHelp">
        <strong>Patient questionnaires are not administered inside an administrator's own patient record.</strong>
        {" "}Use the editable preview to exercise every field, the office intake to test a new session,
        or a properly assigned temporary Patient account for end-to-end testing. Submitted records remain protected.
      </div>
      <p><Link href="/account">← Return to Account</Link></p>
    </main>
  );
}
