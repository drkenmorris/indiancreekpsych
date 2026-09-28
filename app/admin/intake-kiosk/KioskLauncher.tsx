'use client';
import {FormEvent,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

export default function KioskLauncher(){
 const supabase=useMemo(()=>createClient(),[]);
 const [name,setName]=useState('');
 const [dob,setDob]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [url,setUrl]=useState('');
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');setUrl('');
  const {data,error}=await supabase.rpc('create_intake_kiosk_session',{p_patient_name:name,p_date_of_birth:dob});
  if(error||!data)setError(error?.message??'Unable to prepare the intake session.');
  else setUrl(window.location.origin+'/intake/kiosk/'+data);
  setBusy(false);
 }
 return <div>
  {!url?<form className="authForm" onSubmit={submit}>
   <label>Patient full legal name<input required autoComplete="off" value={name} onChange={e=>setName(e.target.value)}/></label>
   <label>Date of birth<input required type="date" value={dob} onChange={e=>setDob(e.target.value)}/></label>
   <button disabled={busy} type="submit">{busy?'Preparing…':'Prepare Intake'}</button>
   {error&&<p className="calendarError" role="alert">{error}</p>}
  </form>:<section className="authForm" aria-live="polite">
   <p className="authMessage">The temporary intake session is ready. Hand the iPad to the patient before continuing.</p>
   <a className="primaryButton" style={{textAlign:'center',fontSize:'18px',padding:'18px 24px'}} href={url}>Begin Patient Intake</a>
   <button className="secondaryAction" type="button" onClick={()=>{setUrl('');setName('');setDob('');}}>Prepare a different intake</button>
  </section>}
 </div>;
}