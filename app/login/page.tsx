"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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

    const next = searchParams.get("next") || "/account";
    router.replace(next);
    router.refresh();
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
          <h1>Sign in</h1>
          <p>Access your Indian Creek account. Clinical records and treatment information are not part of this initial account profile.</p>
          <form onSubmit={handleSubmit} className="authForm">
            <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>
          {message && <p className="authMessage" role="alert">{message}</p>}
          <p className="authSwitch">Need an account? <Link href="/register">Register</Link></p>
        </section>
      </main>
      <nav className="icp-bottom-menu" aria-label="Site navigation"><Link href="/">Home</Link><Link href="/register">Register</Link></nav>
    </div>
  );
}
