"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newsletterConsent, setNewsletterConsent] = useState(true);
  const [newsletterFrequency, setNewsletterFrequency] = useState<"weekly" | "biweekly">("biweekly");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const supabase = createClient();
    const origin = window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {\n          full_name: fullName,\n          newsletter_consent: newsletterConsent,\n          newsletter_frequency: newsletterFrequency,\n        },
        emailRedirectTo: `${origin}/auth/callback?next=/account`,
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

    setMessage("Check your email to confirm your account, then return here to sign in.");
    setBusy(false);
  }

  return (
    <div className="icp-shell">
      <header className="icp-top-menu">
        <div className="icp-top-menu-left">
          <Link className="icp-brand" href="/">
            <span className="icp-brand-mark">IC</span>
            <span className="icp-brand-copy"><strong>Indian Creek</strong><small>Psychological Services</small></span>
          </Link>
        </div>
      </header>
      <main className="icp-shell-center authPage">
        <section className="authCard">
          <p className="eyebrow">Secure client access</p>
          <h1>Create an account</h1>
          <p>This creates a guest website account. Patient access is granted separately by Indian Creek after a clinical relationship is established.</p>
          <form onSubmit={handleSubmit} className="authForm">
            <label>Full name<input type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
            <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Password<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>\n            <label className="newsletterConsent"><span><input type="checkbox" checked={newsletterConsent} onChange={(e) => setNewsletterConsent(e.target.checked)} /> Send me Indian Creek newsletters and practice updates.</span></label>\n            {newsletterConsent && (\n              <label>Newsletter frequency\n                <select value={newsletterFrequency} onChange={(e) => setNewsletterFrequency(e.target.value as "weekly" | "biweekly")}>\n                  <option value="biweekly">Every two weeks</option>\n                  <option value="weekly">Weekly</option>\n                </select>\n              </label>\n            )}\n            <button type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
          </form>
          {message && <p className="authMessage" role="status">{message}</p>}
          <p className="authSwitch">Already registered? <Link href="/login">Sign in</Link></p>
        </section>
      </main>
      <nav className="icp-bottom-menu" aria-label="Site navigation"><Link href="/">Home</Link><Link href="/login">Login</Link></nav>
    </div>
  );
}
