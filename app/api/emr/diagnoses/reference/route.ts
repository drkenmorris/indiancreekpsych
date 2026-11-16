import {NextResponse} from 'next/server';
import {modalityAccess} from '@/lib/emr/modality-access';
import {privateHeaders} from '@/lib/emr/access';
import {diagnosticReference} from '@/lib/emr/diagnosis-reference';
import {coverageText} from '@/lib/emr/diagnosis-coverage';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 if(!await modalityAccess())return NextResponse.json({error:'Clinic sign-in and MFA required.'},{status:403,headers:privateHeaders});
 const query=new URL(request.url).searchParams;
 if(query.get('coverage')==='1')return new Response(coverageText(),{headers:{...privateHeaders,'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="DSM-Code-Coverage-Audit.txt"'}});
 const code=query.get('code')??'';
 if(!/^[A-Z][0-9]{2}(?:\.[A-Z0-9]{1,4})?$/.test(code))return NextResponse.json({error:'Select a valid diagnosis code.'},{status:400,headers:privateHeaders});
 const reference=diagnosticReference(code);
 return reference?NextResponse.json(reference,{headers:privateHeaders}):NextResponse.json({error:'Code is not in the current EMR catalog.'},{status:404,headers:privateHeaders});
}
