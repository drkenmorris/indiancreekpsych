import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {defaultEmrSettings,validEmrSettings} from '@/lib/emr/settings';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:privateHeaders});
export async function GET(){
 const ctx=await emrAccess();if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const result=await ctx.supabase.from('emr_account_settings').select('revision,settings').eq('account_id',ctx.user.id).maybeSingle();
 if(result.error)return reply({error:'Account settings could not be loaded. No browser-only settings were substituted.'},503);
 if(result.data&&!validEmrSettings(result.data.settings))return reply({error:'Saved settings need administrator review.'},503);
 return reply(result.data??{revision:0,settings:defaultEmrSettings});
}
export async function POST(request:Request){
 const ctx=await emrAccess();if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in and MFA required.'},403);
 try{
  const raw=await request.text();if(Buffer.byteLength(raw)>20000)return reply({error:'Settings are too large.'},400);
  const {settings,revision}=JSON.parse(raw);
  if(!validEmrSettings(settings)||!Number.isSafeInteger(revision)||revision<0)return reply({error:'Complete valid account settings and custom field definitions.'},400);
  const patch={settings,revision:revision+1};
  const query=revision===0?ctx.supabase.from('emr_account_settings').insert({...patch,account_id:ctx.user.id}):ctx.supabase.from('emr_account_settings').update(patch).eq('account_id',ctx.user.id).eq('revision',revision);
  const saved=await query.select('revision,settings').maybeSingle();
  if(!saved.data&&(!saved.error||['23505','40001'].includes(saved.error.code)))return reply({error:'Settings changed in another session. Reopen this page and review before saving again.'},409);
  return saved.error?reply({error:'Account settings were not saved. Your form remains available.'},503):reply(saved.data);
 }catch{return reply({error:'Invalid settings request.'},400);}
}
