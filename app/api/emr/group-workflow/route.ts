import {NextResponse} from 'next/server';
import {groupAccess} from '@/lib/emr/group-access';
import {privateHeaders,sameOrigin} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import {validSetup,validPlanningItems,validNoteInput} from '@/lib/emr/groups-workflow';
export const dynamic='force-dynamic';
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:privateHeaders});
const noteColumns='id,group_id,group_revision,library_revision,start_at,end_at,group_snapshot,facilitator_snapshot,selections,narrative,created_at';
export async function GET(request:Request){
 const ctx=await groupAccess();if(!ctx)return reply({error:'Enrolled provider sign-in and MFA required.'},403);
 const p=new URL(request.url).searchParams,kind=p.get('kind')??'groups',id=p.get('id'),after=p.get('after');
 if(id&&!uuid(id)||after&&!uuid(after))return reply({error:'Valid record reference required.'},400);
 if(kind==='patients'){
  if(!ctx.admin)return reply({error:'Administrator access required.'},403);const {data,error}=await ctx.supabase.rpc('emr_group_patient_directory',{p_after:after??null});if(error)return reply({error:'Patient directory unavailable.'},503);const patients=(data??[]).slice(0,100);return reply({patients,nextCursor:data&&data.length>100?patients.at(-1)!.id:null});
 }
 if(kind==='groups'){
  const providers=await ctx.supabase.rpc('emr_modality_directory',{p_include_staff:false});if(providers.error)return reply({error:'Practice provider roster unavailable.'},503);
  let q=ctx.supabase.from('emr_therapy_groups').select('id,revision,document,timezone').order('id',{ascending:true});if(id)q=q.eq('id',id);if(after)q=q.gt('id',after);const {data,error}=await q.limit(51);if(error)return reply({error:'Group directory unavailable.'},503);if(id&&!data?.length)return reply({error:'Group unavailable or not assigned to you.'},404);const groups=(data??[]).slice(0,50);return reply({groups,nextCursor:data&&data.length>50?groups.at(-1)!.id:null,admin:ctx.admin,userId:ctx.user.id,providers:(providers.data??[]).filter((v:{enrolled:boolean})=>v.enrolled)});
 }
 if(kind==='library'){
  if(!id)return reply({error:'Select a group.'},400);const g=await ctx.supabase.from('emr_therapy_groups').select('id').eq('id',id).maybeSingle();if(g.error||!g.data)return reply({error:'Group unavailable or not assigned to you.'},404);const {data,error}=await ctx.supabase.from('emr_group_planning_libraries').select('revision,items').eq('group_id',id).maybeSingle();if(error)return reply({error:'Group planning library unavailable.'},503);if(data&&!validPlanningItems(data.items))return reply({error:'Saved planning library could not be verified.'},503);return reply({groupId:id,revision:data?.revision??0,items:data?.items??[]});
 }
 if(kind==='note'){
  if(!id)return reply({error:'Select a note.'},400);const {data,error}=await ctx.supabase.from('emr_group_clinical_notes').select(noteColumns).eq('id',id).maybeSingle();if(error)return reply({error:'Group note unavailable.'},503);return data?reply(data):reply({error:'Group note unavailable.'},404);
 }
 if(kind==='history'){
  if(!id)return reply({error:'Select a group.'},400);const before=p.get('before'),bid=p.get('beforeId');if((before||bid)&&(!before||!uuid(bid)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(before)||!Number.isFinite(Date.parse(before))))return reply({error:'Invalid history cursor.'},400);
  const g=await ctx.supabase.from('emr_therapy_groups').select('id').eq('id',id).maybeSingle();if(g.error||!g.data)return reply({error:'Group unavailable or not assigned to you.'},404);
  let q=ctx.supabase.from('emr_group_clinical_notes').select('id,group_id,start_at,end_at,group_snapshot,facilitator_snapshot,created_at').eq('group_id',id).order('start_at',{ascending:false}).order('id',{ascending:false});if(before&&bid)q=q.or('start_at.lt.'+before+',and(start_at.eq.'+before+',id.lt.'+bid+')');const {data,error}=await q.limit(51);if(error)return reply({error:'Group note history unavailable.'},503);const notes=(data??[]).slice(0,50),last=notes.at(-1);return reply({notes,nextCursor:data&&data.length>50&&last?{start:last.start_at,id:last.id}:null});
 }
 return reply({error:'Unknown group resource.'},400);
}
export async function POST(request:Request){
 const ctx=await groupAccess();if(!ctx||!sameOrigin(request))return reply({error:'Provider MFA and same-origin request required.'},403);
 try{const raw=await request.text();if(Buffer.byteLength(raw)>650000)return reply({error:'Group record is too large.'},413);const b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))return reply({error:'Invalid group request.'},400);
 let result;
 if(b.action==='group'){
  if(!ctx.admin)return reply({error:'Only an administrator can change group setup.'},403);if(Object.keys(b).length!==4||!uuid(b.id)||!Number.isSafeInteger(b.revision)||b.revision<0||!validSetup(b.document))return reply({error:'Complete group name, subject, weekly time ranges and assigned facilitators.'},400);result=await ctx.supabase.rpc('save_emr_therapy_group',{p_id:b.id,p_revision:b.revision,p_document:b.document});
 }else if(b.action==='library'){
  if(Object.keys(b).length!==4||!uuid(b.groupId)||!Number.isSafeInteger(b.revision)||b.revision<0||!validPlanningItems(b.items))return reply({error:'Each library item needs a subject and valid bounded text.'},400);result=await ctx.supabase.rpc('save_emr_group_library',{p_group:b.groupId,p_revision:b.revision,p_items:b.items});
 }else if(b.action==='note'){
  if(Object.keys(b).length!==3||!uuid(b.id)||!validNoteInput(b.note))return reply({error:'Choose the group planning items, facilitators and session times; enter and review the group-wide clinical note.'},400);result=await ctx.supabase.rpc('save_emr_group_clinical_note',{p_id:b.id,p_note:b.note});
 }else return reply({error:'Unknown group action.'},400);
 if(result.error){const c=result.error.code;return reply({error:c==='40001'?'Group or planning data changed. Reload and review before retrying.':c==='42501'?'Group authorization denied.':c==='22023'?'Check the group fields and select only current assigned providers, patients and planning choices.':'Group save was not confirmed. Your draft is retained.'},c==='40001'?409:c==='42501'?403:c==='22023'?400:503);}
 return reply({value:result.data});
 }catch{return reply({error:'Invalid group request.'},400);}
}
