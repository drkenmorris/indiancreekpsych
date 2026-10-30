import ClinicLogo from "../components/ClinicLogo";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AccountClient from "./AccountClient";
import RegisterPage from "../register/page";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: claimsResult } = await supabase.auth.getClaims();
  const claims = claimsResult?.claims;
  // Account is the entry point for both Guest and Patient registration.
  if (!claims?.sub) return <RegisterPage />;

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) return <RegisterPage />;
  const user = userResult.user;

  if (user.email_confirmed_at) {
    const { error: activationError } = await supabase.rpc("complete_registration");
    if (activationError) throw new Error("Account setup is temporarily unavailable.");
  }

  const [{ data: profile }, { data: newsletter }] = await Promise.all([
    supabase.from("profiles").select("full_name, preferred_name, account_type").eq("id", user.id).maybeSingle(),
    supabase.from("newsletter_subscriptions").select("subscribed").eq("user_id", user.id).maybeSingle(),
  ]);

  const storedFirstName = user.user_metadata?.first_name;
  const storedLastName = user.user_metadata?.last_name;
  const legacyName = (profile?.full_name ?? "").trim().split(/\s+/);
  const firstName = typeof storedFirstName === "string" ? storedFirstName : legacyName[0] ?? "";
  const lastName = typeof storedLastName === "string" ? storedLastName : legacyName.slice(1).join(" ");

  return (
    <div className="icp-shell accountPortalShell">
      <header className="icp-top-menu">
        <div className="icp-top-menu-left"><Link className="icp-brand" href="/" aria-label="Indian Creek Psychological Services home"><ClinicLogo className="clinicAuthLogo" /></Link></div>
        <div className="icp-top-menu-right"><span className="icp-top-tagline">Account</span></div>
      </header>
      <main className="icp-shell-center authPage">
        <AccountClient
          email={user.email ?? ""}
          firstName={firstName}
          lastName={lastName}
          accountType={profile?.account_type ?? "guest"}
          emailVerified={Boolean(user.email_confirmed_at)}
          newsletterSubscribed={newsletter?.subscribed ?? false}
        />
      </main>

    </div>
  );
}
