"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; status: string; friendly_name?: string };
export default function SecurityClient({ next }: { next: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [verifiedSession, setVerifiedSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");

  async function load() {
    const [list, assurance] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    if (list.error || assurance.error) throw new Error("Security settings could not be loaded.");
    setFactors(list.data.totp.filter(f => f.status === "verified"));
    setVerifiedSession(assurance.data.currentLevel === "aal2");
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (active) await load();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load security settings.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<void>) {
    setError(""); setMessage(""); setBusy(true);
    try { await action(); }
    catch (err) { setError(err instanceof Error ? err.message : "Verification could not be completed."); }
    finally { setBusy(false); }
  }

  function chooseFactor(factor: Factor) {
    setFactorId(factor.id);
    setQr("");
    setCode("");
    setError("");
  }

  async function enrollTotp() {
    await run(async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Indian Creek authenticator",
      });
      if (error) throw error;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setCode("");
      setMessage("Scan the QR code in an authenticator app, then verify the six-digit code.");
    });
  }

  async function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId, code: code.trim(),
      });
      if (error) throw error;
      const { data: assurance, error: levelError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (levelError || assurance.currentLevel !== "aal2") throw new Error("Second-step verification is not yet complete.");
      await load();
      window.location.assign(next);
    });
  }

  async function registerPasskey() {
    await run(async () => {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user.user?.email_confirmed_at) throw new Error("Confirm your email before enrolling a passkey.");
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw new Error("Passkey enrollment is not currently available. Your browser must support passkeys and passkeys must be enabled for this site. " + error.message);
      setMessage("Passkey saved to your account. You can use it to sign in next time; patient intake still requires an MFA-verified session.");
    });
  }

  return (
    <section className="appointmentPanel accountSecurityPanel">
      <p><strong>Authenticator-app MFA:</strong> Verify a six-digit one-time code after signing in. Patient intake requires this second step.</p>
      {loading ? <p role="status">Loading security settings…</p> : (
        <>
          {verifiedSession && <p className="authMessage">Your current session has completed MFA verification.</p>}
          {factors.length > 0 && !verifiedSession && factors.map(f => (
            <button type="button" key={f.id} disabled={busy} onClick={() => chooseFactor(f)}>
              Verify with {f.friendly_name || "authenticator app"}
            </button>
          ))}
          {(factors.length === 0 || verifiedSession) && !factorId && (
            <button type="button" disabled={busy} onClick={() => void enrollTotp()}>Set up authenticator-app MFA</button>
          )}
          {factorId && (
            <form className="authForm" onSubmit={(e) => void verifyTotp(e)}>
              {qr && <><p>Scan this QR code with an authenticator app, then enter the generated six-digit code.</p><img className="securityQr" src={qr} alt="Authenticator app enrollment QR code" /></>}
              <label>Six-digit authenticator code
                <input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value)} />
              </label>
              <button disabled={busy} type="submit">Verify and continue</button>
              <button type="button" className="secondaryAction" disabled={busy} onClick={() => { setFactorId(""); setQr(""); setCode(""); }}>Cancel</button>
            </form>
          )}
          <div className="accountPasskeyPanel">
            <strong>Passkey sign-in (experimental)</strong>
            <p>A passkey uses your device, fingerprint, face unlock, PIN, or security key for sign-in. It is separate from the authenticator-app verification required for patient information.</p>
            <button type="button" disabled={busy} className="secondaryAction" onClick={() => void registerPasskey()}>Add a passkey to this account</button>
          </div>
          {verifiedSession && <a className="accountPrimaryLink" href={next}>Continue</a>}
        </>
      )}
      <p className="accountPrivacyNote">If you lose access to your authenticator, contact the office for verified recovery. A password reset does not remove the second-step requirement.</p>
      {message && <p className="authMessage" role="status">{message}</p>}
      {error && <p className="authMessage" role="alert">{error}</p>}
    </section>
  );
}
