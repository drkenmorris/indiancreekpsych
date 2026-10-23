/**
 * Paubox Email API - isolated server-side client.
 *
 * This file does NOT connect to registration, invitations, or background jobs.
 * No email is sent unless sendControlledPauboxTest() is explicitly invoked,
 * PAUBOX_TEST_SEND_ENABLED is true, and the recipient is allowlisted.
 *
 * https://docs.paubox.com/email-api/quickstart
 */
import "server-only";

const PAUBOX_SEND_URL = "https://api.paubox.com/v1/email/messages";

export type PauboxTestResult = {
  accepted: true;
  sourceTrackingId: string | null;
};

export class PauboxConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PauboxConfigurationError";
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new PauboxConfigurationError(`Missing ${name}`);
  return value;
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    throw new PauboxConfigurationError("Invalid test email address");
  }
  return email;
}

export function getPauboxConfigurationStatus() {
  return {
    apiKeyConfigured: Boolean(process.env.PAUBOX_API_KEY?.trim()),
    sendingDomainConfigured: Boolean(process.env.PAUBOX_SENDING_DOMAIN?.trim()),
    testSendEnabled: process.env.PAUBOX_TEST_SEND_ENABLED === "true",
    testRecipientAllowlistConfigured: Boolean(process.env.PAUBOX_TEST_ALLOWED_RECIPIENTS?.trim()),
    testSenderConfigured: Boolean(process.env.PAUBOX_TEST_FROM_ADDRESS?.trim()),
  };
}

/**
 * Only a fixed synthetic test message can be sent. Intended for a future
 * authenticated, administrator-only diagnostic caller; intentionally no route.
 * No patient information, user-provided body, or invitations are accepted.
 */
export async function sendControlledPauboxTest(recipient: string): Promise<PauboxTestResult> {
  if (process.env.PAUBOX_TEST_SEND_ENABLED !== "true") {
    throw new PauboxConfigurationError("Paubox test sending is disabled");
  }

  const domain = required("PAUBOX_SENDING_DOMAIN").toLowerCase();
  if (domain !== "indiancreekpsych.com") {
    throw new PauboxConfigurationError("Unexpected Paubox sending domain");
  }

  const approvedRecipients = required("PAUBOX_TEST_ALLOWED_RECIPIENTS")
    .split(",")
    .map((address) => normalizeEmail(address))
    .filter(Boolean);
  const to = normalizeEmail(recipient);
  if (!approvedRecipients.includes(to)) {
    throw new PauboxConfigurationError("Test recipient is not allowlisted");
  }

  const from = normalizeEmail(required("PAUBOX_TEST_FROM_ADDRESS"));
  if (!from.endsWith(`@${domain}`)) {
    throw new PauboxConfigurationError("Test sender must belong to the verified domain");
  }

  const apiKey = required("PAUBOX_API_KEY");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let response: Response;
  try {
    response = await fetch(PAUBOX_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          message: {
            recipients: [to],
            headers: {
              from,
              subject: "Indian Creek Paubox connection test (synthetic)",
            },
            content: {
              "text/plain":
                "This is an authorized technical test of the Indian Creek Paubox connection. No patient information is included.",
            },
          },
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    throw new Error("Paubox test request failed or timed out");
  } finally {
    clearTimeout(timeout);
  }

  // Do not return or log provider response bodies; they might contain sensitive data.
  if (!response.ok) {
    throw new Error(`Paubox rejected the test request (HTTP ${response.status})`);
  }

  const body: unknown = await response.json().catch(() => null);
  const sourceTrackingId =
    body && typeof body === "object" && "sourceTrackingId" in body &&
    typeof body.sourceTrackingId === "string"
      ? body.sourceTrackingId
      : null;
  return { accepted: true, sourceTrackingId };
}
