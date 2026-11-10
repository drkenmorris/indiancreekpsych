'use client';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import Link from 'next/link';
import '../central-emr.css';
import {groupSessionStartUtc} from '@/lib/emr/group-time';

type Patient={id:string;demographics:Record<string,string>};
type Attendance='Present'|'Absent'|'Excused';
type Session={
 id:string;group_name:string;facilitators:string;scheduled_start:string;duration_minutes:number;
 shared_topic:string;shared_content:string;created_at:string;
 participants:Array<{patient_id:string;attendance:Attendance}>;
};
const patientName=(p:Patient)=>[p.demographics.first_name,p.demographics.last_name].filter(Boolean).join(' ')||'Patient ID '+p.id.slice(0,8);
const fresh=()=>({group_name:'',facilitators:'',scheduled_start:'',duration_minutes:60,shared_topic:'',shared_content:'',reviewed:false});
export default function GroupSessions(){
 const [patients,setPatients]=useState<Patient[]>([]);
 const [sessions,setSessions]=useState<Session[]>([]);
 const [form,setForm]=useState(fresh);
 const [attendance,setAttendance]=useState<Record<string,Attendance|''>>({});
 const [message,setMessage]=useState('');
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [showList,setShowList]=useState(true);
 const names=useMemo(()=>new Map(patients.map(p=>[p.id,patientName(p)])),[patients]);
 const load=useCallback(async()=>{
   const [pr,gr]=await Promise.all([fetch('/api/emr/patients',{cache:'no-store'}),fetch('/api/emr/groups',{cache:'no-store'})]);
   const [p,g]=await Promise.all([pr.json(),gr.json()]);
   if(!pr.ok||!gr.ok)throw Error(p.error||g.error||'Group records unavailable.');
   setPatients(p.patients??[]);setSessions(g.sessions??[]);
 },[]);
 useEffect(()=>{load().catch(e=>setMessage(e instanceof Error?e.message:'Group records unavailable.')).finally(()=>setLoading(false));},[load]);
 const participants=Object.entries(attendance).filter(([,status])=>status!=='').map(([patient_id,status])=>({patient_id,attendance:status as Attendance}));
 async function save(e:FormEvent<HTMLFormElement>){
   e.preventDefault();setSaving(true);setMessage('');
   try{
     if(!form.scheduled_start||participants.length<2)throw Error('Select a start time and at least two distinct central patients.');
     const r=await fetch('/api/emr/groups',{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({...form,scheduled_start:groupSessionStartUtc(form.scheduled_start),participants})});
     const data=await r.json();if(!r.ok)throw Error(data.error||'Save failed.');
     setForm(fresh());setAttendance({});setMessage('Shared group session saved centrally as an immutable reviewed record. Individual clinical notes must be entered in each patient chart.');
     await load();
   }catch(error){setMessage(error instanceof Error?error.message:'Group save was not confirmed.');}
   finally{setSaving(false);}
 }
 return <div className="centralEmr"><header><h1>Group therapy — shared session record</h1><p>Clinic-protected group documentation linked to existing central patient IDs. Store only shared session material here; keep each person's clinical assessment and observations in that individual's chart.</p>
 <nav><Link href="/emr">Central EMR</Link><Link href="/appointments">Clinic scheduling</Link><Link href="/account">Account</Link></nav></header>
 <p role="status">{loading?'Loading authorized group records…':message}</p>
 <article className="centralCard"><h2>Document a group session</h2><p>Records are immutable after saving. Review all content and attendance before submission. This form is not a signature or billing claim.</p>
 <form onSubmit={save}>
  <label>Group name<input required minLength={2} maxLength={160} value={form.group_name} onChange={e=>setForm({...form,group_name:e.target.value,reviewed:false})}/></label>
  <label>Facilitator(s)<input required minLength={2} maxLength={250} value={form.facilitators} onChange={e=>setForm({...form,facilitators:e.target.value,reviewed:false})}/></label>
  <label>Scheduled start (clinic local time)<input type="datetime-local" required value={form.scheduled_start} onChange={e=>setForm({...form,scheduled_start:e.target.value,reviewed:false})}/></label>
  <label>Duration in minutes<input type="number" min={15} max={240} required value={form.duration_minutes} onChange={e=>setForm({...form,duration_minutes:Number(e.target.value),reviewed:false})}/></label>
  <label>Shared topic<input required minLength={2} maxLength={250} value={form.shared_topic} onChange={e=>setForm({...form,shared_topic:e.target.value,reviewed:false})}/></label>
  <label>Shared content (no participant-specific clinical details)<textarea required minLength={2} maxLength={8000} rows={5} value={form.shared_content} onChange={e=>setForm({...form,shared_content:e.target.value,reviewed:false})}/></label>
  <fieldset><legend>Attendance — central patient directory</legend><p>Choose Present, Absent or Excused for each participant. Leave other patients unselected. At least two participants are required.</p>
  <div className="centralFields">{patients.map(p=><label key={p.id}>{patientName(p)}<select value={attendance[p.id]??''} onChange={e=>{setAttendance({...attendance,[p.id]:e.target.value as Attendance|''});setForm({...form,reviewed:false});}}><option value="">Not in group</option><option value="Present">Present</option><option value="Absent">Absent</option><option value="Excused">Excused</option></select></label>)}</div>
  </fieldset>
  <p>{participants.length} participants selected</p>
  <label><input type="checkbox" checked={form.reviewed} onChange={e=>setForm({...form,reviewed:e.target.checked})}/> I reviewed the shared note and attendance, and confirm that participant-specific clinical details are excluded.</label>
  <button disabled={saving||loading||participants.length<2||!form.reviewed}>Save reviewed group session</button>
 </form></article>
 <article className="centralCard"><h2>Saved group sessions ({sessions.length})</h2>
  <button type="button" onClick={()=>setShowList(!showList)}>{showList?'Hide':'Show'} saved sessions</button>
  {showList&&(!sessions.length?<p>No group sessions have been saved through this central workflow.</p>:<ol>{sessions.map(s=><li key={s.id}><h3>{s.group_name} — {new Date(s.scheduled_start).toLocaleString()}</h3>
  <p>Facilitator(s): {s.facilitators} · {s.duration_minutes} minutes</p><p><strong>Topic:</strong> {s.shared_topic}</p><p>{s.shared_content}</p>
  <p>Attendance and individual chart links:</p><ul>{s.participants.map(p=><li key={p.patient_id}><Link href={'/emr/workspace?patient='+encodeURIComponent(p.patient_id)}>{names.get(p.patient_id)||'Central patient '+p.patient_id.slice(0,8)}</Link> — {p.attendance}. Record person-specific clinical notes in this patient's protected chart.</li>)}</ul>
  <small>Saved: {new Date(s.created_at).toLocaleString()} · Immutable group record</small>
  </li>)}</ol>)}
 </article></div>;
}
