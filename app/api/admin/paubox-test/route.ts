import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPauboxConfigurationStatus, sendControlledPauboxTest } from "@/lib/paubox/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_RECIPIENT = "drkenmorris@gmail.com";

async function isMfaAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email_confirmed_at) return false;
  const [{ data: profile, error: roleError }, { data: assurance, error: mfaError }] =
    await Promise.all([
      supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
  return !roleError && profile?.account_type === "admin" &&
    !mfaError && assurance?.currentLevel === "aal2";
}

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  if (!(await isMfaAdmin())) return noStore({ error: "Administrator MFA required" }, 403);
  return noStore({ recipient: TEST_RECIPIENT, ...getPauboxConfigurationStatus() });
}

export async function POST(request: Request) {
  if (!(await isMfaAdmin())) return noStore({ error: "Administrator MFA required" }, 403);
  // Reject browser form / cross-origin requests; cookie-authenticated POST must be same origin.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return noStore({ error: "Origin required" }, 403);
  try {
    if (new URL(origin).host !== host) return noStore({ error: "Origin mismatch" }, 403);
  } catch {
    return noStore({ error: "Invalid Origin" }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    return noStore({ error: "JSON required" }, 415);
  // Strict one-off confirmation prevents accidental triggering via page load.
  let body: unknown;
  try { body = await request.json(); } catch { return noStore({ error: "Invalid JSON" }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      (body as { confirmation?: unknown }).confirmation !== "SEND_SYNTHETIC_PAUBOX_TEST")
    return noStore({ error: "Explicit test confirmation required" }, 400);
  try {
    const result = await sendControlledPauboxTest(TEST_RECIPIENT);
    return noStore({ ...result, recipient: TEST_RECIPIENT });
  } catch (error) {
    // Never include key values, provider body, or sensitive request metadata.
    const message = error instanceof Error ? error.message : "Paubox diagnostic failed";
    return noStore({ error: message }, 502);
  }
}
