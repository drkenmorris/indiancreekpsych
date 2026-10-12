'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/client';

type State={active:boolean;expires_at:string|null;remaining:number;max_accounts:number;account_hours:number};
type Credential={email:string;password:string;expires_at:string;needs_mfa:boolean};

export default function PatientTestAccountControls(){
 const supabase=useMemo(()=>createClient(),[]);
 const [state,setState]=useState<State|null>(null);
 const [credential,setCredential]=useState<Credential|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 async function call(action:'status'|'enable'|'disable'|'create'){
  setBusy(true);setError('');setMessage('');
  if(action!=='status')setCredential(null);
  try{
   const {data,error:requestError}=await supabase.functions.invoke('patient-test-accounts',{body:{action}});
   if(requestError||!data||data.error)throw new Error(data?.error||'The server did not accept this request. Verify that you are signed in with your administrator account and second factor.');
   if(data.state)setState(data.state as State);
   if(action==='create'){
    setCredential(data as Credential);
    setState(previous=>previous?{...previous,remaining:Math.max(0,previous.remaining-1)}:previous);
    setMessage('Synthetic patient created. The credentials are displayed only here; copy them now. No confirmation email was sent.');
   }
   if(action==='enable')setMessage('Synthetic account creation is available for up to one hour.');
   if(action==='disable')setMessage('No more synthetic accounts can be created until an administrator re-enables testing.');
  }catch(e){setError(e instanceof Error?e.message:'Unable to contact Supabase.');}
  finally{setBusy(false);}
 }
 useEffect(()=>{void call('status');},[]); // runs once for this administrator session
 const active=state?.active&&state.expires_at&&new Date(state.expires_at)>new Date();
 return <section className="appointmentPanel">
  <h2>Temporary patient test accounts</h2>
  <p>This is a <strong>restricted testing mode</strong>, not a switch that turns off email verification for the public. All ordinary patient accounts still require a confirmed email.</p>
  <p><strong>Security limits:</strong> Only a verified administrator with multifactor authentication can enable it. The creation window closes after 60 minutes, with a maximum of five synthetic accounts per window. Each test account loses access to protected patient functions after 24 hours. Use fictional information only.</p>
  {state&&<p role="status"><strong>Status:</strong> {active?'Enabled':'Disabled or expired'} · Accounts remaining: {state.remaining}/{state.max_accounts}. {active?'Creation ends '+new Date(state.expires_at!).toLocaleString():''}</p>}
  <div className="intakeActionRow">
   <button type="button" disabled={busy} onClick={()=>void call('enable')}>Enable 60-minute test mode</button>
   <button type="button" className="secondaryAction" disabled={busy||!active} onClick={()=>void call('disable')}>Turn test mode off</button>
   <button type="button" disabled={busy||!active||!state?.remaining} onClick={()=>void call('create')}>Create confirmed test patient (no email)</button>
  </div>
  {credential&&<section className="intakePreviewNotice" aria-live="polite">
   <h3>New synthetic patient credentials</h3>
   <p><strong>Email:</strong> <code>{credential.email}</code></p>
   <p><strong>Temporary password:</strong> <code>{credential.password}</code></p>
   <p>Patient access expires {new Date(credential.expires_at).toLocaleString()}. This information disappears if the page is reloaded.</p>
   <button type="button" onClick={()=>void navigator.clipboard.writeText(`Test patient login\nEmail: ${credential.email}\nPassword: ${credential.password}\nLogin: https://www.indiancreekpsych.com/login`)}>Copy test login details</button>
   <p><Link href="/login?next=/patient/intake">Open patient sign-in</Link> — sign out of the administrator account first, or use a private browser window. The test patient still needs authenticator/passkey verification for protected intake.</p>
  </section>}
  {message&&<p role="status" className="authMessage">{message}</p>}
  {error&&<p role="alert" className="calendarError">{error}</p>}
  <p><Link href="/admin/intake-preview">Open editable questionnaire preview (does not save patient information)</Link> · <Link href="/admin/intake-kiosk">Start office iPad intake</Link></p>
 </section>;
}
