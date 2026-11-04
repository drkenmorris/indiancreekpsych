import {NextResponse} from 'next/server';
import {emrAccess,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {checkedDsmSource,recipientSnapshot} from '@/lib/clinical-tests/dsm/assignment-server';
export const dynamic='force-dynamic';
export async function POST(request:Request){const ctx=await emrAccess();if(!ctx||!sameOrigin(request))return NextResponse.json({error:'Administrator MFA and same-origin request required.'},{status:403});let id;try{const body=await request.json();id=body.id;if(!uuid(id))throw Error();}catch{return NextResponse.json({error:'Invalid assignment.'},{status:400});}
 const {data:a,error:ae}=await ctx.supabase.from('psych_test_assignments').select('id,patient_id,assigned_by,test_key,dsm_source,dsm_source_hash').eq('id',id).maybeSingle();if(ae||!a||a.assigned_by!==ctx.user.id||a.test_key!=='dsm')return NextResponse.json({error:'Assignment unavailable.'},{status:404});
 const {data:r,error:re}=await ctx.supabase.from('dsm_assignment_responses').select('answers,status,submitted_at').eq('assignment_id',id).maybeSingle();if(re||r?.status!=='submitted')return NextResponse.json({error:'The recipient must submit the questionnaire first.'},{status:409});
 try{const source=checkedDsmSource(a.dsm_source,a.dsm_source_hash),snapshot=recipientSnapshot(source,r.answers,r.submitted_at);let {data:record,error}=await ctx.supabase.from('dsm_records').select('id,revision').eq('source_assignment_id',id).maybeSingle();if(error)throw Error('Record lookup failed.');
 if(!record){const created=await ctx.supabase.from('dsm_records').insert({patient_id:a.patient_id,label:'Assigned DSM — '+source.profile.title,source_assignment_id:id}).select('id,revision').single();record=created.data;if(created.error){const existing=await ctx.supabase.from('dsm_records').select('id,revision').eq('source_assignment_id',id).maybeSingle();record=existing.data;}if(!record)throw Error('Unable to create linked clinician record.');}
 if(record.revision===0){const {error}=await ctx.supabase.rpc('save_dsm_record',{p_id:record.id,p_expected_revision:0,p_state:snapshot.state,p_report:snapshot.report,p_provenance:snapshot.provenance,p_hash:snapshot.contentHash});if(error&&error.code!=='40001')throw Error('The clinician record was created, but its source answers were not saved. Please retry.');}
 return NextResponse.json({recordId:record.id},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Import unavailable.'},{status:409});}}
