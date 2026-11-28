import {isConnectedKey,connectedDefinition} from '@/lib/clinical-tests/connected/definition';
import {checkedSource,hash} from '@/lib/clinical-tests/connected/source';
import { NextResponse, type NextRequest } from "next/server";
import { sendPauboxPatientInvitation } from "@/lib/paubox/patient-invitation";
import { createClient } from "@/lib/supabase/server";
import { normalizeAssignmentData, assignedTestOptions } from "@/lib/clinical-tests/assignments";

import {assignmentDefinition} from '@/lib/clinical-tests/asq/assignment-source';
import {asqRecipientReleaseApproved} from '@/lib/clinical-tests/asq/recipient-access';
import {dsmAssignmentSource} from '@/lib/clinical-tests/dsm/assignment';
import {checkedDsmSource} from '@/lib/clinical-tests/dsm/assignment-server';
import {snapshotHash} from '@/lib/emr/dsm-snapshot';
import {uuid} from '@/lib/emr/demographics';
import {sameOrigin} from '@/lib/emr/access';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Assignment metadata and all authorization/error receipts are user-specific.
function assignmentJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(body, {...init, headers});
}
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

export async function GET(request:NextRequest){
  const ctx=await authorize();
  if(!ctx)return assignmentJson({error:"Administrator sign-in with MFA is required."},{status:403});
  const patient=new URL(request.url).searchParams.get('patient');
  if(patient!==null&&!uuid(patient))return assignmentJson({error:'Invalid patient.'},{status:400});
  const cutoff=new Date(Date.now()-30*86400000).toISOString();
  const query=ctx.supabase.from("psych_test_assignments")
   .select("id,recipient_first_name,recipient_last_name,recipient_email,test_key,dsm_version,asq_role,patient_id,connected_source_hash,dsm_source_hash,dsm_format:dsm_source->>format,status,created_at,expires_at,sent_at")
   .eq('assigned_by',ctx.user.id).order("created_at",{ascending:false});
  const {data,error}=await (patient?query.eq('patient_id',patient):query.is('invitation_removed_at',null)
   .or('sent_at.gte.'+cutoff+',and(sent_at.is.null,created_at.gte.'+cutoff+')'));
  if(error)return assignmentJson({error:"Assignments cannot be loaded."},{status:503});
  const visibleAssignments=(data??[]).filter(a=>assignedTestOptions.some(t=>t.value===a.test_key));
  const ids=visibleAssignments.map(a=>a.id);
  const progress=ids.length?await ctx.supabase.from('asq_assignment_responses').select('assignment_id,status,page,revision,answered_count').in('assignment_id',ids):{data:[],error:null};
  if(progress.error)return assignmentJson({error:'Assignment progress cannot be loaded.'},{status:503});
  const dsmProgress=ids.length?await ctx.supabase.from('dsm_assignment_responses').select('assignment_id,status,revision,answered_count').in('assignment_id',ids):{data:[],error:null};
  if(dsmProgress.error)return assignmentJson({error:'DSM progress cannot be loaded.'},{status:503});
  const connectedProgress=ids.length?await ctx.supabase.from('connected_assignment_responses').select('assignment_id,status,revision,answered_count').in('assignment_id',ids):{data:[],error:null};
  if(connectedProgress.error)return assignmentJson({error:'Questionnaire progress cannot be loaded.'},{status:503});
  return assignmentJson({assignments:visibleAssignments.map(a=>({...a,connected_progress:connectedProgress.data?.find(p=>p.assignment_id===a.id)??null,dsm_progress:dsmProgress.data?.find(p=>p.assignment_id===a.id)??null,asq_progress:progress.data?.find(p=>p.assignment_id===a.id)??null})),deliveryReady:EMAIL_READY(),asqReleaseReady:asqRecipientReleaseApproved(),
    tests:assignedTestOptions.map(t=>({...t,patientReady:t.value==='asq'?asqRecipientReleaseApproved():t.value==='dsm'?true:t.patientReady}))});
}

export async function POST(request:NextRequest) {
  const ctx=await authorize();
  if(!ctx)return assignmentJson({error:"Administrator sign-in with MFA is required."},{status:403});
  if(!sameOrigin(request))return assignmentJson({error:'Same-origin request required.'},{status:403});
  let body:Record<string,unknown>;
  try {
    if (Number(request.headers.get("content-length")??0)>8192)throw Error("large");
    const parsed:unknown=await request.json();
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw Error("invalid");
    body=parsed as Record<string,unknown>;
  }catch{return assignmentJson({error:"Invalid assignment request."},{status:400});}

  if(body.action==="create"){
    const verified=normalizeAssignmentData(body);
    if(!verified.ok)return assignmentJson({error:verified.message},{status:400});
    // Prevent accidental bulk data collection or unsolicited sending.
    const since=new Date(Date.now()-60*60*1000).toISOString();
    const {count,error:limitError}=await ctx.supabase.from("psych_test_assignments")
      .select("id",{count:"exact",head:true}).eq("assigned_by",ctx.user.id).gte("created_at",since);
    if(limitError)return assignmentJson({error:"Unable to check assignment limits."},{status:503});
    if((count??0)>=25)return assignmentJson({error:"Hourly assignment limit reached."},{status:429});
    let insertData:Record<string,unknown>={...verified.data};
    if(isConnectedKey(verified.data.test_key)){
      const {data:patient,error:patientError}=await ctx.supabase.from('clinical_patients').select('id').eq('id',verified.data.patient_id!).maybeSingle();
      if(patientError||!patient)return assignmentJson({error:'Selected patient is unavailable.'},{status:400});
      const source=connectedDefinition(verified.data.test_key);insertData={...insertData,connected_source:source,connected_source_hash:hash(source)};
    }
    if(verified.data.test_key==='asq'&&verified.data.asq_role){
      const {data:patient,error:patientError}=await ctx.supabase.from('clinical_patients').select('id').eq('id',verified.data.patient_id!).maybeSingle();
      if(patientError||!patient)return assignmentJson({error:'Selected patient is unavailable.'},{status:400});
      const source=assignmentDefinition(verified.data.asq_role);insertData={...insertData,asq_definition:source.definition,asq_definition_hash:source.hash};
    }
    if(verified.data.test_key==='dsm'&&verified.data.dsm_version){
      const {data:patient,error:patientError}=await ctx.supabase.from('clinical_patients').select('id,demographics').eq('id',verified.data.patient_id!).maybeSingle();
      if(patientError||!patient||patient.demographics?.dob!==verified.data.recipient_dob)return assignmentJson({error:'Select a central patient record with a reviewed birth date matching the patient date of birth. Update central demographics first if needed.'},{status:400});
      const source=dsmAssignmentSource(verified.data.dsm_version,verified.data.recipient_dob!);insertData={...insertData,dsm_source:source,dsm_source_hash:snapshotHash(source)};
    }
    const {data,error}=await ctx.supabase.from("psych_test_assignments")
       .insert(insertData).select("id").single();
    if(error||!data)return assignmentJson({error:"Unable to save assignment. Verify your MFA session."},{status:503});
    return assignmentJson({id:data.id,created:true,emailed:false},{status:201});
  }
  if(body.action==='remove'){
    if(!uuid(body.id))return assignmentJson({error:'Invalid assignment.'},{status:400});
    const {data,error}=await ctx.supabase.from('psych_test_assignments')
     .update({invitation_removed_at:new Date().toISOString()}).eq('id',body.id).eq('assigned_by',ctx.user.id)
     .is('invitation_removed_at',null).select('id').maybeSingle();
    if(error||!data)return assignmentJson({error:'Invitation could not be removed.'},{status:409});
    return assignmentJson({removed:true});
  }
  if(body.action==="send"||body.action==="resend") {
    const resend=body.action==='resend';
    if(!EMAIL_READY())return assignmentJson(
      {error:"Secure patient invitations are not active. Configure Paubox Email API, confirm the BAA, verify the sending domain, and complete patient testing approval. No email was sent."},
      {status:503});
    const id=typeof body.id==="string"?body.id:"";
    if(!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id))
      return assignmentJson({error:"Invalid assignment."},{status:400});
    const {data:record,error}=await ctx.supabase.from("psych_test_assignments")
      .select("id,recipient_email,test_key,dsm_version,asq_role,asq_definition_hash,patient_id,connected_source,connected_source_hash,dsm_source,dsm_source_hash,status,expires_at").eq("id",id).eq("assigned_by",ctx.user.id).is("invitation_removed_at",null).maybeSingle();
    if(error||!record)return assignmentJson({error:"Assignment not found."},{status:404});
    if(resend?(record.status!=='sent'||Date.parse(record.expires_at)>Date.now()):record.status!=='draft')
      return assignmentJson({error:'Only expired, incomplete invitations can be resent.'},{status:409});
    if(resend){
      const table=isConnectedKey(record.test_key)?'connected_assignment_responses':record.test_key==='dsm'?'dsm_assignment_responses':'asq_assignment_responses';
      const {data:progress,error:readError}=await ctx.supabase.from(table).select('status').eq('assignment_id',id).maybeSingle();
      if(readError||progress?.status==='submitted')return assignmentJson({error:'This invitation cannot be resent.'},{status:409});
    }
    if(record.test_key==='asq'&&(!record.asq_role||!record.asq_definition_hash||!record.patient_id))return assignmentJson({error:'This legacy ASQ assignment has no fixed respondent version and patient link. Create a new Student / Self, Parent or Teacher assignment.'},{status:409});
    if(record.test_key==='dsm'){try{if(!record.patient_id)throw Error();checkedDsmSource(record.dsm_source,record.dsm_source_hash);}catch{return assignmentJson({error:'This DSM draft predates the connected recipient workflow. Create a new DSM assignment with a central patient record and fixed version.'},{status:409});}}
    if(isConnectedKey(record.test_key)){try{if(!record.patient_id)throw Error();checkedSource(record.connected_source,record.connected_source_hash);}catch{return assignmentJson({error:'Create a new assignment with the central patient and current questionnaire version.'},{status:409});}}
    // A test invitation is never an authorization to access unreleased questionnaires.
    const approvedTest = assignedTestOptions.find(t=>t.value===record.test_key);
    if(!(record.test_key==='asq'?asqRecipientReleaseApproved():record.test_key==='dsm'?true:approvedTest?.patientReady))
      return assignmentJson({error:"This questionnaire has not yet been approved for patient administration. Invitation not sent."},{status:409});
    const link="https://www.indiancreekpsych.com/patient/assigned-tests/"+encodeURIComponent(id);
    let acceptedId: string;
    try {
      acceptedId = await sendPauboxPatientInvitation({
        recipient: record.recipient_email,
        assignmentUrl: link,
      });
    } catch {
      return assignmentJson({error:"The email provider did not confirm acceptance. The invitation status was not updated. Check provider status before retrying."},{status:502});
    }
    const {data:updated,error:updateError}=await ctx.supabase.from("psych_test_assignments")
      .update({status:"sent",sent_at:new Date().toISOString(),email_provider_id:acceptedId})
      .eq("id",id).eq("status",record.status).eq("expires_at",record.expires_at).is("invitation_removed_at",null).select("id").maybeSingle();
    if(updateError||!updated)return assignmentJson({error:"Email accepted by provider, but assignment status could not be confirmed. Check with the office before retrying."},{status:503});
    return assignmentJson({sent:true,id,providerAccepted:true});
  }
  return assignmentJson({error:"Unsupported request."},{status:400});
}
