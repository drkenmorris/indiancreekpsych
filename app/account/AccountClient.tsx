"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  firstName: string;
  lastName: string;
  accountType: "guest" | "patient" | "staff" | "admin";
  emailVerified: boolean;
  newsletterSubscribed: boolean;
};

export default function AccountClient({
  email,
  firstName: initialFirstName,
  lastName: initialLastName,
  accountType,
  emailVerified,
  newsletterSubscribed: initialNewsletterSubscribed,
}: Props) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(initialNewsletterSubscribed);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: result, error: userError } = await supabase.auth.getUser();
      if (userError || !result.user) throw new Error("Please sign in again.");
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      if (!trimmedFirst || !trimmedLast) throw new Error("First and last name are required.");
      const { error: profileError } = await supabase.from("profiles").update({
        full_name: `${trimmedFirst} ${trimmedLast}`,
      }).eq("id", result.user.id);
      if (profileError) throw profileError;
      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: { first_name: trimmedFirst, last_name: trimmedLast, full_name: `${trimmedFirst} ${trimmedLast}` },
      });
      if (userUpdateError) throw userUpdateError;

      // Opt-out does not create a newsletter record or invent consent.
      // Explicit opt-in is required before a subscription can be created.
      if (newsletterSubscribed) {
        const { error: newsletterError } = await supabase.from("newsletter_subscriptions").upsert({
          user_id: result.user.id,
          email: result.user.email ?? email,
          subscribed: true,
          frequency: "biweekly",
          consented_at: new Date().toISOString(),
          unsubscribed_at: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (newsletterError) throw newsletterError;
      } else {
        const { error: newsletterError } = await supabase.from("newsletter_subscriptions")
          .update({ subscribed: false, unsubscribed_at: new Date().toISOString() })
          .eq("user_id", result.user.id);
        if (newsletterError) throw newsletterError;
      }
      setMessage("Account details and newsletter preference saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Account information could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="authCard accountRegistrationCard accountDashboardCard">
      <p className="eyebrow">Secure account</p>
      <h1>Your Account</h1>
      <p className="accountEmail">{email}</p>
      <p><strong>Account type:</strong> {accountType === "patient" ? "Patient" : accountType === "guest" ? "Guest" : accountType === "staff" ? "Office Staff" : "Administrator"}</p>
      {!emailVerified && <p className="authMessage">Please verify your email before using Patient services or adding a passkey.</p>}
      <form className="authForm" onSubmit={save}>
        <div className="accountNameFields">
          <label>First name<input autoComplete="given-name" required maxLength={80} value={firstName} onChange={e => setFirstName(e.target.value)} /></label>
          <label>Last name<input autoComplete="family-name" required maxLength={80} value={lastName} onChange={e => setLastName(e.target.value)} /></label>
        </div>
        <label className="newsletterConsent">
          <span><input type="checkbox" checked={newsletterSubscribed} onChange={e => setNewsletterSubscribed(e.target.checked)} /> Subscribe to our newsletter every two weeks (optional).</span>
        </label>
        <button disabled={saving} type="submit">{saving ? "Saving…" : "Save Account Preferences"}</button>
      </form>
      {message && <p className="authMessage" role="status">{message}</p>}
      <div className="accountEssentialActions">
        <Link className="accountPrimaryLink" href="/account/security">MFA and passkey security settings</Link>
        {accountType === "patient" && <Link className="accountPrimaryLink" href="/patient/intake">Open Intake Questionnaire</Link>}
      </div>
      {accountType === "guest" && <p className="accountPrivacyNote">Guest accounts receive practice information. Patient intake requires a Patient account and verified security.</p>}
    </section>
  );
}
