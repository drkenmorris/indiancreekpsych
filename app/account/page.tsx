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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, preferred_name, account_type")
    .eq("id", claims.sub)
    .maybeSingle();

  const { data: newsletter } = await supabase
    .from("newsletter_subscriptions")
    .select("subscribed, frequency")
    .eq("user_id", claims.sub)
    .maybeSingle();

  return (
    <div className="icp-shell">
      <header className="icp-top-menu">
        <div className="icp-top-menu-left"><Link className="icp-brand" href="/"><span className="icp-brand-mark">IC</span><span className="icp-brand-copy"><strong>Indian Creek</strong><small>Psychological Services</small></span></Link></div>
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
      <nav className="icp-bottom-menu" aria-label="Account navigation"><Link href="/">Home</Link><Link href="/account">Account</Link></nav>
    </div>
  );
}
