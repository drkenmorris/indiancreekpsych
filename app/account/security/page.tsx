import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {safeNext} from '@/lib/patient/redirect';
import SecurityClient from './SecurityClient';
export default async function SecurityPage({searchParams}:{searchParams:Promise<{next?:string}>}){
 const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect('/login');
 if(!user.email_confirmed_at)return <main className="authPage"><h1>Verify your email</h1><p>Open your registration email and follow its verification link before continuing.</p><Link href="/account">Account</Link></main>;
 const {data:role,error:activationError}=await supabase.rpc('complete_registration');
 if(activationError)return <main className="authPage"><h1>Account setup unavailable</h1><p role="alert">Please try again later.</p></main>;
 return <main className="authPage intakePage"><Link href="/account">← Account</Link><h1>Secure your account</h1><SecurityClient next={safeNext((await searchParams).next??(role==='patient'?'/patient/intake':'/account'))}/></main>;
}
