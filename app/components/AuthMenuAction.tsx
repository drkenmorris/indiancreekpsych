"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserStatus = "loading" | "signed-in" | "signed-out";

export default function AuthMenuAction() {
  const [userStatus, setUserStatus] = useState<UserStatus>("loading");
  const [accountRole, setAccountRole] = useState<"guest" | "patient" | "staff" | "admin" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function refreshIdentity() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!mounted) return;
        if (error || !data.user) {
          setUserStatus("signed-out");
          setAccountRole(null);
          return;
        }

        // Patient role must be read from protected profiles, not editable
        // user_metadata. A failed lookup never shows patient-only links.
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("account_type")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!mounted) return;
        setUserStatus("signed-in");
        const role = profile?.account_type;
        setAccountRole(!profileError && ["guest", "patient", "staff", "admin"].includes(role ?? "")
          ? role as "guest" | "patient" | "staff" | "admin" : null);
      } catch {
        if (!mounted) return;
        setUserStatus("signed-out");
        setAccountRole(null);
      }
    }

    void refreshIdentity();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        setUserStatus("signed-out");
        setAccountRole(null);
        return;
      }
      // Auth callbacks must not await more Supabase calls while the auth
      // state change lock is active. Schedule the role lookup afterward.
      setTimeout(() => { if (mounted) void refreshIdentity(); }, 0);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setBusy(false);
      window.alert("Sign out could not be completed. Please try again.");
      return;
    }
    window.location.assign("/");
  }

  if (userStatus === "loading") return <span className="authMenuLoading" aria-label="Checking sign-in status">Account</span>;
  if (userStatus === "signed-out") return <Link href="/login?next=/account">Login</Link>;

  return (
    <>
      {accountRole === "patient" && <Link href="/patient/psychological-tests">Psychological Tests</Link>}
      {accountRole === "admin" && <Link href="/clinical-tests">Psychological Tests</Link>}
      {accountRole === "admin" && (
        <a href="https://emr-workflow-demo.vercel.app" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
          EMR Demo (opens in new tab)
        </a>
      )}
      {(accountRole === "admin" || accountRole === "staff") && (
        <Link href="/admin/questionnaires">Patient Questionnaires</Link>
      )}
      <button type="button" className="authMenuLogout" disabled={busy} onClick={() => void signOut()}>
        {busy ? "Signing out…" : "Logout"}
      </button>
    </>
  );
}
