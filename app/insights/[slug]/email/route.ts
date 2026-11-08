import { notFound } from "next/navigation";
import { getWeeklyInsight } from "../../../content/weekly-insights";
import { renderInsightEmail } from "../../../content/insight-email";

/** HTML preview/export; no subscribers are contacted and no email is sent. */
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const item=getWeeklyInsight(slug);if(!item)notFound();
 return new Response(renderInsightEmail(item),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=3600","x-robots-tag":"noindex"}});
}
