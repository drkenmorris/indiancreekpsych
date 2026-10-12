import {redirect} from 'next/navigation';
import Link from 'next/link';
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
  <p>Create a new temporary questionnaire session using the patient name and date of birth. Each session expires after eight hours, and a submitted session cannot be edited.</p><p>For a safe test without creating a patient record, <Link href="/admin/intake-preview">open the editable questionnaire preview</Link>. To verify Supabase draft saving, create a fresh office session using clearly fictional information.</p>
  <KioskLauncher/>
 </section></main>;
}