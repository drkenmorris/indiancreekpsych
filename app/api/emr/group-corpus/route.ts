import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {validGroupCorpus,validGroupCorpusDocument} from '@/lib/emr/group-corpus';
export const dynamic='force-dynamic';
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:privateHeaders});
export async function GET(request:Request){
 const ctx=await emrAccess();if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const params=new URL(request.url).searchParams,id=params.get('id'),after=params.get('after');if(id&&!uuid(id)||after&&!uuid(after)||id&&after)return reply({error:'Valid group reference required.'},400);
 if(id){const {data,error}=await ctx.supabase.from('emr_group_corpora').select('id,revision,document,updated_at').eq('owner_id',ctx.user.id).eq('id',id).maybeSingle();if(error)return reply({error:'Group corpus unavailable.'},503);if(!data)return reply({error:'Group corpus not found.'},404);if(!validGroupCorpus(data))return reply({error:'Saved group corpus could not be verified.'},503);return reply(data);}
 let query=ctx.supabase.from('emr_group_corpora').select('id,group_name,revision,updated_at').eq('owner_id',ctx.user.id).order('id',{ascending:true});if(after)query=query.gt('id',after);const {data,error}=await query.limit(51);if(error)return reply({error:'Group corpus directory unavailable.'},503);const groups=(data??[]).slice(0,50);return reply({groups,nextCursor:data&&data.length>50?groups.at(-1)!.id:null});
}
export async function POST(request:Request){
 const ctx=await emrAccess();if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA and same-origin request required.'},403);
 try{const raw=await request.text();if(Buffer.byteLength(raw)>650000)return reply({error:'Group corpus request is too large.'},413);const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==3||!uuid(body.id)||!Number.isSafeInteger(body.revision)||body.revision<0||!validGroupCorpusDocument(body.document))return reply({error:'Enter a group name and focus, and complete the subject, objective and planned implementation for each added session.'},400);
 const {data,error}=await ctx.supabase.rpc('save_emr_group_corpus',{p_id:body.id,p_expected:body.revision,p_document:body.document});if(error)return reply({error:error.code==='40001'?'This group changed in another session or is unavailable. Reload and review before saving.':error.code==='42501'?'Group corpus authorization denied.':'Group corpus was not saved. Your draft is retained.'},error.code==='40001'?409:error.code==='42501'?403:error.code==='22023'?400:503);if(!validGroupCorpus(data)||data.id!==body.id||data.revision!==body.revision+1)return reply({error:'Group corpus save could not be confirmed. Reload before retrying.'},503);return reply(data);
 }catch{return reply({error:'Invalid group corpus request.'},400);}
}
