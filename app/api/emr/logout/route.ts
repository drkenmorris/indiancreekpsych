import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
export async function POST(request:Request){
 const ctx=await emrAccess();
 if(!ctx||!sameOrigin(request))return NextResponse.json({error:'Administrator sign-in and MFA required.'},{status:403,headers:privateHeaders});
 const {error}=await ctx.supabase.auth.signOut();
 return NextResponse.json(error?{error:'Sign out could not be completed.'}:{signedOut:true},{status:error?503:200,headers:privateHeaders});
}
