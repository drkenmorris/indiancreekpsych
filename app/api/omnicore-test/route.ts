import { after } from "next/server";
import { siteMonitor } from "@/lib/omnicore-monitoring";

export const dynamic = "force-dynamic";
const route = "/api/omnicore-test";

// Isolated diagnostic: no database, patient data, sessions, or business operations.
export async function GET(request: Request) {
  if (process.env.OMNICORE_ENFORCEMENT_TEST_ENABLED !== "true")
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  const monitor = siteMonitor();
  if (!monitor) return new Response("Test connector unavailable", { status: 503 });
  return monitor.withRoute(async (req: Request) => {
    const candidate = new URL(req.url).searchParams.get("probe") ?? "";
    const probe = /^[a-f0-9-]{36}$/.test(candidate) ? candidate : "unspecified";
    console.info("OMNICORE_TEST_HANDLER_EXECUTED", probe);
    return Response.json({ test: "omnicore-enforcement", handlerExecuted: true, probe }, {
      headers: { "Cache-Control": "no-store", "X-OmniCore-Test-Executed": "1" },
    });
  }, {
    route, scope: "application", synthetic: true, dataClass: "operational",
    enforcement: process.env.OMNICORE_ENFORCEMENT_ENABLED === "true",
    inspection: { url: true, requestBody: false, responseBody: false, maxBytes: 16384, timeoutMs: 100 },
    schedule: delivery => after(async () => { await delivery; }),
  })(request);
}
