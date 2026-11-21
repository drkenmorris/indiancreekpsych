import {NextResponse} from 'next/server';
import {asqRecipientAccess,asqPrivateHeaders as headers} from '@/lib/clinical-tests/asq/recipient-access';
import {checkedSource} from '@/lib/clinical-tests/connected/source';
import {isConnectedKey,validateSave} from '@/lib/clinical-tests/connected/definition';
import {uuid} from '@/lib/emr/demographics';
import {sameOrigin} from '@/lib/emr/access';
export const dynamic='force-dynamic';
// A recipient may send chunked or dishonest Content-Length requests. Bound
// *actual UTF-8 bytes* before materializing sensitive questionnaire answers;
// reject malformed UTF-8 rather than silently changing a clinical response.
const maxConnectedSaveBytes=150_000;
async function readConnectedSaveBody(r:Request):Promise<{text?:string;tooLarge?:boolean}>{
 const declared=r.headers.get('content-length');
 if(declared!==null&&/^[0-9]+$/.test(declared)&&Number(declared)>maxConnectedSaveBytes)
  return {tooLarge:true};
 if(!r.body)return {text:''};
 const reader=r.body.getReader();
 const chunks:Uint8Array[]=[];
 let bytes=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   bytes+=value.byteLength;
   if(bytes>maxConnectedSaveBytes){
    await reader.cancel().catch(()=>undefined);
    return {tooLarge:true};
   }
   chunks.push(value);
  }
  return {text:new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))};
 }catch{return {};}
 finally{reader.releaseLock();}
}

async function access(id:string){const ctx=await asqRecipientAccess();if(!ctx)return null;const {data:a,error}=await ctx.supabase.from('psych_test_assignments').select('id,test_key,recipient_first_name,recipient_last_name,recipient_email,status,expires_at,patient_id,connected_source,connected_source_hash').eq('id',id).maybeSingle();// A filtered lookup is not proof of identity: reject mis-scoped rows, invalid
// central-chart links, and missing/malformed expiry timestamps before exposing
// an assigned instrument or permitting its save RPC.
if(error||!a||a.id!==id||!isConnectedKey(a.test_key)||!uuid(a.patient_id)||a.status!=='sent'||typeof a.expires_at!=='string'||!Number.isFinite(Date.parse(a.expires_at))||Date.parse(a.expires_at)<=Date.now()||a.recipient_email!==ctx.user.email?.toLowerCase())return null;return {...ctx,a};}
export async function GET(r:Request){const id=new URL(r.url).searchParams.get('id');if(!uuid(id))return NextResponse.json({error:'Invalid assignment.'},{status:400,headers});const ctx=await access(id);if(!ctx)return NextResponse.json({error:'Assignment unavailable. Use the invited verified email, complete security verification, or contact the office if the invitation expired.'},{status:403,headers});try{const definition=checkedSource(ctx.a.connected_source,ctx.a.connected_source_hash);if(definition.testKey!==ctx.a.test_key)throw Error('Assignment and questionnaire key mismatch.');const {data,error}=await ctx.supabase.from('connected_assignment_responses').select('assignment_id,respondent_id,answers,page,revision,status,identity_confirmed').eq('assignment_id',id).eq('respondent_id',ctx.user.id).maybeSingle();if(error)throw Error('Saved answers could not be loaded.');
// Do not rely on a filtered PostgREST lookup alone to certify recipient
// provenance. A stale/mis-scoped adapter must never show another person's answers.
if(data){
 const allowed=new Map(definition.items.map(item=>[item.id,item.options]));
 if(data.assignment_id!==id||data.respondent_id!==ctx.user.id||
  !data.answers||typeof data.answers!=='object'||Array.isArray(data.answers)||
  !Number.isSafeInteger(data.page)||data.page<0||data.page>=Math.ceil(definition.items.length/7)||
  !Number.isSafeInteger(data.revision)||data.revision<0||
  (data.status!=='draft'&&data.status!=='submitted')||typeof data.identity_confirmed!=='boolean'||
  Object.entries(data.answers).some(([key,value])=>!allowed.get(key)?.some(option=>option.value===value))||
  // A saved submission is a final clinical attestation, not merely a status flag.
  // Never show an incomplete or identity-unconfirmed historical row as submitted,
  // even if a stale adapter or legacy write bypassed the current save RPC.
  (data.status==='submitted'&&(!data.identity_confirmed||
   definition.items.some(item=>!Object.prototype.hasOwnProperty.call(data.answers,item.id)))))
  throw Error('Saved assignment response provenance could not be verified.');
}
// Return only fields used by the recipient UI; never echo future response columns.
const response=data?{answers:data.answers,page:data.page,revision:data.revision,status:data.status,identity_confirmed:data.identity_confirmed}:{answers:{},page:0,revision:0,status:'draft',identity_confirmed:false};
// The invitation may be revoked while this request is fetching a previously
// authorized recipient response. Recheck live assignment authorization and
// source identity before disclosing any questionnaire or historical answers.
// This is an additional boundary; database RLS remains authoritative.
const current=await access(id);
// The source hash column may be unchanged while the JSON source changes
// between recipient authorization and answer readback. Verify the actual
// CURRENT sealed instrument again before releasing any clinical answers.
let currentInstrumentVerified=false;
if(current)try{
 currentInstrumentVerified=checkedSource(current.a.connected_source,current.a.connected_source_hash).testKey===definition.testKey;
}catch{ /* Fail closed on changed or malformed instrument content. */ }
if(!current||!currentInstrumentVerified||current.user.id!==ctx.user.id||
 current.a.patient_id!==ctx.a.patient_id||
 current.a.test_key!==ctx.a.test_key||
 current.a.recipient_email!==ctx.a.recipient_email||
 current.a.connected_source_hash!==ctx.a.connected_source_hash||
 current.a.expires_at!==ctx.a.expires_at)
 return NextResponse.json({error:'Assignment authorization changed; reopen the invitation or contact the office.'},{status:403,headers});
return NextResponse.json({assignment:{id,recipientName:current.a.recipient_first_name+' '+current.a.recipient_last_name,expiresAt:current.a.expires_at},definition,response},{headers});}catch{return NextResponse.json({error:'Questionnaire source or saved answers could not be verified. Contact the office.'},{status:409,headers});}}
export async function POST(r:Request){if(!sameOrigin(r))return NextResponse.json({error:'Same-origin request required.'},{status:403,headers});const wire=await readConnectedSaveBody(r);if(wire.tooLarge)return NextResponse.json({error:'Assessment save request too large.'},{status:413,headers});let b;try{if(typeof wire.text!=='string')throw Error();b=JSON.parse(wire.text);if(!uuid(b.id))throw Error();}catch{return NextResponse.json({error:'Invalid save request.'},{status:400,headers});}const ctx=await access(b.id);if(!ctx)return NextResponse.json({error:'Assignment unavailable or expired. Your latest changes have not been saved. Contact the office.'},{status:403,headers});try{const d=checkedSource(ctx.a.connected_source,ctx.a.connected_source_hash);if(d.testKey!==ctx.a.test_key)throw Error('Assignment and questionnaire key mismatch.');const s=validateSave(b,d);let receipt;
try{receipt=await ctx.supabase.rpc('save_connected_assignment',{p_id:b.id,p_expected:s.expectedRevision,p_answers:s.answers,p_page:s.page,p_submit:s.submit,p_confirmed:true});}
catch{return NextResponse.json({error:'Save outcome could not be verified. Keep this page open and contact the office before retrying.'},{status:503,headers});}
const {data,error}=receipt??{};if(error)return NextResponse.json({error:error.code==='40001'?'Another session saved newer answers. Keep this page open and reopen the assignment to review.':'Saving was not confirmed. Keep this page open and contact the office if the invitation expired.'},{status:error.code==='40001'?409:503,headers});
// A successful HTTP/RPC response is not proof that the intended revision
// committed. If the receipt is missing or contradictory, never claim saved.
if(!Number.isSafeInteger(data)||data!==s.expectedRevision+1)
 return NextResponse.json({error:'Save outcome could not be verified. Keep this page open and contact the office before retrying.'},{status:503,headers});
// The RPC revision alone is not independent evidence that the expected
// respondent's answers reached durable chart history. Read back the exact row
// before reporting success; an ambiguous outcome must not invite an unsafe retry.
const unverifiedSave='Save was acknowledged but chart readback could not be verified. Keep this page open and contact the office before retrying.';
let readback;
try{
 readback=await ctx.supabase.from('connected_assignment_responses')
  .select('assignment_id,respondent_id,answers,page,revision,status,identity_confirmed')
  .eq('assignment_id',b.id).eq('respondent_id',ctx.user.id).maybeSingle();
}catch{
 return NextResponse.json({error:unverifiedSave},{status:503,headers});
}
const {data:stored,error:readError}=readback;
const persisted=stored?.answers;
const expectedEntries=Object.entries(s.answers);
if(readError||!stored||stored.assignment_id!==b.id||stored.respondent_id!==ctx.user.id||
 stored.revision!==data||stored.page!==s.page||
 stored.status!==(s.submit?'submitted':'draft')||stored.identity_confirmed!==true||
 !persisted||typeof persisted!=='object'||Array.isArray(persisted)||
 Object.keys(persisted).length!==expectedEntries.length||
 expectedEntries.some(([key,value])=>persisted[key]!==value))
 return NextResponse.json({error:unverifiedSave},{status:503,headers});
// A revocation or recipient/chart reassignment between the write and durable
// readback must never be reported as a currently authorized saved questionnaire.
// The save itself may have committed; instruct the recipient not to retry blindly.
let current;
try{current=await access(b.id);}
catch{return NextResponse.json({error:unverifiedSave},{status:503,headers});}
// A post-commit reassignment can change the questionnaire content without
// updating the stored source hash. A stale pre-save definition cannot prove the
// CURRENT assignment is still a valid, sealed instrument.
let currentInstrumentVerified=false;
if(current)try{
 currentInstrumentVerified=checkedSource(current.a.connected_source,current.a.connected_source_hash).testKey===d.testKey;
}catch{ /* Keep an acknowledged-but-unverified save locked from blind retry. */ }
if(!current||!currentInstrumentVerified||current.user.id!==ctx.user.id||
 current.a.patient_id!==ctx.a.patient_id||
 current.a.test_key!==ctx.a.test_key||
 current.a.recipient_email!==ctx.a.recipient_email||
 current.a.connected_source_hash!==ctx.a.connected_source_hash||
 current.a.expires_at!==ctx.a.expires_at)
 return NextResponse.json({error:'Invitation authorization changed during save. Keep this page open and contact the office before retrying.'},{status:503,headers});
return NextResponse.json({saved:true,revision:data,status:s.submit?'submitted':'draft'},{headers});}
catch(e){
 // Only known input-validation messages are safe to return. An unexpected
 // provider/source exception must not expose private chart or database details.
 const safeMessages=new Set(['Invalid save request.','Confirm the named recipient and use a valid page.','Invalid answers.','Unknown question or invalid response.','Answer earlier pages before advancing.','Answer every question before submitting.']);
 const safe=e instanceof Error&&safeMessages.has(e.message);
 return NextResponse.json({error:safe?(e as Error).message:'Questionnaire source or answers could not be verified. Contact the office.'},{status:safe?400:409,headers});
}
}
