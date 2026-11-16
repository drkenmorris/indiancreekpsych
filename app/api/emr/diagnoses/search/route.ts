import {NextResponse} from 'next/server';
import {modalityAccess} from '@/lib/emr/modality-access';
import {privateHeaders} from '@/lib/emr/access';
import {searchDiagnosticReferences} from '@/lib/emr/diagnosis-search';
import type {ReferenceSearchSource} from '@/lib/emr/diagnosis-search-types';
export const dynamic='force-dynamic';
// POST keeps typed reference terms out of URL history and standard access logs.
export async function POST(request:Request) {
 if(!await modalityAccess())return NextResponse.json({error:'Clinic sign-in and MFA required.'},{status:403,headers:privateHeaders});
 if(Number(request.headers.get('content-length'))>2048)return NextResponse.json({error:'Search request is too large.'},{status:413,headers:privateHeaders});
 let body;
 try{const text=await request.text();if(text.length>2048)throw Error();body=JSON.parse(text);}catch{return NextResponse.json({error:'Enter a valid reference search.'},{status:400,headers:privateHeaders});}
 if(!body||typeof body.query!=='string'||!body.query.trim()||body.query.length>160||!['all','nimh','icd','apa'].includes(body.source??'all')||!Number.isInteger(body.offset??0)||(body.offset??0)<0||(body.offset??0)>500)
  return NextResponse.json({error:'Enter 1–160 characters and choose an available reference source.'},{status:400,headers:privateHeaders});
 return NextResponse.json(searchDiagnosticReferences(body.query.trim(),(body.source??'all') as ReferenceSearchSource,body.offset??0),{headers:privateHeaders});
}
