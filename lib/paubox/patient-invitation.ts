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
        "text/plain": [
          "Indian Creek Psychological Services",
          "Secure Psychological Assessment Invitation",
          "",
          "You have been invited to access a psychological assessment assigned by our office.",
          "",
          "To access your assignment:",
          "1. Open the secure assignment link below.",
          "2. Sign in with the same email address that received this invitation. If you do not yet have a patient account, register with this address and complete the required verification.",
          "3. Review the assigned assessment and its available-until date in your secure patient account.",
          "4. Follow the instructions displayed in the patient portal. Complete the assessment within the available period; if you need an extension, contact the office before it expires.",
          "",
          "Secure assignment link:",
          assignmentUrl,
          "",
          "General administration reminders:",
          "Use a private, quiet setting and a reliable internet connection. Set aside uninterrupted time. Do not share the invitation link or ask another person to complete the assessment for you. If you are interrupted, have technical difficulty, or are unsure about the instructions, contact the office rather than guessing whether your responses were saved.",
          "",
          "For your privacy, assessment names, responses, and results are not included in this email.",
          "If you did not expect this invitation or need assistance, call Indian Creek Psychological Services at 913-353-6116.",
        ].join("\n"),
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
