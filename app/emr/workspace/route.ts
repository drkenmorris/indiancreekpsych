import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {NextResponse} from 'next/server';
import {patientAccess} from '@/lib/patient/access';
import {emrAccess,privateHeaders} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';

export const dynamic='force-dynamic';

// The original full clinical UI is served only for a real central patient UUID after
// both the administrator gate and the EMR's explicit aal2 MFA/RLS checks.
export async function GET(request:Request){
 // Preserve the original BPS section and patient UUID across clinic sign-in/MFA.
 // A fixed same-site pathname prevents caller-controlled redirect destinations.
 const requested=new URL(request.url);
 const params=new URLSearchParams();
 for(const key of ['patient','module','section','bps_page']){
  const value=requested.searchParams.get(key);
  if(value&&value.length<=160)params.set(key,value);
 }
 const returnTo='/emr/workspace'+(params.size?'?'+params.toString():'');
 await patientAccess(true,returnTo);
 const ctx=await emrAccess();
 if(!ctx)return NextResponse.redirect(new URL('/account/security?next='+encodeURIComponent(returnTo),request.url));
 const id=requested.searchParams.get('patient');
 if(id&&!uuid(id))return NextResponse.json({error:'Invalid patient ID.'},{status:400,headers:privateHeaders});
 if(id){
 const {data,error}=await ctx.supabase.from('clinical_patients').select('id').eq('id',id).maybeSingle();
 if(error)return NextResponse.json({error:'Patient authorization could not be verified.'},{status:503,headers:privateHeaders});
 if(!data)return NextResponse.json({error:'Patient unavailable.'},{status:404,headers:privateHeaders});
 }
 // Legacy direct workspace links omitted both module and section, silently opening
 // Demographics instead of the owner's primary original biopsychosocial interface.
 // Canonicalize only those links AFTER clinic MFA and patient authorization; preserve
 // every explicit clinical deep link and the existing scheduler/assignment services.
 if(!requested.searchParams.has('module')&&!requested.searchParams.has('section')){
  params.set('module','assessment');
  params.set('section','assessment:biopsychosocial');
  return NextResponse.redirect(new URL('/emr/workspace?'+params.toString(),request.url),307);
 }
 try{
  return new Response(await readFile(join(process.cwd(),'public/emr-assets/index.html'),'utf8'),{
   headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store',
    'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",
    'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
  });
 }catch{return NextResponse.json({error:'Clinical workspace files unavailable.'},{status:503,headers:privateHeaders});}
}
