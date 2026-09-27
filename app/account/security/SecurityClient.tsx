'use client';
import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
type Factor={id:string;factor_type:string;status:string;friendly_name?:string};
export default function SecurityClient({next}:{next:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const [factors,setFactors]=useState<Factor[]>([]),[ready,setReady]=useState(false),[loading,setLoading]=useState(true),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[code,setCode]=useState(''),[factorId,setFactorId]=useState(''),[qr,setQr]=useState('');
 async function load(){
  const [list,assurance]=await Promise.all([supabase.auth.mfa.listFactors(),supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
  if(list.error||assurance.error)throw new Error('Security settings could not be loaded. Reload this page.');
  setFactors(list.data.all.filter(f=>f.status==='verified'));setReady(assurance.data.currentLevel==='aal2');setLoaded(true);
 }
 useEffect(()=>{void load().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 async function run(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch(e){setError((e as {message?:string}).message??'Verification could not be completed. Please try again.');}finally{setBusy(false);}}
 async function complete(){const {data,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();if(error||data.currentLevel!=='aal2')throw new Error('Security verification is not complete.');window.location.assign(next);}
 const mayEnroll=loaded&&(ready||factors.length===0);
 async function enrollTotp(){await run(async()=>{
  const {data,error}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'Indian Creek authenticator '+Date.now()});if(error)throw error;
  setFactorId(data.id);setQr(data.totp.qr_code);setCode('');
 });}
 async function passkey(id?:string){await run(async()=>{
  // Stable production RP for both domain aliases; previews use their own hostname.
  const production=window.location.hostname==='indiancreekpsych.com'||window.location.hostname==='www.indiancreekpsych.com';
  const webauthn={rpId:production?'indiancreekpsych.com':window.location.hostname,rpOrigins:production?['https://indiancreekpsych.com','https://www.indiancreekpsych.com']:[window.location.origin]};
  const result=id?await supabase.auth.mfa.webauthn.authenticate({factorId:id,webauthn}):await supabase.auth.mfa.webauthn.register({friendlyName:'Indian Creek device '+Date.now(),webauthn});
  if(result.error)throw result.error;await complete();
 });}
 return <section className="appointmentPanel"><p>After signing in with your password, choose an authenticator-app code or a passkey/device security check. Patient information requires successful second-step verification.</p>
 {loading?<p role="status">Loading security options…</p>:<>
 {ready&&<><p>Your current session is verified.</p><a href={next}>Continue</a></>}
 {factors.map(f=>f.factor_type==='totp'?<button key={f.id} type="button" disabled={busy} onClick={()=>{setFactorId(f.id);setQr('');setCode('');}}>Use authenticator app</button>:f.factor_type==='webauthn'?<button key={f.id} type="button" disabled={busy} onClick={()=>void passkey(f.id)}>Use passkey / device</button>:null)}
 {mayEnroll&&!factorId&&<div><button type="button" disabled={busy} onClick={()=>void enrollTotp()}>Set up authenticator app</button><button type="button" disabled={busy} onClick={()=>void passkey()}>Set up passkey / device</button></div>}
 {factorId&&<form className="authForm" onSubmit={e=>{e.preventDefault();void run(async()=>{const {error}=await supabase.auth.mfa.challengeAndVerify({factorId,code});if(error)throw error;await complete();});}}>
 {qr&&<><p>Scan this code in your authenticator app, then enter its six-digit code.</p><img className="securityQr" src={qr} alt="Authenticator enrollment QR code"/></>}
 <label>Authenticator code<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value)}/></label><button disabled={busy} type="submit">Verify and continue</button></form>}
 </>}
 <p>If you lose access to your authenticator or device, contact the practice for identity-verified recovery. A password reset alone does not remove this security requirement. You can return here from your account to add a backup method after verification.</p>
 {error&&<p role="alert">{error}</p>}
 </section>;
}
