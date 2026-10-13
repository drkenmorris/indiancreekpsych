import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeAssignmentData, assignedTestOptions } from "@/lib/clinical-tests/assignments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const EMAIL_READY = () => Boolean(process.env.RESEND_API_KEY && process.env.TEST_INVITATION_FROM_EMAIL);

async function authorize() {
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user||!user.email_confirmed_at) return null;
  const [{data:profile,error:roleError},{data:assurance,error:aalError}]=await Promise.all([
    supabase.from("profiles").select("account_type").eq("id",user.id).maybeSingle(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if(roleError||profile?.account_type!=="admin"||aalError||assurance?.currentLevel!=="aal2")return null;
  return {supabase,user};
}

export async function GET(){
  const ctx=await authorize();
  if(!ctx)return NextResponse.json({error:"Administrator sign-in with MFA is required."},{status:403});
  const {data,error}=await ctx.supabase.from("psych_test_assignments")
   .select("id,recipient_first_name,recipient_last_name,recipient_email,test_key,status,created_at,expires_at,sent_at")
   .order("created_at",{ascending:false}).limit(60);
  if(error)return NextResponse.json({error:"Assignments cannot be loaded."},{status:503});
  return NextResponse.json({assignments:data??[],deliveryReady:EMAIL_READY(),
    tests:assignedTestOptions},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:NextRequest) {
  const ctx=await authorize();
  if(!ctx)return NextResponse.json({error:"Administrator sign-in with MFA is required."},{status:403});
  let body:Record<string,unknown>;
  try {
    if (Number(request.headers.get("content-length")??0)>8192)throw Error("large");
    const parsed:unknown=await request.json();
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw Error("invalid");
    body=parsed as Record<string,unknown>;
  }catch{return NextResponse.json({error:"Invalid assignment request."},{status:400});}

  if(body.action==="create"){
    const verified=normalizeAssignmentData(body);
    if(!verified.ok)return NextResponse.json({error:verified.message},{status:400});
    // Prevent accidental bulk data collection or unsolicited sending.
    const since=new Date(Date.now()-60*60*1000).toISOString();
    const {count,error:limitError}=await ctx.supabase.from("psych_test_assignments")
      .select("id",{count:"exact",head:true}).eq("assigned_by",ctx.user.id).gte("created_at",since);
    if(limitError)return NextResponse.json({error:"Unable to check assignment limits."},{status:503});
    if((count??0)>=25)return NextResponse.json({error:"Hourly assignment limit reached."},{status:429});
    const {data,error}=await ctx.supabase.from("psych_test_assignments")
       .insert(verified.data).select("id").single();
    if(error||!data)return NextResponse.json({error:"Unable to save assignment. Verify your MFA session."},{status:503});
    return NextResponse.json({id:data.id,created:true,emailed:false},{status:201});
  }
  if(body.action==="send") {
    if(!EMAIL_READY())return NextResponse.json(
      {error:"Email delivery is not configured. Set RESEND_API_KEY and TEST_INVITATION_FROM_EMAIL in Vercel, using a verified sender domain. This assignment has NOT been emailed."},
      {status:503});
    const id=typeof body.id==="string"?body.id:"";
    if(!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id))
      return NextResponse.json({error:"Invalid assignment."},{status:400});
    const {data:record,error}=await ctx.supabase.from("psych_test_assignments")
      .select("id,recipient_email,status,expires_at").eq("id",id).maybeSingle();
    if(error||!record)return NextResponse.json({error:"Assignment not found."},{status:404});
    if(record.status!=="draft")return NextResponse.json({error:"This assignment has already been sent or revoked."},{status:409});
    if(Date.parse(record.expires_at)<=Date.now())return NextResponse.json({error:"This invitation expired. Create a new assignment."},{status:409});
    const link="https://www.indiancreekpsych.com/patient/assigned-tests/"+encodeURIComponent(id);
    const sender=process.env.TEST_INVITATION_FROM_EMAIL!;
    let acceptedId:string|undefined;
    try{
      const response=await fetch("https://api.resend.com/emails",{
        method:"POST",headers:{"Content-Type":"application/json",
          "Authorization":"Bearer "+process.env.RESEND_API_KEY,
          "Idempotency-Key":"indiancreek-test-invitation-"+id},
        body:JSON.stringify({
          from:sender,to:[record.recipient_email],
          subject:"Secure message from Indian Creek Psychological Services",
          text:"A secure assessment invitation has been prepared for your account. To view it, sign in to Indian Creek Psychological Services using the email address receiving this message. If you do not yet have an account, create a Patient account using this email, then return to the link.\n\n"+link+"\n\nFor your privacy, this message does not include assessment details or personal medical information. Never send medical information by replying to this email. If you were not expecting this invitation, please contact the office at 913-353-6116.",
          reply_to:"drkenmorris@indiancreekpsych.com",
        }),signal:AbortSignal.timeout(15000),
      });
      if(!response.ok)throw Error("provider rejected invitation");
      const result:unknown=await response.json();
      acceptedId=typeof result==="object"&&result!==null&&"id" in result&&typeof result.id==="string"?result.id:undefined;
      if(!acceptedId)throw Error("provider acceptance not confirmed");
    }catch{
      return NextResponse.json({error:"The email service did not confirm delivery acceptance. Assignment remains a draft; check the email provider before retrying."},{status:502});
    }
    const {data:updated,error:updateError}=await ctx.supabase.from("psych_test_assignments")
      .update({status:"sent",sent_at:new Date().toISOString(),email_provider_id:acceptedId})
      .eq("id",id).eq("status","draft").select("id").maybeSingle();
    if(updateError||!updated)return NextResponse.json({error:"Email accepted by provider, but assignment status could not be confirmed. Check with the office before retrying."},{status:503});
    return NextResponse.json({sent:true,id,providerAccepted:true});
  }
  return NextResponse.json({error:"Unsupported request."},{status:400});
}
