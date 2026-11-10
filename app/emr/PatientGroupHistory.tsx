'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import PatientGroupProgressNotes from './PatientGroupProgressNotes';
type Session={id:string;group_name:string;scheduled_start:string;duration_minutes:number;shared_topic:string;attendance:'Present'|'Absent'|'Excused';created_at:string};
export default function PatientGroupHistory({patientId}:{patientId:string}){
 const [sessions,setSessions]=useState<Session[]>([]);
 const [activeSession,setActiveSession]=useState<string|null>(null);
 const [timezone,setTimezone]=useState('');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
   let current=true;
   setSessions([]);setActiveSession(null);setTimezone('');setError('');setLoading(true);
   fetch('/api/emr/groups/patient?patient='+encodeURIComponent(patientId),{cache:'no-store'})
    .then(async response=>{
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'Group attendance could not be loaded.');
      if(!Array.isArray(data.sessions)||typeof data.timezone!=='string')throw Error('Invalid group attendance response.');
      if(current){setSessions(data.sessions);setTimezone(data.timezone);}
    })
    .catch(e=>{if(current)setError(e instanceof Error?e.message:'Group attendance unavailable.');})
    .finally(()=>{if(current)setLoading(false);});
   return ()=>{current=false;};
 },[patientId]);
 return <article className="centralCard"><h2>Patient group-session history</h2>
   <p>Read-only central attendance and shared group topics for this patient only. This is not an individualized progress note, a clinician signature, or a billing claim.</p>
   {loading?<p role="status">Loading patient group attendance…</p>:error?<p role="alert">{error} Existing chart records remain available.</p>:
   sessions.length===0?<p>No central group-session attendance has been recorded for this patient.</p>:
   <ol>{sessions.map(s=><li key={s.id}>
     <strong>{s.group_name}</strong> — {new Date(s.scheduled_start).toLocaleString('en-US',{timeZone:timezone})}
     <p>Attendance: {s.attendance} · {s.duration_minutes} minutes · Shared topic: {s.shared_topic}</p>
     {s.attendance==='Present'&&<><button type="button" onClick={()=>setActiveSession(current=>current===s.id?null:s.id)}>{activeSession===s.id?'Close individual notes':'Open individual notes for this attended session'}</button>
      {activeSession===s.id&&<PatientGroupProgressNotes key={patientId+':'+s.id} patientId={patientId} sessionId={s.id} groupName={s.group_name}/>}</>}
   </li>)}</ol>}
   <p><Link href="/emr/groups">Open protected group session records</Link></p>
 </article>;
}
