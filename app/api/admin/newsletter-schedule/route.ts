import { NextResponse } from "next/server";
import { newsletterAdminAccess } from "@/lib/newsletter/admin-access";
import { getWeeklyInsight } from "@/app/content/weekly-insights";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const respond=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});

export async function GET(){
 const access=await newsletterAdminAccess();if(!access)return respond({error:"Administrator MFA required"},403);
 const {data,error}=await access.supabase.from("newsletter_article_schedule")
   .select("article_slug,status,scheduled_at,updated_at").order("scheduled_at",{ascending:true,nullsFirst:false});
 if(error)return respond({error:"Schedule could not be loaded"},503);
 return respond({schedules:data,deliveryEnabled:false,consentFrequency:"biweekly"});
}

export async function POST(request:Request){
 const access=await newsletterAdminAccess();if(!access)return respond({error:"Administrator MFA required"},403);
 const origin=request.headers.get("origin"),host=request.headers.get("host");
 if(!origin||!host)return respond({error:"Origin required"},403);
 try {if(new URL(origin).host!==host)return respond({error:"Origin mismatch"},403);}catch{return respond({error:"Invalid Origin"},403);}
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")return respond({error:"JSON required"},415);
 let input:unknown;try{input=await request.json();}catch{return respond({error:"Invalid JSON"},400);}
 if(!input||typeof input!=="object"||Array.isArray(input))return respond({error:"Invalid request"},400);
 const {slug,action,scheduledAt}=input as {slug?:unknown;action?:unknown;scheduledAt?:unknown};
 if(typeof slug!=="string"||!getWeeklyInsight(slug))return respond({error:"Unknown article"},400);
 if(action!=="plan"&&action!=="clear")return respond({error:"Unknown scheduling action"},400);
 let iso:string|null=null;
 if(action==="plan"){
   if(typeof scheduledAt!=="string"||scheduledAt.length>40)return respond({error:"A valid date and time are required"},400);
   const parsed=Date.parse(scheduledAt);
   if(!Number.isFinite(parsed)||parsed<Date.now()+60000||parsed>Date.now()+366*86400000)return respond({error:"Choose a future date within one year"},400);
   iso=new Date(parsed).toISOString();
 }
 const {data,error}=await access.supabase.from("newsletter_article_schedule").upsert({
   article_slug:slug,status:action==="plan"?"planned":"draft",scheduled_at:iso,
   updated_by:access.user.id,updated_at:new Date().toISOString(),
 },{onConflict:"article_slug"}).select("article_slug,status,scheduled_at,updated_at").single();
 if(error)return respond({error:"Schedule could not be saved"},503);
 return respond({schedule:data,deliveryEnabled:false});
}
