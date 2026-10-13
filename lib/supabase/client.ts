import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./config";

export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey, {
    // Supabase WebAuthn passkeys are experimental and also require provider
    // activation with a stable relying-party ID. TOTP works independently.
    auth: { experimental: { passkey: true } },
  });
}
