import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {uuid} from '@/lib/emr/demographics';
import {groupAccess} from '@/lib/emr/group-access';
import GroupWorkspace from './GroupWorkspace';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{section?:string;group?:string}>}){
 const query=await searchParams,section=['planner','notes','history'].includes(query.section??'')?query.section!:'administration';const next='/emr/groups?section='+section+(uuid(query.group)?'&group='+query.group:'');
 const ctx=await groupAccess();if(!ctx){const client=await createClient();const {data:{user}}=await client.auth.getUser();if(!user)redirect('/login?next='+encodeURIComponent(next));const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();if(!user.email_confirmed_at||assurance.data?.currentLevel!=='aal2')redirect('/account/security?next='+encodeURIComponent(next));redirect('/account');}
 if(!ctx.admin&&section==='administration')redirect('/emr/groups?section=planner'+(uuid(query.group)?'&group='+query.group:''));
 return <main><GroupWorkspace key={section+':'+(query.group??'')} section={section} initialGroup={query.group}/></main>;
}
