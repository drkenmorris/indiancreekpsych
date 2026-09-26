import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return NextResponse.json({ error: "Please sign in again before saving hours." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase.from("profiles").select("account_type").eq("id", auth.user.id).single();
    if (profileError || profile?.account_type !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    const rule = await request.json();
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    if ((rule.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rule.id)) || !Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6 ||
        !time.test(rule.start_time) || !time.test(rule.end_time) || rule.end_time <= rule.start_time || (rule.anchor_time && (!time.test(rule.anchor_time) || rule.anchor_time < rule.start_time || (Number(rule.anchor_time.slice(0,2))*60+Number(rule.anchor_time.slice(3))+60) > (Number(rule.end_time.slice(0,2))*60+Number(rule.end_time.slice(3)))))) {
      return NextResponse.json({ error: "Choose valid office hours and a starting hour that fits fully inside them." }, { status: 400 });
    }
    const payload = { weekday: rule.weekday, start_time: rule.start_time, end_time: rule.end_time, anchor_time: rule.anchor_time || null };
    const table = supabase.from("appointment_availability_rules");
    const { error } = rule.id
      ? await table.update(payload).eq("id",rule.id).select("id").abortSignal(AbortSignal.timeout(10000)).single()
      : await table.insert(payload).abortSignal(AbortSignal.timeout(10000));
    if (error) return NextResponse.json({ error: "Hours could not be saved. Refresh your session and try again." }, { status: 400 });
    const { data: rules, error: readError } = await supabase.from("appointment_availability_rules").select("id,weekday,start_time,end_time,enabled,anchor_time").order("weekday").order("start_time").abortSignal(AbortSignal.timeout(10000));
    if (readError) return NextResponse.json({ error: "Hours were saved, but the list could not refresh. Reload the page before retrying." }, { status: 502 });
    return NextResponse.json({ rules });
  } catch {
    return NextResponse.json({ error: "Save could not be confirmed. Reload the page before retrying." }, { status: 500 });
  }
}
