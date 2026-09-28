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
  if(error||!data)setError(error?.message??'Unable to start session.');
  else setUrl(window.location.origin+'/intake/kiosk/'+data);
  setBusy(false);
 }
 return <form className="authForm" onSubmit={submit}>
  <label>Full name<input required value={name} onChange={e=>setName(e.target.value)}/></label>
  <label>Date of birth<input required type="date" value={dob} onChange={e=>setDob(e.target.value)}/></label>
  <button disabled={busy} type="submit">{busy?'Preparing…':'Prepare form'}</button>
  {error&&<p role="alert">{error}</p>}
  {url&&<a href={url}>Begin form →</a>}
 </form>;
}