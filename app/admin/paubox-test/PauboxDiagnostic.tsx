"use client";

import { useEffect, useState } from "react";

type Status = {
  recipient?: string;
  apiKeyConfigured?: boolean;
  sendingDomainConfigured?: boolean;
  testSendEnabled?: boolean;
  testRecipientAllowlistConfigured?: boolean;
  testSenderConfigured?: boolean;
  error?: string;
};
type SendResult = { accepted?: boolean; sourceTrackingId?: string | null; error?: string };

export default function PauboxDiagnostic() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  async function refresh() {
    try {
      const response = await fetch("/api/admin/paubox-test", { cache: "no-store" });
      const body: Status = await response.json();
      setStatus(response.ok ? body : { error: body.error || "Configuration check failed" });
    } catch { setStatus({ error: "Unable to check Paubox configuration" }); }
  }
  useEffect(() => { void refresh(); }, []);

  async function sendTest() {
    if (!window.confirm("Send exactly one synthetic Paubox test email to drkenmorris@gmail.com? No patient information will be included.")) return;
    setBusy(true);
    setResult("");
    try {
      const response = await fetch("/api/admin/paubox-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "SEND_SYNTHETIC_PAUBOX_TEST" }),
        cache: "no-store",
      });
      const body: SendResult = await response.json();
      if (response.ok && body.accepted) {
        setResult("Paubox accepted the synthetic message. Tracking ID: " + (body.sourceTrackingId || "not returned") + ". Check the test Gmail inbox for delivery.");
      } else {
        setResult("Not sent: " + (body.error || "Paubox did not accept the request"));
      }
    } catch { setResult("The test request failed; check server logs before trying again."); }
    finally { setBusy(false); }
  }

  const ready = Boolean(status?.apiKeyConfigured && status?.sendingDomainConfigured &&
    status?.testSendEnabled && status?.testRecipientAllowlistConfigured && status?.testSenderConfigured);
  return <section className="authCard">
    <h2>Paubox Email API diagnostic</h2>
    <p>Recipient: <strong>drkenmorris@gmail.com</strong>. Test message contains no patient data. This does not enable patient invitations.</p>
    {status?.error ? <p role="alert">{status.error}</p> :
      <p role="status">{status ? (ready ? "Diagnostic configuration ready" : "Diagnostic sending is disabled or configuration is incomplete") : "Checking configuration..."}</p>}
    <button type="button" onClick={() => void refresh()} disabled={busy}>Refresh status</button>{" "}
    <button type="button" onClick={() => void sendTest()} disabled={!ready || busy}>
      {busy ? "Sending test..." : "Send Paubox Test Email"}
    </button>
    {result && <p role="status">{result}</p>}
  </section>;
}
