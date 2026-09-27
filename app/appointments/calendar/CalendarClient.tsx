'use client';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {createClient} from '@/lib/supabase/client';
import {CalendarAppointment,localParts,monthDays,monthQueryRange,shiftMonth} from '@/lib/scheduling/calendar';
type Patient={id:string;full_name:string|null;preferred_name:string|null};
export default function CalendarClient({timezone,duration,onBook}:{timezone:string;duration:number;onBook?:()=>void}) {
 const supabase=useMemo(()=>createClient(),[]);
 const today=localParts(new Date().toISOString(),timezone).date;
 const [month,setMonth]=useState(today.slice(0,7));
 const [appointments,setAppointments]=useState<CalendarAppointment[]>([]);
 const [patients,setPatients]=useState<Patient[]>([]);
 const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false);
 const [error,setError]=useState(''); const [notice,setNotice]=useState('');
 const [selected,setSelected]=useState<CalendarAppointment|null>(null);
 const [edit,setEdit]=useState({date:'',time:'',name:'',scope:'one'});
 const [editError,setEditError]=useState(''); const [confirmCancel,setConfirmCancel]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null); const request=useRef(0);
 const load=useCallback(async()=>{
   const version=++request.current; setLoading(true);setError('');
   const range=monthQueryRange(month);
   try {
     const [bookings,names]=await Promise.all([
       supabase.from('appointments').select('id,patient_id,patient_name,starts_at,ends_at,status,series_id').eq('status','booked').gte('starts_at',range.from).lt('starts_at',range.to).order('starts_at').abortSignal(AbortSignal.timeout(15000)),
       supabase.rpc('scheduling_patients').abortSignal(AbortSignal.timeout(15000))
     ]);
     if(bookings.error)throw new Error('Appointments could not be loaded. Try Refresh.');
     if(names.error)throw new Error('Patient names could not be loaded. Try Refresh.');
     if(version===request.current){setAppointments(bookings.data??[]);setPatients(names.data??[]);}
   } catch(e){if(version===request.current)setError(e instanceof Error?e.message:'Calendar could not be refreshed.');}
   finally {if(version===request.current)setLoading(false);}
 },[month,supabase]);
 useEffect(()=>{void load();return()=>{request.current++;};},[load]);
 useEffect(()=>{if(selected)heading.current?.focus();},[selected]);
 const name=(a:CalendarAppointment)=>a.patient_name||patients.find(p=>p.id===a.patient_id)?.full_name||patients.find(p=>p.id===a.patient_id)?.preferred_name||'Patient account';
 const days=monthDays(month);
 const groups=new Map<string,CalendarAppointment[]>();
 appointments.forEach(a=>{const day=localParts(a.starts_at,timezone).date;if(!day.startsWith(month))return;groups.set(day,[...(groups.get(day)??[]),a]);});
 function open(a:CalendarAppointment){const local=localParts(a.starts_at,timezone);setSelected(a);setEdit({...local,name:name(a),scope:'one'});setEditError('');setConfirmCancel(false);setNotice('');}
 async function change(action:'save'|'cancel') {
   if(!selected||busy)return;setBusy(true);setEditError('');
   try {
     const {data,error:saveError}=await supabase.rpc('edit_calendar_appointments',{
       p_id:selected.id,p_expected_start:selected.starts_at,p_date:edit.date,p_time:edit.time,
       p_patient_name:selected.patient_id?null:edit.name,p_scope:edit.scope,p_action:action
     }).abortSignal(AbortSignal.timeout(20000));
     if(saveError)throw saveError;
     setSelected(null);setNotice(`${data} appointment${data===1?'':'s'} ${action==='save'?'updated':'cancelled'}. Adjacent openings have been recalculated.`);
     if(action==='save'&&edit.date.slice(0,7)!==month)setMonth(edit.date.slice(0,7)); else await load();
   } catch(e){setEditError((e as {message?:string})?.message??'The change could not be confirmed. Refresh before retrying.');}
   finally{setBusy(false);setConfirmCancel(false);}
 }
 function save(e:FormEvent){e.preventDefault();void change('save');}
 const past=selected?Date.parse(selected.starts_at)<=Date.now():false;
 return <div className="calendarWorkspace">
   <header className="calendarHeading"><div><p className="eyebrow">Your practice schedule</p><h2>Booked appointments</h2><p>{timezone} · Click an appointment to view or edit it.</p></div>{onBook?<button type="button" onClick={onBook}>Place patient appointments</button>:<Link className="secondaryButton" href="/appointments">Book appointments & manage hours</Link>}</header>
   <div className="calendarToolbar"><div><button type="button" onClick={()=>{setMonth(shiftMonth(month,-1));setSelected(null);}} disabled={busy} aria-label="Previous month">←</button><button type="button" onClick={()=>{setMonth(today.slice(0,7));setSelected(null);}} disabled={busy}>Today</button><button type="button" onClick={()=>{setMonth(shiftMonth(month,1));setSelected(null);}} disabled={busy} aria-label="Next month">→</button></div><h2 aria-live="polite">{new Date(month+'-15T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})}</h2><button type="button" onClick={()=>void load()} disabled={busy||loading}>Refresh</button></div>
   {notice&&<p role="status" className="authMessage">{notice}</p>}{error&&<p role="alert" className="calendarError">{error} Previously loaded appointments may be out of date.</p>}{loading&&<p role="status">Loading appointments…</p>}
   <div className={selected?'calendarLayout withEditor':'calendarLayout'}>
     <div className="calendarScroll"><table className="monthCalendar" aria-label="Monthly appointment calendar" aria-busy={loading}><thead><tr>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><th scope="col" key={d}>{d}</th>)}</tr></thead><tbody>
       {Array.from({length:6},(_,week)=><tr key={week}>{days.slice(week*7,week*7+7).map(day=><td key={day} className={`${day.slice(0,7)!==month?'outsideMonth ':''}${day===today?'calendarToday':''}`}><time dateTime={day}>{Number(day.slice(8))}</time><div className="calendarEvents">{(groups.get(day)??[]).map(a=><button type="button" className="calendarEvent" key={a.id} disabled={busy||loading||!!error} onClick={()=>open(a)} aria-label={`${name(a)}, ${day}, ${localParts(a.starts_at,timezone).time}`}><span>{new Date(a.starts_at).toLocaleTimeString('en-US',{timeZone:timezone,hour:'numeric',minute:'2-digit'})}{a.series_id?' ↻':''}</span><strong>{name(a)}</strong></button>)}</div></td>)}</tr>)}
     </tbody></table>{!loading&&!error&&groups.size===0&&<p className="appointmentEmpty">No booked appointments in this calendar range. <Link href="/appointments">Place a patient appointment</Link> to see it here.</p>}</div>
     {selected&&<aside className="calendarEditor" aria-labelledby="edit-appointment-title"><div className="calendarEditorHeading"><h2 id="edit-appointment-title" ref={heading} tabIndex={-1}>Appointment details</h2><button type="button" aria-label="Close appointment details" disabled={busy} onClick={()=>setSelected(null)}>×</button></div>
       <p>{name(selected)}</p><p>{new Date(selected.starts_at).toLocaleString('en-US',{timeZone:timezone,dateStyle:'full',timeStyle:'short'})}<br/>{timezone}</p>
       {past?<p>Past appointments are shown for reference and cannot be edited here.</p>:<form className="authForm" onSubmit={save}>
         {!selected.patient_id&&<label>Patient name<input required maxLength={160} value={edit.name} disabled={busy} onChange={e=>setEdit({...edit,name:e.target.value})}/></label>}
         <label>Appointment date<input type="date" required min={today} value={edit.date} disabled={busy} onChange={e=>setEdit({...edit,date:e.target.value})}/></label>
         <label>Start time<input type="time" required value={edit.time} disabled={busy} onChange={e=>setEdit({...edit,time:e.target.value})}/></label>
         <p>Appointments use the current {duration}-minute length and must fit office hours without overlapping bookings or blocked time.</p>
         {selected.series_id&&<label>Apply to<select value={edit.scope} disabled={busy} onChange={e=>{setEdit({...edit,scope:e.target.value});setConfirmCancel(false);}}><option value="one">Only this appointment</option><option value="future">This and future appointments in this series</option></select></label>}
         {edit.scope==='future'&&<p>Future appointments shift by the same number of days and use the new local start time. All changes save together; a conflict leaves the series unchanged.</p>}
         <button type="submit" disabled={busy}>{busy?'Saving…':'Save changes'}</button>
         {confirmCancel?<div className="cancelConfirmation"><p>Cancel {edit.scope==='future'?'this and all future appointments in this series':'this appointment'}?</p><button type="button" disabled={busy} onClick={()=>void change('cancel')}>Confirm cancellation</button><button type="button" disabled={busy} onClick={()=>setConfirmCancel(false)}>Keep appointment</button></div>:<button className="calendarCancel" type="button" disabled={busy} onClick={()=>setConfirmCancel(true)}>Cancel appointment</button>}
       </form>}{editError&&<p className="calendarError" role="alert">{editError}</p>}
     </aside>}
   </div>
 </div>;
}
