"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import AuthMenuAction from "../components/AuthMenuAction";

export default function RegisterPage() {
  const [registrationType, setRegistrationType] = useState<"guest" | "patient">("guest");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setMessage("Please enter both your first and last name.");
      return;
    }
    setBusy(true);
    setMessage("");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          registration_type: registrationType,
          newsletter_consent: newsletterConsent,
          newsletter_frequency: "biweekly",
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
      },
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    if (data.session) {
      window.location.assign("/account");
      return;
    }

    setMessage("Check your email to confirm your account. Then return to Account to sign in. Patient services require additional security verification.");
    setBusy(false);
  }

  return (
    <div className="icp-shell accountPortalShell">
      <header className="icp-top-menu">
        <Link className="icp-brand" href="/">Indian Creek Psychological Services</Link>
      </header>
      <main className="icp-shell-center authPage">
        <section className="authCard accountRegistrationCard">
          <p className="eyebrow">Indian Creek account</p>
          <h1>Create your account</h1>
          <p>Choose Guest to receive practice information or Patient to access intake and patient services after email and security verification.</p>
          <form onSubmit={handleSubmit} className="authForm">
            <label>Account type
              <select value={registrationType} onChange={e => setRegistrationType(e.target.value as "guest" | "patient")}>
                <option value="guest">Guest account</option>
                <option value="patient">Patient account</option>
              </select>
            </label>
            <div className="accountNameFields">
              <label>First name<input type="text" autoComplete="given-name" maxLength={80} value={firstName} onChange={e => setFirstName(e.target.value)} required /></label>
              <label>Last name<input type="text" autoComplete="family-name" maxLength={80} value={lastName} onChange={e => setLastName(e.target.value)} required /></label>
            </div>
            <label>Email<input type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} required /></label>
            <label>Password<input type="password" autoComplete="new-password" minLength={12} value={password} onChange={e => setPassword(e.target.value)} required /><small>Use at least 12 characters. You can add authenticator verification and a passkey after confirming your email.</small></label>
            <label className="newsletterConsent">
              <span><input type="checkbox" checked={newsletterConsent} onChange={e => setNewsletterConsent(e.target.checked)} /> Email me the Indian Creek newsletter every two weeks (optional).</span>
            </label>
            <button type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
          </form>
          {message && <p className="authMessage" role="status">{message}</p>}
          <p className="authSwitch">Already registered? <Link href="/login?next=/account">Sign in</Link>.</p>
          <p className="accountPrivacyNote">Please do not enter health or treatment information during registration. Patient intake is in a separate protected questionnaire.</p>
        </section>
      </main>
      <nav className="icp-bottom-menu" aria-label="Site navigation"><Link href="/">Home</Link><Link href="/account">Account</Link><AuthMenuAction /></nav>
    </div>
  );
}
