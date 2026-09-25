"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  fullName: string;
  preferredName: string;
};

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
    <section className="accountGrid">
      <div className="accountPanel">
        <p className="eyebrow">Account profile</p>
        <h1>Welcome to your account</h1>
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
        <h2>General account only</h2>
        <p>This first account layer stores basic website identity information only. Clinical records, diagnoses, treatment notes, assessment responses, and other protected health information are intentionally not stored in this profile table.</p>
      </aside>
    </section>
  );
}
