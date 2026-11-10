import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {documentsForVersion,fieldsForVersion,formsForVersion} from '@/lib/patient/legal-documents';

export const dynamic='force-dynamic';
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:privateHeaders});

/**
 * Read-only, chart-linked legal packet from the existing signed/submitted intake.
 * Never assembles authorizations from intake drafts, fuzzy matches or demo storage.
 */
export async function GET(request:Request){
 const ctx=await emrAccess();
 if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const patientId=new URL(request.url).searchParams.get('patient');
 if(!uuid(patientId))return reply({error:'Valid central patient ID required.'},400);
 const patient=await ctx.supabase.from('clinical_patients')
  .select('id,account_id').eq('id',patientId).maybeSingle();
 if(patient.error)return reply({error:'Patient-link verification unavailable.'},503);
 if(!patient.data)return reply({error:'Central patient record not found.'},404);
 if(!patient.data.account_id)return reply({patientId,packet:null,reason:'unlinked'});
 const intake=await ctx.supabase.from('patient_intakes')
  .select('status,submitted_at,answers')
  .eq('patient_id',patient.data.account_id).eq('status','submitted').maybeSingle();
 if(intake.error)return reply({error:'Submitted legal packet unavailable.'},503);
 if(!intake.data||!intake.data.submitted_at)return reply({patientId,packet:null,reason:'not_submitted'});
 const raw=intake.data.answers;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return reply({error:'Submitted legal packet is invalid.'},503);
 const answers=raw as Record<string,unknown>;
 const version=typeof answers.legal_packet_version==='string'?answers.legal_packet_version:'legacy-unversioned';
 if(!documentsForVersion(version))return reply({patientId,packet:{version,submittedAt:intake.data.submitted_at,knownRevision:false}});
 const allowed=new Set(['full_name','date_of_birth','legal_packet_version','legal_routing_answers',
  'representative_signer','representative_name','representative_authority']);
 const forms=formsForVersion(version);
 for(const form of forms){
  allowed.add(form.choice);allowed.add(form.signature);allowed.add(form.date);
  for(const [key] of fieldsForVersion(version,form.section))allowed.add(key);
 }
 const legalAnswers:Record<string,string>={};
 for(const key of allowed){
  if(typeof answers[key]==='string')legalAnswers[key]=answers[key] as string;
 }
 return reply({patientId,packet:{
  version,submittedAt:intake.data.submitted_at,knownRevision:true,
  reference:'Linked patient account / submitted intake',
  answers:legalAnswers,
 }});
}
