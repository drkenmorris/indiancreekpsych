import { monitoredSupabaseFetch, protectedSupabaseFetch } from "@/lib/omnicore-monitoring";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./config";

export async function createClient(options: { requireVerifiedRequest?: boolean; verificationSignal?: AbortSignal } = {}) {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    global: { fetch: (input, init) => {
      const send = options.requireVerifiedRequest ? protectedSupabaseFetch : monitoredSupabaseFetch;
      const signal = options.verificationSignal;
      return send(input, signal ? { ...init, signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal } : init);
    } },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. proxy.ts refreshes sessions.
        }
        void headersToSet;
      },
    },
  });
}
