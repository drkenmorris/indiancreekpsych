import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {validateDsmVersion} from '@/lib/clinical-tests/dsm/entry-choice';
import {uuid} from '@/lib/emr/demographics';
import {buildDsmSnapshot,snapshotHash,snapshotProvenance,stableJson} from '@/lib/emr/dsm-snapshot';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){const ctx=await emrAccess();if(!ctx)return NextResponse.json({error:'Administrator sign-in and MFA required.'},{status:403,headers:privateHeaders});const params=new URL(request.url).searchParams,id=params.get('id'),patient=params.get('patient'),requestedRevision=params.get('revision');if(id&&!uuid(id)||patient&&!uuid(patient)||requestedRevision&&(!/^[1-9][0-9]*$/.test(requestedRevision)||Number(requestedRevision)>2147483647))return NextResponse.json({error:'Invalid record or patient ID.'},{status:400,headers:privateHeaders});
 let query=ctx.supabase.from('dsm_records').select('id,patient_id,owner_id,label,revision,created_at,updated_at').eq('owner_id',ctx.user.id).order('updated_at',{ascending:false}).limit(100);if(id)query=query.eq('id',id);if(patient)query=query.eq('patient_id',patient);const {data,error}=await query;if(error||!Array.isArray(data))return NextResponse.json({error:'Record repository unavailable.'},{status:503,headers:privateHeaders});
 // RLS and SQL filters must not be the sole patient-isolation evidence.
 // Check every returned row against the authenticated clinician, requested
 // chart and requested record before any clinical assessment metadata leaves
 // this route. Fail the entire response on an unexpected or duplicate row.
 const seenIds=new Set<string>();
 const expectedPatient=patient?.toLowerCase(),expectedId=id?.toLowerCase();
 const validRows=data.every(row=>{
  const recordId=typeof row?.id==='string'?row.id.toLowerCase():'';
  const chartId=typeof row?.patient_id==='string'?row.patient_id.toLowerCase():'';
  if(!uuid(recordId)||!uuid(chartId)||row.owner_id!==ctx.user.id||
     (expectedPatient&&chartId!==expectedPatient)||
     (expectedId&&recordId!==expectedId)||seenIds.has(recordId))return false;
  seenIds.add(recordId);
  return true;
 });
 if(!validRows)return NextResponse.json({error:'Assessment record ownership or patient scope could not be verified.'},{status:409,headers:privateHeaders});
 // owner_id is used only as a server-side authorization receipt.
 const records=data.map(row=>({id:row.id,patient_id:row.patient_id,label:row.label,
  revision:row.revision,created_at:row.created_at,updated_at:row.updated_at}));
 if(!id)return NextResponse.json({records},{headers:privateHeaders});let record=records[0];if(!record)return NextResponse.json({error:'Record unavailable.'},{status:404,headers:privateHeaders});const {data:person,error:personError}=await ctx.supabase.from('clinical_patients').select('id,demographics,profiles!clinical_patients_account_id_fkey(full_name)').eq('id',record.patient_id).single();if(personError||!person||person.id!==record.patient_id)return NextResponse.json({error:'Assessment patient identity could not be verified.'},{status:409,headers:privateHeaders});const names=[person?.demographics?.first_name,person?.demographics?.last_name].filter(Boolean).join(' ');const profile=Array.isArray(person?.profiles)?person.profiles[0]:person?.profiles;record=Object.assign({},record,{patient_name:names||profile?.full_name||'Patient demographics pending',patient_dob:person?.demographics?.dob??''});if(!record.revision)return NextResponse.json({record,snapshot:null,history:[]},{headers:privateHeaders});
 const [{data:history,error:hError},{data:snapshot,error:sError}]=await Promise.all([ctx.supabase.from('dsm_record_versions').select('id,revision,created_at,content_hash').eq('record_id',id).order('revision',{ascending:false}).limit(50),ctx.supabase.from('dsm_record_versions').select('state,report,provenance,content_hash,revision').eq('record_id',id).eq('revision',requestedRevision?Number(requestedRevision):record.revision).single()]);
 if(hError||sError||!snapshot)return NextResponse.json({error:'Record history unavailable.'},{status:503,headers:privateHeaders});if(snapshotHash({state:snapshot.state,report:snapshot.report,provenance:snapshot.provenance})!==snapshot.content_hash)return NextResponse.json({error:'Snapshot integrity check failed. No state restored.'},{status:409,headers:privateHeaders});
 const compatible=stableJson(snapshot.provenance)===stableJson(snapshotProvenance);
 if(compatible){try{const canonical=buildDsmSnapshot(snapshot.state);if(stableJson(canonical.report)!==stableJson(snapshot.report))throw Error();}catch{return NextResponse.json({error:'Recorded findings could not be verified against their response source.'},{status:409,headers:privateHeaders});}}
 return NextResponse.json({record,snapshot,history,compatible},{headers:privateHeaders});}
export async function POST(request:Request){const ctx=await emrAccess();if(!ctx)return NextResponse.json({error:'Administrator sign-in and MFA required.'},{status:403,headers:privateHeaders});if(!sameOrigin(request))return NextResponse.json({error:'Same-origin request required.'},{status:403,headers:privateHeaders});let body;
 try{const text=await request.text();if(Buffer.byteLength(text)>8000000)throw Error('Request too large.');body=JSON.parse(text);}catch{return NextResponse.json({error:'Invalid record request.'},{status:400,headers:privateHeaders});}
 if(body.action==='create'){
  if(!uuid(body.patientId)||typeof body.label!=='string'||!body.label.trim()||body.label.length>140)
   return NextResponse.json({error:'Choose a central patient and a record label.'},{status:400,headers:privateHeaders});
  const label=body.label.trim();
  const {data,error}=await ctx.supabase.from('dsm_records')
   .insert({patient_id:body.patientId,label})
   .select('id,patient_id,owner_id,label,revision').single();
  // A successful insert HTTP response is not proof that the created DSM record
  // belongs to the selected central chart and signed-in clinician. Verify the
  // DB-owned receipt before reporting success; never expose the owner receipt.
  // A mismatched/unavailable receipt is an uncertain write, not proof the insert
  // was rolled back. Clinicians must reconcile the record list before retrying.
  if(error||!data||!uuid(data.id)||!uuid(data.patient_id)||
    data.patient_id.toLowerCase()!==body.patientId.toLowerCase()||
    data.owner_id!==ctx.user.id||data.label!==label||data.revision!==0)
   return NextResponse.json({error:'Record creation receipt could not be verified. Check the existing record list before retrying.'},{status:409,headers:privateHeaders});
  const record={id:data.id,patient_id:data.patient_id,label:data.label,revision:data.revision};
  return NextResponse.json({record},{status:201,headers:privateHeaders});
 }
 if(body.action!=='save'||!uuid(body.id)||!Number.isInteger(body.expectedRevision)||body.expectedRevision<0)return NextResponse.json({error:'Invalid revision request.'},{status:400,headers:privateHeaders});
 let snapshot;try{snapshot=buildDsmSnapshot(body.state);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid assessment state.'},{status:400,headers:privateHeaders});}
 const {data:target,error:targetError}=await ctx.supabase.from('dsm_records').select('patient_id').eq('id',body.id).eq('owner_id',ctx.user.id).maybeSingle();
 if(targetError||!target)return NextResponse.json({error:'Record unavailable.'},{status:404,headers:privateHeaders});
 const {data:patient,error:patientError}=await ctx.supabase.from('clinical_patients').select('demographics,account_id').eq('id',target.patient_id).single();
 if(patientError)return NextResponse.json({error:'Patient binding cannot be verified.'},{status:503,headers:privateHeaders});
 let dob=patient?.demographics?.dob;
 if(!dob&&patient?.account_id){const {data:intake,error}=await ctx.supabase.from('patient_intakes').select('answers').eq('patient_id',patient.account_id).maybeSingle();if(error)return NextResponse.json({error:'Patient age source is unavailable.'},{status:503,headers:privateHeaders});dob=intake?.answers?.date_of_birth;}
 const report=snapshot.report as {respondent?:{version:string}};
 if(dob&&report.respondent){const error=validateDsmVersion(report.respondent.version,dob,true);if(error)return NextResponse.json({error:'Patient age and selected questionnaire version do not agree. '+error},{status:409,headers:privateHeaders});}
 const {data,error}=await ctx.supabase.rpc('save_dsm_record',{p_id:body.id,p_expected_revision:body.expectedRevision,p_state:snapshot.state,p_report:snapshot.report,p_provenance:snapshot.provenance,p_hash:snapshot.contentHash});
 if(error)return NextResponse.json({code:error.code==='40001'?'revision_conflict':'save_unconfirmed',error:error.code==='40001'?'Another session saved a newer revision. Your local answers are retained; reopen the record to review before saving.':'Record save was not confirmed.'},{status:error.code==='40001'?409:503,headers:privateHeaders});return NextResponse.json({saved:true,revision:data,contentHash:snapshot.contentHash},{headers:privateHeaders});}
