import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import PatientTestAccountControls from './PatientTestAccountControls';

export const metadata={title:'Temporary Patient Account Testing | Indian Creek Psychological Services'};

export default async function TestAccountsPage(){
 const supabase=await createClient();
 const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError||!user)redirect('/login?next=/admin/test-accounts');
 if(!user.email_confirmed_at)redirect('/account/security?next=%2Fadmin%2Ftest-accounts');
 const {data:profile}=await supabase.from('profiles').select('account_type').eq('id',user.id).maybeSingle();
 if(profile?.account_type!=='admin')redirect('/account');
 const {data:assurance,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
 if(error||assurance?.currentLevel!=='aal2')redirect('/account/security?next=%2Fadmin%2Ftest-accounts');
 return <main className="authPage intakePage"><Link href="/account">← Account</Link>
  <h1>Temporary patient-account testing</h1>
  <PatientTestAccountControls/>
 </main>;
}
