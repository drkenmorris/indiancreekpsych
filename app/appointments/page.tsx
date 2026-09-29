import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppointmentsClient from "./AppointmentsClient";

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || !claims?.sub) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, preferred_name")
    .eq("id", claims.sub)
    .maybeSingle();

  const accountType = (profile?.account_type ?? "guest") as "guest" | "patient" | "admin";

  if(accountType==='patient'){
    const {data:ready,error:securityError}=await supabase.rpc('patient_security_ready');
    if(securityError||!ready)redirect('/account/security?next=/appointments');
  }
  const [{ data: settings }, { data: rules }, { data: blocks }] = await Promise.all([
    supabase.from("appointment_settings").select("*").eq("id", true).maybeSingle(),
    accountType === "admin" ? supabase.from("appointment_availability_rules").select("*").order("weekday").order("start_time") : Promise.resolve({ data: [] }),
    accountType === "admin" ? supabase.from("appointment_blocks").select("*").order("starts_at") : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="icp-shell">
      <header className="icp-top-menu">
        <div className="icp-top-menu-left">
          <Link className="icp-brand" href="/"></Link>
        </div>
        <div className="icp-top-menu-right"><span className="icp-top-tagline">Secure Appointment Scheduling</span></div>
      </header>
      <main className="icp-shell-center authPage appointmentPage">
        <AppointmentsClient
          userId={claims.sub}
          accountType={accountType}
          preferredName={profile?.preferred_name ?? ""}
          initialSettings={settings ?? null}
          initialRules={rules ?? []}
          initialBlocks={blocks ?? []}
        />
      </main>
      <nav className="icp-bottom-menu" aria-label="Appointment navigation">
        <Link href="/">Home</Link>
        <Link href="/account">Account</Link>
        <Link href="/appointments">Appointments</Link>
        {accountType === "admin" && <Link href="/appointments/calendar">Monthly calendar</Link>}
      </nav>
    </div>
  );
}
