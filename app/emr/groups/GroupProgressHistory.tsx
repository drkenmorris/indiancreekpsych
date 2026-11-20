'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {uuid} from '@/lib/emr/demographics';
import '../central-emr.css';
import './groups.css';
type Session={id:string;group_name:string;facilitators:string;scheduled_start:string;duration_minutes:number;shared_topic:string;shared_content:string;created_at:string;participants:{patient_id:string;attendance:'Present'|'Absent'|'Excused'}[]};
type Cursor={start:string;id:string};
export default function GroupProgressHistory({patientId}:{patientId?:string}){
 const [sessions,setSessions]=useState<Session[]>([]),[cursor,setCursor]=useState<Cursor|null>(null),[timezone,setTimezone]=useState(''),[busy,setBusy]=useState(true),[error,setError]=useState(''),[ready,setReady]=useState(false);
 const active=useRef(true),inFlight=useRef(false);
 const load=useCallback(async(before:Cursor|null,signal?:AbortSignal)=>{
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
  try{const query=new URLSearchParams({history:'1'});if(before){query.set('before',before.start);query.set('before_id',before.id);}const response=await fetch('/api/emr/groups?'+query,{cache:'no-store',signal});const data=await response.json();if(!response.ok)throw Error(data.error||'Group progress notes history unavailable.');
   if(!Array.isArray(data.sessions)||typeof data.timezone!=='string'||!data.timezone||!(data.nextCursor===null||data.nextCursor&&uuid(data.nextCursor.id)&&typeof data.nextCursor.start==='string'&&Number.isFinite(Date.parse(data.nextCursor.start))))throw Error('Group history response could not be verified.');
   if(active.current&&!signal?.aborted){setSessions(previous=>before?[...previous,...data.sessions.filter((s:Session)=>!previous.some(p=>p.id===s.id))]:data.sessions);setTimezone(data.timezone);setCursor(data.nextCursor);setReady(true);}
  }catch(e){if(active.current&&!signal?.aborted)setError(e instanceof Error?e.message:'History could not be loaded.');}finally{inFlight.current=false;if(active.current&&!signal?.aborted)setBusy(false);}
 },[]);
 useEffect(()=>{active.current=true;const controller=new AbortController();void load(null,controller.signal);return()=>{active.current=false;controller.abort();inFlight.current=false;};},[load]);
 const when=(value:string)=>new Date(value).toLocaleString('en-US',{timeZone:timezone||'UTC'});
 return <div className="centralEmr groupHistory"><header><h1>Group Progress Notes History</h1><p>Previously saved shared-group notes, listed by session date with the newest first. Expand a listing to read its complete note.</p><Link href={'/emr/groups?section=notes'+(patientId?'&patient='+encodeURIComponent(patientId):'')}>New Group Progress Note</Link></header>
 <section className="centralCard" aria-label="Saved group progress notes"><button type="button" disabled={busy} onClick={()=>void load(null)}>Refresh history</button>{error&&<p role="alert">{error}</p>}<p role="status">{busy?'Loading group progress notes…':ready?sessions.length+' saved notes loaded.':''}</p>
 {ready&&sessions.length===0&&<p>No group progress notes have been saved through the shared-group workflow.</p>}
 {sessions.map(s=><details key={s.id}><summary>{s.group_name} · {when(s.scheduled_start)} · {s.shared_topic}</summary><dl><dt>Facilitator(s)</dt><dd>{s.facilitators}</dd><dt>Duration</dt><dd>{s.duration_minutes} minutes</dd><dt>Shared topic</dt><dd>{s.shared_topic}</dd><dt>Shared group progress note</dt><dd className="groupNoteText">{s.shared_content}</dd><dt>Attendance</dt><dd>{(['Present','Absent','Excused'] as const).map(status=>status+': '+s.participants.filter(p=>p.attendance===status).length).join(' · ')}</dd><dt>Recorded</dt><dd>{when(s.created_at)}</dd></dl><p>Shared record retained as originally saved. Individual patient clinical notes remain in their own charts.</p></details>)}
 {cursor&&<button type="button" disabled={busy} onClick={()=>void load(cursor)}>Load older group notes</button>}{ready&&!cursor&&sessions.length>0&&<p>All saved group notes have been loaded.</p>}
 </section></div>;
}
