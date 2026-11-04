import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
export const dynamic='force-dynamic';
const columns='id,kind,domain,label,active,revision,updated_at';
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:privateHeaders});
export async function GET(){
 const ctx=await emrAccess();if(!ctx)return reply({error:'Administrator sign-in and MFA required.'},403);
 const {data,error}=await ctx.supabase.from('emr_descriptors').select(columns).order('domain').order('label').limit(5000);
 return error?reply({error:'Shared library could not be loaded. Try again.'},503):reply({items:data});
}
async function body(request:Request){const text=await request.text();if(Buffer.byteLength(text)>100000)throw Error('Request too large.');return JSON.parse(text);}
function wording(value:unknown,max:number){if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw Error(`Enter wording between 1 and ${max} characters.`);return value.trim();}
function fields(value:Record<string,unknown>){if(!['strength','challenge'].includes(String(value.kind)))throw Error('Choose Strengths or Challenges.');return {kind:String(value.kind),domain:wording(value.domain,120)};}
export async function POST(request:Request){
 const ctx=await emrAccess();if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA, and same-origin request required.'},403);
 try{const value=await body(request),base=fields(value);if(!Array.isArray(value.labels)||!value.labels.length||value.labels.length>100)throw Error('Add between 1 and 100 descriptors at a time.');
 const labels:string[]=value.labels.map((x:unknown)=>wording(x,500));if(new Set(labels.map(x=>x.toLowerCase())).size!==labels.length)throw Error('Remove duplicate descriptors from this batch.');
 const {data,error}=await ctx.supabase.from('emr_descriptors').insert(labels.map(label=>({...base,label}))).select(columns);
 if(error)return reply({error:error.code==='23505'?'An item with this wording already exists in this list. Search the table, including inactive items.':'Items were not saved. Your draft is retained.'},error.code==='23505'?409:503);
 return reply({items:data},201);
 }catch(error){return reply({error:error instanceof Error?error.message:'Invalid request.'},400);}
}
export async function PATCH(request:Request){
 const ctx=await emrAccess();if(!ctx||!sameOrigin(request))return reply({error:'Administrator sign-in, MFA, and same-origin request required.'},403);
 try{const value=await body(request),base=fields(value),label=wording(value.label,500),id=wording(value.id,80);
 if(typeof value.active!=='boolean'||!Number.isSafeInteger(value.revision)||value.revision<1)throw Error('Invalid item revision or status.');
 const {data,error}=await ctx.supabase.from('emr_descriptors').update({...base,label,active:value.active}).eq('id',id).eq('revision',value.revision).select(columns).maybeSingle();
 if(error)return reply({error:error.code==='23505'?'An item with this wording already exists in this list.':'The item was not saved. Your draft is retained.'},error.code==='23505'?409:503);
 if(!data)return reply({error:'This item changed in another session. Reload the table and review the latest wording before saving again.'},409);
 return reply({item:data});
 }catch(error){return reply({error:error instanceof Error?error.message:'Invalid request.'},400);}
}
