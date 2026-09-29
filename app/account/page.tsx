import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountClient from "./AccountClient";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    redirect("/login");
  }

  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)redirect('/login');
  if(user.email_confirmed_at){
    const {error:activationError}=await supabase.rpc('complete_registration');
    if(activationError)throw new Error('Account setup is temporarily unavailable.');
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, preferred_name, account_type")
    .eq("id", claims.sub)
    .maybeSingle();

  if(profile?.account_type==='patient'){
    const {data:ready,error:securityError}=await supabase.rpc('patient_security_ready');
    if(securityError||!ready)redirect('/account/security');
    const {data:intake,error:intakeError}=await supabase.from('patient_intakes').select('status').eq('patient_id',user.id).maybeSingle();
    if(intakeError)throw new Error('Patient intake status is temporarily unavailable.');
    if(intake?.status!=='submitted')redirect('/patient/intake');
  }

  const { data: newsletter } = await supabase
    .from("newsletter_subscriptions")
    .select("subscribed, frequency")
    .eq("user_id", claims.sub)
    .maybeSingle();

  return (
    <div className="icp-shell">
      <header className="icp-top-menu">
        <div className="icp-top-menu-left"><Link className="icp-brand" href="/"></Link></div>
        <div className="icp-top-menu-right"><span className="icp-top-tagline">Secure Client Account</span></div>
      </header>
      <main className="icp-shell-center authPage">
        <AccountClient
          email={typeof claims.email === "string" ? claims.email : ""}
          fullName={profile?.full_name ?? ""}
          preferredName={profile?.preferred_name ?? ""}
          accountType={profile?.account_type ?? "guest"}
          newsletterSubscribed={newsletter?.subscribed ?? false}
          newsletterFrequency={(newsletter?.frequency as "weekly" | "biweekly" | undefined) ?? "biweekly"}
        />
      </main>
      <nav className="icp-bottom-menu" aria-label="Account navigation"><Link href="/">Home</Link><Link href="/account">Account</Link><Link href="/appointments">Appointments</Link></nav>
    </div>
  );
}
