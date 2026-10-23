import { NextResponse, type NextRequest } from "next/server";
import { sendPauboxPatientInvitation } from "@/lib/paubox/patient-invitation";
import { createClient } from "@/lib/supabase/server";
import { normalizeAssignmentData, assignedTestOptions } from "@/lib/clinical-tests/assignments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const EMAIL_READY = () => Boolean(process.env.PAUBOX_API_KEY
  && process.env.TEST_INVITATION_FROM_EMAIL
  && process.env.PAUBOX_BAA_CONFIRMED === "true"
  && process.env.PATIENT_TEST_INVITATIONS_ENABLED === "true");

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
      {error:"Secure patient invitations are not active. Configure Paubox Email API, confirm the BAA, verify the sending domain, and complete patient testing approval. No email was sent."},
      {status:503});
    const id=typeof body.id==="string"?body.id:"";
    if(!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id))
      return NextResponse.json({error:"Invalid assignment."},{status:400});
    const {data:record,error}=await ctx.supabase.from("psych_test_assignments")
      .select("id,recipient_email,test_key,status,expires_at").eq("id",id).maybeSingle();
    if(error||!record)return NextResponse.json({error:"Assignment not found."},{status:404});
    if(record.status!=="draft")return NextResponse.json({error:"This assignment has already been sent or revoked."},{status:409});
    if(Date.parse(record.expires_at)<=Date.now())return NextResponse.json({error:"This invitation expired. Create a new assignment."},{status:409});
    // A test invitation is never an authorization to access unreleased questionnaires.
    const approvedTest = assignedTestOptions.find(t=>t.value===record.test_key);
    if(!approvedTest?.patientReady)
      return NextResponse.json({error:"This questionnaire has not yet been approved for patient administration. Invitation not sent."},{status:409});
    const link="https://www.indiancreekpsych.com/patient/assigned-tests/"+encodeURIComponent(id);
    let acceptedId: string;
    try {
      acceptedId = await sendPauboxPatientInvitation({
        recipient: record.recipient_email,
        assignmentUrl: link,
      });
    } catch {
      return NextResponse.json({error:"The email provider did not confirm acceptance. Assignment is still a draft; check provider status before retrying."},{status:502});
    }
    const {data:updated,error:updateError}=await ctx.supabase.from("psych_test_assignments")
      .update({status:"sent",sent_at:new Date().toISOString(),email_provider_id:acceptedId})
      .eq("id",id).eq("status","draft").select("id").maybeSingle();
    if(updateError||!updated)return NextResponse.json({error:"Email accepted by provider, but assignment status could not be confirmed. Check with the office before retrying."},{status:503});
    return NextResponse.json({sent:true,id,providerAccepted:true});
  }
  return NextResponse.json({error:"Unsupported request."},{status:400});
}
