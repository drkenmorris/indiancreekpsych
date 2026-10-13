"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthMenuAction() {
  const [userStatus, setUserStatus] = useState<"loading" | "signed-in" | "signed-out">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserStatus(data.user ? "signed-in" : "signed-out");
    }).catch(() => {
      if (mounted) setUserStatus("signed-out");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUserStatus(session?.user ? "signed-in" : "signed-out");
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
  return <button type="button" className="authMenuLogout" disabled={busy} onClick={() => void signOut()}>{busy ? "Signing out…" : "Logout"}</button>;
}
