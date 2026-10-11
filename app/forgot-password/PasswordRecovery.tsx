'use client';
import Link from 'next/link';
import {useMemo,useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
import {passwordRecoveryRedirect} from '@/lib/password-recovery';
export default function PasswordRecovery(){
 const client=useMemo(()=>createClient(),[]);
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');try{
  const {error}=await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:passwordRecoveryRedirect(window.location.origin)});
  if(error)throw error;
  setMessage('If an account exists for that email, a recovery link has been requested. Check your inbox and spam folder. Open the newest link in this same browser, then enter your new password on the clinic website.');
 }catch{setMessage('The recovery request could not be completed. Please wait a moment and try again.');}finally{setBusy(false);}}
 return <main className="icp-shell-center authPage"><section className="authCard"><h1>Recover your password</h1><p>Enter your existing Indian Creek account email. Recovery preserves your account and its access permissions.</p>
 <form className="authForm" onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/></label><button disabled={busy}>{busy?'Requesting recovery…':'Send recovery email'}</button></form>
 {message&&<p role="status">{message}</p>}<p><Link href="/login">Back to sign in</Link></p></section></main>;
}
