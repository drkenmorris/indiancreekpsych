import {ACTION_NAMES,ROUTE} from "@/lib/omnicore-investor-demo/catalog.mjs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  const url=new URL(request.url),until=Date.parse(process.env.OMNICORE_DEMO_UNTIL??"");
  if(!["indiancreekpsych.com","www.indiancreekpsych.com"].includes(url.hostname)||!Number.isFinite(until)||until<=Date.now()||until>Date.now()+16*60000)return new Response(null,{status:404});
  return Response.json({protocol:"OC-DISCOVERY-ACTION-1",synthetic:true,canary:"DUMMY_DISCOVERY_CANARY_ONLY",route:ROUTE,actions:ACTION_NAMES,
    description:"Owner-published dummy exercise manifest. No credentials or real records. All operations require a separately signed short-lived controller lease."},
    {headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"}});
}
