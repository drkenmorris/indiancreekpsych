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
 await patientAccess(true,'/emr/workspace');
 const ctx=await emrAccess();
 if(!ctx)return NextResponse.redirect(new URL('/account/security?next=%2Femr',request.url));
 const id=new URL(request.url).searchParams.get('patient');
 if(id&&!uuid(id))return NextResponse.json({error:'Invalid patient ID.'},{status:400,headers:privateHeaders});
 if(id){
 const {data,error}=await ctx.supabase.from('clinical_patients').select('id').eq('id',id).maybeSingle();
 if(error)return NextResponse.json({error:'Patient authorization could not be verified.'},{status:503,headers:privateHeaders});
 if(!data)return NextResponse.json({error:'Patient unavailable.'},{status:404,headers:privateHeaders});
 }
 try{
  return new Response(await readFile(join(process.cwd(),'public/emr-assets/index.html'),'utf8'),{
   headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store',
    'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",
    'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
  });
 }catch{return NextResponse.json({error:'Clinical workspace files unavailable.'},{status:503,headers:privateHeaders});}
}
