"use client";

import { useState } from "react";

export default function FirewallCheck({ disabled = false }: { disabled?: boolean }) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [operationMessage, setOperationMessage] = useState("");
  async function checkOperation() {
    setRunning(true);
    setOperationMessage("");
    try {
      const response = await fetch("/api/scheduling/office-hours/toggle", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "00000000-0000-0000-0000-000000000000", enabled: false }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (response.status === 200 && result.check === "office_hours_protected_operation" && result.matchedRules === 0 && result.changed === false) {
        setOperationMessage("The protected request completed without changing office hours. Check its event in OmniCore to confirm verified access and an allowed outgoing destination.");
      } else if (response.status === 401) {
        setOperationMessage("Sign in again before testing. Authentication rejected this request.");
      } else if (response.status === 403 && result.code === "owner_approval_required") {
        setOperationMessage("This check requires current approval in OmniCore. No office-hours change was requested.");
      } else {
        setOperationMessage(`Protected connection was not confirmed (HTTP ${response.status}). Review the OmniCore event before retrying.`);
      }
    } catch {
      setOperationMessage("The protected connection check could not be confirmed. Review OmniCore before retrying.");
    } finally { setRunning(false); }
  }
  async function check() {
    setRunning(true);
    setMessage("");
    try {
      // Deliberately lacks all required office-hours fields, even if the policy is disabled.
      const response = await fetch("/api/scheduling/office-hours", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "text/plain" }, body: "{}",
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
    <p>Send an empty test request in a prohibited format using your current sign-in. It contains no office-hours values and cannot create valid hours.</p>
    <button type="button" className="secondaryAction" disabled={disabled || running} onClick={() => void check()}>{running ? "Checking protection…" : "Test request-format protection"}</button>
    {message && <p className="authMessage" role="status">{message}</p>}
    <p>Check the protected office-hours connection without changing availability. Current sign-in, administrator permission, and OmniCore approval are still required.</p>
    <button type="button" className="secondaryAction" disabled={disabled || running} onClick={() => void checkOperation()}>Test protected connection (no changes)</button>
    {operationMessage && <p className="authMessage" role="status">{operationMessage}</p>}
  </details>;
}
