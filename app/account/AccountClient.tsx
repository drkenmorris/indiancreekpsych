"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  fullName: string;
  preferredName: string;
};

const portalModules = [
  {
    title: "Appointments",
    description: "Online scheduling and appointment requests will live here once the scheduling workflow is configured.",
    status: "Planned",
  },
  {
    title: "Assessments",
    description: "Assigned questionnaires and assessments will be available through a protected workflow.",
    status: "Planned",
  },
  {
    title: "Resources",
    description: "Practice resources, forms, and educational materials can be delivered through this account.",
    status: "Foundation ready",
  },
  {
    title: "Records",
    description: "Appropriate client records will require a separate protected-health-information security design before activation.",
    status: "Security design required",
  },
];

export default function AccountClient({ email, fullName: initialFullName, preferredName: initialPreferredName }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [preferredName, setPreferredName] = useState(initialPreferredName);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      setMessage("Your session could not be verified. Please sign in again.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      preferred_name: preferredName,
    }).eq("id", userId);

    setMessage(error ? error.message : "Profile updated.");
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="portalStack">
      <section className="accountGrid">
        <div className="accountPanel">
          <p className="eyebrow">Secure client account</p>
          <h1>{preferredName ? `Welcome, ${preferredName}` : "Welcome to your account"}</h1>
          <p className="accountEmail">{email}</p>
          <form className="authForm" onSubmit={save}>
            <label>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
            <label>Preferred name<input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} /></label>
            <button disabled={busy} type="submit">{busy ? "Saving…" : "Save profile"}</button>
          </form>
          {message && <p className="authMessage">{message}</p>}
          <button className="secondaryAction" type="button" onClick={signOut} disabled={busy}>Sign out</button>
        </div>

        <aside className="accountPanel accountNotice">
          <p className="eyebrow">Security boundary</p>
          <h2>General account foundation</h2>
          <p>
            This account currently stores basic website identity information only. Clinical records,
            diagnoses, treatment notes, assessment responses, and other protected health information
            are intentionally excluded until those workflows receive their own security design.
          </p>
          <Link className="portalHomeLink" href="/">Return to public site</Link>
        </aside>
      </section>

      <section className="portalModules" aria-label="Client portal modules">
        <div className="portalModulesHeading">
          <p className="eyebrow">Client portal</p>
          <h2>Your secure service areas</h2>
          <p>The account framework is active. Additional services will be enabled here as their workflows are completed.</p>
        </div>
        <div className="portalModuleGrid">
          {portalModules.map((module) => (
            <article className="portalModuleCard" key={module.title}>
              <span className="portalModuleStatus">{module.status}</span>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
