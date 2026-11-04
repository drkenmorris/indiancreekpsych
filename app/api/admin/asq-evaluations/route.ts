import {NextResponse} from 'next/server';
import {emrAccess,sameOrigin,privateHeaders} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {buildAsqEvaluation,evaluationHash,evaluationSnapshot} from '@/lib/clinical-tests/asq/evaluation';
export const dynamic='force-dynamic';
export async function POST(request:Request){const ctx=await emrAccess();if(!ctx||!sameOrigin(request))return NextResponse.json({error:'Clinician sign-in with MFA and same-origin request required.'},{status:403,headers:privateHeaders});
 let body;try{const text=await request.text();if(text.length>24000)throw Error();body=JSON.parse(text);if(!uuid(body.id)||!Number.isInteger(body.expectedRevision)||body.expectedRevision<0||!Number.isInteger(body.responseRevision)||typeof body.notes!=='string'||body.notes.length>20000)throw Error();}catch{return NextResponse.json({error:'Invalid evaluation request.'},{status:400,headers:privateHeaders});}
 const {data:a,error:ae}=await ctx.supabase.from('psych_test_assignments').select('id,assigned_by,asq_definition,asq_definition_hash').eq('id',body.id).eq('assigned_by',ctx.user.id).maybeSingle();
 if(ae||!a)return NextResponse.json({error:'Assignment unavailable.'},{status:404,headers:privateHeaders});
 const {data:r,error:re}=await ctx.supabase.from('asq_assignment_responses').select('answers,status,revision').eq('assignment_id',a.id).maybeSingle();
 if(re||!r||r.status!=='submitted'||r.revision!==body.responseRevision)return NextResponse.json({error:'Only the current complete submitted response can be evaluated.'},{status:409,headers:privateHeaders});
 try{const report=buildAsqEvaluation(a.asq_definition,a.asq_definition_hash,r.answers),snapshot=evaluationSnapshot(report,{assignmentId:a.id,responseRevision:r.revision,definitionHash:a.asq_definition_hash},body.notes),hash=evaluationHash(snapshot);
 const {data,error}=await ctx.supabase.rpc('save_asq_evaluation',{p_id:a.id,p_expected:body.expectedRevision,p_response_revision:r.revision,p_algorithm_hash:report.algorithmHash,p_report:report,p_notes:body.notes,p_hash:hash});
 if(error)return NextResponse.json({error:error.code==='40001'?'Another evaluation was saved. Your notes remain here; reopen the record before saving.':'Evaluation save was not confirmed. Your notes remain on this page.'},{status:error.code==='40001'?409:503,headers:privateHeaders});
 return NextResponse.json({saved:true,revision:data,contentHash:hash},{headers:privateHeaders});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Evaluation unavailable.'},{status:409,headers:privateHeaders});}}
