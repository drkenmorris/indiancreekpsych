import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PauboxDiagnostic from "./PauboxDiagnostic";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paubox Email Diagnostic | Indian Creek" };

export default async function PauboxTestPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=/admin/paubox-test");
  if (!user.email_confirmed_at) redirect("/account/security?next=%2Fadmin%2Fpaubox-test");
  const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle();
  if (profile?.account_type !== "admin") redirect("/account");
  const { data: assurance, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (mfaError || assurance?.currentLevel !== "aal2") redirect("/account/security?next=%2Fadmin%2Fpaubox-test");
  return <main className="authPage intakePage">
    <Link href="/admin/assign-test">← Test assignments</Link>
    <h1>Administrator Email Diagnostics</h1>
    <PauboxDiagnostic />
  </main>;
}
