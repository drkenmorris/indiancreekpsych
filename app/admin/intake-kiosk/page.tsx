import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import KioskLauncher from './KioskLauncher';

export default async function Page(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:profile}=await supabase.from('profiles').select('account_type').eq('id',user.id).single();
 if(!profile||!['staff','admin'].includes(profile.account_type))redirect('/account');
 return <main className="authPage intakePage"><section className="appointmentPanel kioskLauncher">
  <p className="eyebrow">Front desk</p>
  <h1>Start intake</h1>
  <p>Create a temporary session on this device. The session expires automatically after eight hours.</p>
  <KioskLauncher/>
 </section></main>;
}