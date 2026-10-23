import "server-only";

type Invitation = { recipient: string; assignmentUrl: string };

/** Existing assignment route remains responsible for MFA, BAA, opt-in and release gates. */
export async function sendPauboxPatientInvitation({ recipient, assignmentUrl }: Invitation): Promise<string> {
  if (process.env.PAUBOX_BAA_CONFIRMED !== "true" ||
      process.env.PATIENT_TEST_INVITATIONS_ENABLED !== "true") {
    throw new Error("Patient invitation delivery disabled");
  }
  const key = process.env.PAUBOX_API_KEY?.trim();
  const from = process.env.TEST_INVITATION_FROM_EMAIL?.trim();
  if (!key || !from || !from.toLowerCase().endsWith("@indiancreekpsych.com")) {
    throw new Error("Paubox sender not configured");
  }
  const response = await fetch("https://api.paubox.com/v1/email/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token token=${key}`,
    },
    body: JSON.stringify({ data: { message: {
      recipients: [recipient],
      headers: {
        from,
        subject: "Secure message from Indian Creek Psychological Services",
      },
      content: {
        "text/plain": "A secure message is available in your Indian Creek Psychological Services patient account. Sign in using the email address receiving this invitation. If you do not have a Patient account, register using this email first.\n\n" + assignmentUrl + "\n\nFor privacy, this email contains no assessment details or results. If you did not expect this message, please call 913-353-6116.",
      },
    } } }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Paubox rejected invitation (HTTP ${response.status})`);
  const data: unknown = await response.json().catch(() => null);
  const tracking = data && typeof data === "object" && "sourceTrackingId" in data &&
    typeof data.sourceTrackingId === "string" ? data.sourceTrackingId : null;
  if (!tracking) throw new Error("Paubox did not confirm acceptance");
  return tracking;
}
