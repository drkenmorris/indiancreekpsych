import type {ReactNode} from 'react';
import {createClient} from '@/lib/supabase/server';
import EmrNavigationShell from './navigation/EmrNavigationShell';
export default async function EmrLayout({children}:{children:ReactNode}){
 // Display only the authenticated provider's own profile. Each page retains its
 // existing role, MFA and patient authorization checks.
 let providerName='Signed-in provider';
 try{
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  const profile=user?await supabase.from('profiles').select('full_name').eq('id',user.id).maybeSingle():null;
  if(!profile?.error&&typeof profile?.data?.full_name==='string')providerName=profile.data.full_name.trim()||providerName;
 }catch{/* Profile display does not replace or bypass the page's access checks. */}
 return <EmrNavigationShell providerName={providerName}>{children}</EmrNavigationShell>;
}
