'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
export default function ResetPassword(){
 const client=useMemo(()=>createClient(),[]);
 const [ready,setReady]=useState(false),[loading,setLoading]=useState(true),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;void client.auth.getUser().then(({data,error})=>{if(active){setReady(!error&&Boolean(data.user));setLoading(false);}}).catch(()=>{if(active)setLoading(false);});return()=>{active=false;};},[client]);
 async function submit(e:FormEvent){e.preventDefault();setMessage('');if(password!==confirm){setMessage('The two passwords do not match.');return;}if(password.length<12){setMessage('Use a password with at least 12 characters.');return;}
  setBusy(true);try{
   const {data:identity,error:identityError}=await client.auth.getUser();
   if(identityError||!identity.user){setReady(false);setMessage('Your recovery session expired. Request a new link.');return;}
   const {error}=await client.auth.updateUser({password});
   if(error){setMessage(error.code==='weak_password'?'Choose a stronger password and try again.':'Your password was not updated. The link may have expired or the password may not meet the account requirements. Request a new link if needed.');return;}
   setPassword('');setConfirm('');setDone(true);
   const {error:signOutError}=await client.auth.signOut({scope:'global'});
   setMessage(signOutError?'Password updated. Existing sessions could not all be signed out; sign out before signing in again.':'Password updated successfully. Sign in again with your new password. Your existing second-step verification still applies.');
  }catch{setMessage('The request could not be confirmed. Try signing in with the new password before requesting another recovery link.');}finally{setBusy(false);}
 }
 return <main className="icp-shell-center authPage"><section className="authCard"><h1>Set your new password</h1><p>Enter your new password here. Do not send it to practice staff or paste it into a chat.</p>
 {loading?<p role="status">Checking recovery session…</p>:!ready&&!done?<p role="alert">A valid recovery link or signed-in session is required. <Link href="/forgot-password">Request a new recovery link</Link>.</p>:!done?<form className="authForm" onSubmit={submit}><label>New password<input type="password" autoComplete="new-password" required minLength={12} disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm new password<input type="password" autoComplete="new-password" required minLength={12} disabled={busy} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><p>Use at least 12 characters. Existing administrator permissions and second-step verification are preserved.</p><button disabled={busy}>{busy?'Updating password…':'Update password'}</button></form>:null}
 {message&&<p role="status">{message}</p>}<p><Link href="/login">Back to sign in</Link> · <Link href="/forgot-password">Request another recovery link</Link></p></section></main>;
}
