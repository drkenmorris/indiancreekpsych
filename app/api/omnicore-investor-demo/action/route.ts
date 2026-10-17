import { createTarget } from "@/lib/omnicore-investor-demo/target.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// Disabled by default. This route has no clinic database, patient, email or scheduling imports.
export async function POST(request: Request) {
  const until = Date.parse(process.env.OMNICORE_DEMO_UNTIL ?? "");
  const names = ["OMNICORE_DEMO_RUN_SECRET", "OMNICORE_DEMO_BOT_SECRET", "OMNICORE_DEMO_WITNESS_SECRET",
    "OMNICORE_DEMO_APPROVED_ORIGIN", "OMNICORE_DEMO_UNAPPROVED_ORIGIN", "OMNICORE_SITE_ID", "OMNICORE_INGEST_KEY"];
  if (!Number.isFinite(until) || until <= Date.now() || until > Date.now() + 16 * 60_000 ||
      names.some(name => !process.env[name])) return new Response(null, { status: 404 });
  const url = new URL(request.url);
  if (!["indiancreekpsych.com", "www.indiancreekpsych.com"].includes(url.hostname))
    return new Response(null, { status: 404 });
  try {
    const target = createTarget({
      enabledUntil: until,
      hostedWitness: process.env.OMNICORE_DEMO_HOSTED_WITNESS === "true",
      witnessBypass: process.env.OMNICORE_DEMO_WITNESS_BYPASS,
      runSecret: process.env.OMNICORE_DEMO_RUN_SECRET,
      botSecret: process.env.OMNICORE_DEMO_BOT_SECRET,
      witnessSecret: process.env.OMNICORE_DEMO_WITNESS_SECRET,
      approvedOrigin: process.env.OMNICORE_DEMO_APPROVED_ORIGIN,
      unapprovedOrigin: process.env.OMNICORE_DEMO_UNAPPROVED_ORIGIN,
      telemetry: { siteId: process.env.OMNICORE_SITE_ID, key: process.env.OMNICORE_INGEST_KEY,
        endpoint: "https://omnicoreai.app/api/omnicore/monitoring/ingest" },
    });
    // Target awaits all connector deliveries before returning.
    const response = await target(request);
    return response;
  } catch {
    return Response.json({ error: "Exercise configuration unavailable" }, { status: 503 });
  }
}
