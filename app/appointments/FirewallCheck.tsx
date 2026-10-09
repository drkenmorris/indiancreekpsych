"use client";

import { useState } from "react";

export default function FirewallCheck({ disabled = false }: { disabled?: boolean }) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  async function check() {
    setRunning(true);
    setMessage("");
    try {
      // Deliberately lacks all required office-hours fields, even if the policy is disabled.
      const response = await fetch("/api/scheduling/office-hours/protection-check", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: "{}",
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (response.status === 403 && result.error === "Request denied by the site's OmniCore firewall policy." && typeof result.reference === "string") {
        setMessage(`OmniCore rejected the prohibited format (403). Reference: ${result.reference}. Check this event in OmniCore to confirm the caller was verified and the firewall denied the request.`);
      } else if (response.status === 401) {
        setMessage("Sign in again before testing. Authentication rejected this request; this does not prove firewall blocking.");
      } else {
        setMessage(`Firewall blocking was not confirmed (HTTP ${response.status}). No valid office-hours data was submitted. Review the policy and OmniCore event before retrying.`);
      }
    } catch {
      setMessage("The test result could not be confirmed. No valid office-hours data was submitted. Check OmniCore before retrying.");
    } finally { setRunning(false); }
  }
  return <details>
    <summary>OmniCore protection check</summary>
    <p>Ask the server to construct a labeled, fixed test request in a prohibited format using your current sign-in. It contains no office-hours values and cannot create valid hours.</p>
    <button type="button" className="secondaryAction" disabled={disabled || running} onClick={() => void check()}>{running ? "Checking protection…" : "Test request-format protection"}</button>
    {message && <p className="authMessage" role="status">{message}</p>}
  </details>;
}
