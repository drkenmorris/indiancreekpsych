import { after } from "next/server";
import { createOmniCore } from "./omnicore-server.mjs";
import { supabaseUrl } from "./supabase/config";

// Reject malformed configuration rather than deriving authority from a path or credentials.
function protectedDatabaseOrigin() {
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) return undefined;
    return url.origin;
  } catch { return undefined; }
}

let monitor: ReturnType<typeof createOmniCore> | undefined;
export function siteMonitor() {
  if (!process.env.OMNICORE_SITE_ID || !process.env.OMNICORE_INGEST_KEY) return undefined;
  return monitor ??= createOmniCore({
    onDelivery: ({ ok, status }) => {
      if (!ok) console.warn("OmniCore telemetry delivery failed", status);
    },
  });
}

// Explicit templates prevent patient IDs, tokens and arbitrary paths leaving the site.
const staticRoutes = new Set(["/", "/about", "/contact", "/login", "/register", "/account",
  "/account/security", "/appointments", "/appointments/calendar", "/meet-the-therapist",
  "/services", "/specialties", "/patient/intake", "/admin/intakes", "/admin/intake-kiosk",
  "/auth/callback", "/auth/confirm"]);
export function monitoringRoute(path: string) {
  if (staticRoutes.has(path)) return path;
  if (path.startsWith("/intake/kiosk/")) return "/intake/kiosk/[token]";
  if (path.startsWith("/services/")) return "/services/[slug]";
  if (path.startsWith("/specialties/")) return "/specialties/[slug]";
  return "/[other]";
}

// All server-client Supabase exchanges are observed without reading their bodies,
// authorization headers, URL query strings or database result contents.
export const monitoredSupabaseFetch: typeof fetch = (input, init) => {
  const connector = siteMonitor();
  if (!connector) return fetch(input, init);
  return connector.observedFetch(input, init, {
    route: "/server/supabase", scope: "outbound", dataClass: "personal",
    schedule: (delivery) => after(async () => { await delivery; }),
  });
};

// Use only inside a protected withRoute handler after identity verification.
export const protectedSupabaseFetch: typeof fetch = (input, init) => {
  const connector = siteMonitor();
  if (!connector) return Promise.resolve(Response.json({ error: "Verified request connector unavailable" }, { status: 503 }));
  const origin = protectedDatabaseOrigin();
  if (!origin) return Promise.resolve(Response.json({ error: "Protected database destination unavailable" }, { status: 503 }));
  return connector.observedFetch(input, init, {
    route: "/server/supabase", scope: "outbound", dataClass: "personal",
    requireVerifiedRequest: true,
    outboundFirewall: { mode: "enforce", allowedOrigins: [origin] },
    schedule: delivery => after(async () => { await delivery; }),
  });
};
