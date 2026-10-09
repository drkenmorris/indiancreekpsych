import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { officeHoursPost } from "@/lib/office-hours-handler";

// No caller-supplied test metadata or payload is used. Authentication and admin
// authorization precede construction; the protected route repeats its identity gate.
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get("origin") !== url.origin) return NextResponse.json({error:"Invalid request origin."},{status:403});
  try {
    const client = await createClient();
    const {data:auth,error} = await client.auth.getUser();
    if (error || !auth.user || auth.user.is_anonymous) return NextResponse.json({error:"Sign in to run the protection check."},{status:401});
    const profile = await client.from("profiles").select("account_type").eq("id",auth.user.id).single();
    if (profile.error || profile.data?.account_type !== "admin") return NextResponse.json({error:"Administrator access required."},{status:403});
    const headers = new Headers({origin:url.origin,"content-type":"text/plain"});
    // Existing cookies remain inside the site's server and identity provider.
    const cookie = request.headers.get("cookie"); if (cookie) headers.set("cookie",cookie);
    const fixture = new Request(new URL("/api/scheduling/office-hours",url),{method:"POST",headers,body:"{}"});
    return officeHoursPost(fixture,{kind:"controlled_test",source:"server_fixed_fixture",version:"OC-TEST-PROVENANCE-1",scenario:"office_hours_content_type",runId:randomUUID()});
  } catch { return NextResponse.json({error:"Protection check unavailable. No valid office-hours data was submitted."},{status:503}); }
}
