import {NextResponse} from 'next/server';
import {asqRecipientAccess,asqPrivateHeaders as headers} from '@/lib/clinical-tests/asq/recipient-access';
import {checkedSource} from '@/lib/clinical-tests/connected/source';
import {isConnectedKey,validateSave} from '@/lib/clinical-tests/connected/definition';
import {uuid} from '@/lib/emr/demographics';
import {sameOrigin} from '@/lib/emr/access';
export const dynamic='force-dynamic';
async function access(id:string){const ctx=await asqRecipientAccess();if(!ctx)return null;const {data:a,error}=await ctx.supabase.from('psych_test_assignments').select('id,test_key,recipient_first_name,recipient_last_name,recipient_email,status,expires_at,patient_id,connected_source,connected_source_hash').eq('id',id).maybeSingle();// A filtered lookup is not proof of identity: reject mis-scoped rows, invalid
// central-chart links, and missing/malformed expiry timestamps before exposing
// an assigned instrument or permitting its save RPC.
if(error||!a||a.id!==id||!isConnectedKey(a.test_key)||!uuid(a.patient_id)||a.status!=='sent'||typeof a.expires_at!=='string'||!Number.isFinite(Date.parse(a.expires_at))||Date.parse(a.expires_at)<=Date.now()||a.recipient_email!==ctx.user.email?.toLowerCase())return null;return {...ctx,a};}
export async function GET(r:Request){const id=new URL(r.url).searchParams.get('id');if(!uuid(id))return NextResponse.json({error:'Invalid assignment.'},{status:400,headers});const ctx=await access(id);if(!ctx)return NextResponse.json({error:'Assignment unavailable. Use the invited verified email, complete security verification, or contact the office if the invitation expired.'},{status:403,headers});try{const definition=checkedSource(ctx.a.connected_source,ctx.a.connected_source_hash);const {data,error}=await ctx.supabase.from('connected_assignment_responses').select('assignment_id,respondent_id,answers,page,revision,status,identity_confirmed').eq('assignment_id',id).eq('respondent_id',ctx.user.id).maybeSingle();if(error)throw Error('Saved answers could not be loaded.');
// Do not rely on a filtered PostgREST lookup alone to certify recipient
// provenance. A stale/mis-scoped adapter must never show another person's answers.
if(data){
 const allowed=new Map(definition.items.map(item=>[item.id,item.options]));
 if(data.assignment_id!==id||data.respondent_id!==ctx.user.id||
  !data.answers||typeof data.answers!=='object'||Array.isArray(data.answers)||
  !Number.isSafeInteger(data.page)||data.page<0||data.page>=Math.ceil(definition.items.length/7)||
  !Number.isSafeInteger(data.revision)||data.revision<0||
  (data.status!=='draft'&&data.status!=='submitted')||typeof data.identity_confirmed!=='boolean'||
  Object.entries(data.answers).some(([key,value])=>!allowed.get(key)?.some(option=>option.value===value)))
  throw Error('Saved assignment response provenance could not be verified.');
}
// Return only fields used by the recipient UI; never echo future response columns.
const response=data?{answers:data.answers,page:data.page,revision:data.revision,status:data.status,identity_confirmed:data.identity_confirmed}:{answers:{},page:0,revision:0,status:'draft',identity_confirmed:false};
return NextResponse.json({assignment:{id,recipientName:ctx.a.recipient_first_name+' '+ctx.a.recipient_last_name,expiresAt:ctx.a.expires_at},definition,response},{headers});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Source unavailable.'},{status:409,headers});}}
export async function POST(r:Request){if(!sameOrigin(r))return NextResponse.json({error:'Same-origin request required.'},{status:403,headers});let b;try{const text=await r.text();if(text.length>150000)throw Error();b=JSON.parse(text);if(!uuid(b.id))throw Error();}catch{return NextResponse.json({error:'Invalid save request.'},{status:400,headers});}const ctx=await access(b.id);if(!ctx)return NextResponse.json({error:'Assignment unavailable or expired. Your latest changes have not been saved. Contact the office.'},{status:403,headers});try{const d=checkedSource(ctx.a.connected_source,ctx.a.connected_source_hash),s=validateSave(b,d);const {data,error}=await ctx.supabase.rpc('save_connected_assignment',{p_id:b.id,p_expected:s.expectedRevision,p_answers:s.answers,p_page:s.page,p_submit:s.submit,p_confirmed:true});if(error)return NextResponse.json({error:error.code==='40001'?'Another session saved newer answers. Keep this page open and reopen the assignment to review.':'Saving was not confirmed. Keep this page open and contact the office if the invitation expired.'},{status:error.code==='40001'?409:503,headers});
// A successful HTTP/RPC response is not proof that the intended revision
// committed. If the receipt is missing or contradictory, never claim saved.
if(!Number.isSafeInteger(data)||data!==s.expectedRevision+1)
 return NextResponse.json({error:'Save outcome could not be verified. Keep this page open and contact the office before retrying.'},{status:503,headers});
// The RPC revision alone is not independent evidence that the expected
// respondent's answers reached durable chart history. Read back the exact row
// before reporting success; an ambiguous outcome must not invite an unsafe retry.
const {data:stored,error:readError}=await ctx.supabase.from('connected_assignment_responses')
 .select('assignment_id,respondent_id,answers,page,revision,status,identity_confirmed')
 .eq('assignment_id',b.id).eq('respondent_id',ctx.user.id).maybeSingle();
const persisted=stored?.answers;
const expectedEntries=Object.entries(s.answers);
if(readError||!stored||stored.assignment_id!==b.id||stored.respondent_id!==ctx.user.id||
 stored.revision!==data||stored.page!==s.page||
 stored.status!==(s.submit?'submitted':'draft')||stored.identity_confirmed!==true||
 !persisted||typeof persisted!=='object'||Array.isArray(persisted)||
 Object.keys(persisted).length!==expectedEntries.length||
 expectedEntries.some(([key,value])=>persisted[key]!==value))
 return NextResponse.json({error:'Save was acknowledged but chart readback could not be verified. Keep this page open and contact the office before retrying.'},{status:503,headers});
return NextResponse.json({saved:true,revision:data,status:s.submit?'submitted':'draft'},{headers});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid answers.'},{status:400,headers});}}
