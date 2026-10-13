"use client";

import { safeNext } from "@/lib/patient/redirect";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthMenuAction from "../components/AuthMenuAction";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function afterLogin() {
    const supabase = createClient();
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      setMessage("Signed in, but your security level could not be checked. Please open Account.");
      router.replace("/account");
      router.refresh();
      return;
    }
    if (data.nextLevel === "aal2" && data.currentLevel !== "aal2") {
      router.replace(`/account/security?next=${encodeURIComponent(next)}`);
    } else {
      router.replace(next);
    }
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    await afterLogin();
    setBusy(false);
  }

  async function signInWithPasskey() {
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPasskey();
    if (error) {
      setMessage("Passkey sign-in could not be completed. Passkeys require an enrolled device and provider activation. " + error.message);
      setBusy(false);
      return;
    }
    await afterLogin();
    setBusy(false);
  }

  return (
    <div className="icp-shell accountPortalShell">
      <header className="icp-top-menu"><Link className="icp-brand" href="/">Indian Creek Psychological Services</Link></header>
      <main className="icp-shell-center authPage">
        <section className="authCard accountRegistrationCard">
          <p className="eyebrow">Secure account access</p>
          <h1>Sign in</h1>
          <p>Access your Guest or Patient account. A patient questionnaire requires additional verified security.</p>
          <form onSubmit={handleSubmit} className="authForm">
            <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"}</button>
          </form>
          <button type="button" className="accountPasskeyButton" disabled={busy} onClick={() => void signInWithPasskey()}>Sign in with passkey (if enabled)</button>
          {message && <p className="authMessage" role="alert">{message}</p>}
          <p className="authSwitch"><Link href="/forgot-password">Forgot your password?</Link></p>
          <p className="authSwitch">Need an account? <Link href="/account">Create a Guest or Patient account</Link></p>
        </section>
      </main>
      <nav className="icp-bottom-menu" aria-label="Site navigation"><Link href="/">Home</Link><Link href="/account">Account</Link><AuthMenuAction /></nav>
    </div>
  );
}
