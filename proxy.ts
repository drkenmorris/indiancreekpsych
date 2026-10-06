import type { NextRequest, NextFetchEvent } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

import { monitoringRoute, siteMonitor } from "@/lib/omnicore-monitoring";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const monitor = siteMonitor();
  // This route already has final-response instrumentation; avoid counting it twice.
  if (!monitor || request.nextUrl.pathname === "/api/scheduling/office-hours")
    return updateSession(request);
  return monitor.withRoute(() => updateSession(request), {
    route: monitoringRoute(request.nextUrl.pathname),
    scope: "middleware", dataClass: "operational",
    enforcement: process.env.OMNICORE_ENFORCEMENT_ENABLED === "true",
    inspection: { url: true, requestBody: true, responseBody: false, maxBytes: 16384, timeoutMs: 100 },
    schedule: (delivery) => event.waitUntil(delivery),
  })(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
