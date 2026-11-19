'use client';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {createClient} from '@/lib/supabase/client';
import {CalendarAppointment,localParts,monthDays,monthQueryRange,shiftMonth} from '@/lib/scheduling/calendar';
type Patient={id:string;full_name:string|null;preferred_name:string|null};
/**
 * Treat the scheduler SELECT as an untrusted readback, not proof that the
 * requested booked rows were actually returned. A stale adapter or changed RLS
 * response must not produce misleading calendar controls or expose a row with
 * unverified appointment provenance. Preserve all existing database records.
 */
function verifiedBookedCalendarRows(rows:unknown,from:string,to:string):CalendarAppointment[]{
 const invalid=()=>new Error('Calendar appointment readback could not be verified. Refresh before editing bookings.');
 const id=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
 const lower=Date.parse(from),upper=Date.parse(to);
 if(!Array.isArray(rows)||!Number.isFinite(lower)||!Number.isFinite(upper)||upper<=lower)throw invalid();
 const seen=new Set<string>();
 return rows.map((entry:unknown)=>{
  if(!entry||typeof entry!=='object'||Array.isArray(entry))throw invalid();
  const row=entry as Record<string,unknown>;
  if(typeof row.id!=='string'||!id.test(row.id)||
   (row.patient_id!==null&&(typeof row.patient_id!=='string'||!id.test(row.patient_id)))||
   (row.series_id!==null&&(typeof row.series_id!=='string'||!id.test(row.series_id)))||
   (row.patient_name!==null||typeof row.patient_name==='undefined')&&
    (typeof row.patient_name!=='string'||row.patient_name.length>500)||
   typeof row.starts_at!=='string'||typeof row.ends_at!=='string'||row.status!=='booked')throw invalid();
  const start=Date.parse(row.starts_at as string),end=Date.parse(row.ends_at as string);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||start<lower||start>=upper)throw invalid();
  const normalized=row.id.toLowerCase();
  if(seen.has(normalized))throw invalid();
  seen.add(normalized);
  return {id:row.id,patient_id:row.patient_id as string|null,
   patient_name:row.patient_name as string|null,
   starts_at:row.starts_at as string,ends_at:row.ends_at as string,
   status:'booked',series_id:row.series_id as string|null};
 });
}
/** A successful patient-directory RPC is not proof of a valid roster.
 * Reject malformed, duplicate, or mismatched identifiers before using any
 * returned name to label a central patient chart's calendar appointment.
 * Do not interpolate untrusted clinical directory contents into errors.
 */
function verifiedCalendarPatientRows(rows:unknown):Patient[]{
 const invalid=()=>new Error('Calendar patient roster could not be verified. Refresh before editing bookings.');
 const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
 if(!Array.isArray(rows))throw invalid();
 const seen=new Set<string>();
 return rows.map((entry:unknown)=>{
  if(!entry||typeof entry!=='object'||Array.isArray(entry))throw invalid();
  const patient=entry as Record<string,unknown>;
  if(typeof patient.id!=='string'||!uuid.test(patient.id)||
   (patient.full_name!==null&&(typeof patient.full_name!=='string'||patient.full_name.length>500))||
   (patient.preferred_name!==null&&(typeof patient.preferred_name!=='string'||patient.preferred_name.length>500)))
   throw invalid();
  const id=patient.id.toLowerCase();
  if(seen.has(id))throw invalid();
  seen.add(id);
  return {id:patient.id,full_name:patient.full_name as string|null,
   preferred_name:patient.preferred_name as string|null};
 });
}
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
 const [calendarNeedsReconciliation,setCalendarNeedsReconciliation]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null); const request=useRef(0);
 // A repeated save or cancellation can arrive before React paints the busy state.
 // Protect the actual appointment mutation, not merely its disabled button.
 const mutationInFlight=useRef(false);
 // A lost RPC acknowledgment can occur after the server has committed an edit
 // or cancelled recurring appointments. Never silently enable another write.
 const mutationOutcomeUnknown=useRef(false);
 // Only known transaction-rejecting SQLSTATEs establish a safe retry.
 // In particular connection errors (08xxx), shutdown (57Pxx) and 40003 do not.
 const definitiveCalendarRejection=(code:unknown):boolean=>
   typeof code==='string'&&/^[0-9A-Z]{5}$/.test(code)&&code!=='40003'&&
   (/^(22|23|28|40|42)/.test(code)||code==='P0001');
 // PostgREST/SQL error messages can embed names, chart IDs, SQL arguments or
 // database internals. Never display arbitrary provider messages in the
 // clinical scheduler. Explain a few SQLSTATE codes using authored wording.
 const safeMutationFailure=(failure:unknown):string=>{
   const code=failure&&typeof failure==='object'&&'code' in failure?(failure as {code:unknown}).code:null;
   if(code==='23505'||code==='23P01')return 'Appointment conflict. Refresh the calendar and choose another time.';
   if(code==='42501'||code==='28000')return 'Appointment authorization denied. Verify administrator MFA and scheduling permissions.';
   if(code==='22023'||code==='23503')return 'Appointment details or patient link are invalid. Refresh the calendar before correcting them.';
   if(code==='40001'||code==='40P01')return 'Concurrent scheduling change rejected. Refresh the calendar before retrying.';
   // Preserve only this exact application-authored, PHI-free receipt warning.
   if(failure instanceof Error&&failure.message==='Appointment change was not confirmed. Refresh the calendar before retrying.')return failure.message;
   return 'Appointment change could not be confirmed. Refresh the calendar before proceeding.';
 };
 const load=useCallback(async()=>{
   const version=++request.current;
   // A refresh (including a month switch) invalidates the previously selected
   // edit target. Never leave a stale appointment editable while a new readback
   // is pending, invalid, or rejected by RLS. Clear old patient names as well.
   setSelected(null);setConfirmCancel(false);setAppointments([]);setPatients([]);
   setLoading(true);setError('');
   const range=monthQueryRange(month);
   try {
     const [bookings,names]=await Promise.all([
       supabase.from('appointments').select('id,patient_id,patient_name,starts_at,ends_at,status,series_id').eq('status','booked').gte('starts_at',range.from).lt('starts_at',range.to).order('starts_at').abortSignal(AbortSignal.timeout(15000)),
       supabase.rpc('scheduling_patients').abortSignal(AbortSignal.timeout(15000))
     ]);
     if(bookings.error)throw new Error('Appointments could not be loaded. Try Refresh.');
     if(names.error)throw new Error('Patient names could not be loaded. Try Refresh.');
     const verified=verifiedBookedCalendarRows(bookings.data,range.from,range.to);
     const verifiedPatients=verifiedCalendarPatientRows(names.data);
     if(version===request.current){setAppointments(verified);setPatients(verifiedPatients);}
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
   if(!selected||busy||mutationInFlight.current||mutationOutcomeUnknown.current)return;
   mutationInFlight.current=true;let outcomeUnknown=true;setBusy(true);setEditError('');
   try {
     const {data,error:saveError}=await supabase.rpc('edit_calendar_appointments',{
       p_id:selected.id,p_expected_start:selected.starts_at,p_date:edit.date,p_time:edit.time,
       p_patient_name:selected.patient_id?null:edit.name,p_scope:edit.scope,p_action:action
     }).abortSignal(AbortSignal.timeout(20000));
     if(saveError){
       if(definitiveCalendarRejection(saveError.code))outcomeUnknown=false;
       throw saveError;
     }
     // A transport-level success with no affected rows is not proof that an
     // individual or recurring-series edit/cancellation was committed.
     if(!Number.isSafeInteger(data)||data<1)throw new Error('Appointment change was not confirmed. Refresh the calendar before retrying.');
     outcomeUnknown=false;
     setSelected(null);setNotice(`${data} appointment${data===1?'':'s'} ${action==='save'?'updated':'cancelled'}. Adjacent openings have been recalculated.`);
     if(action==='save'&&edit.date.slice(0,7)!==month)setMonth(edit.date.slice(0,7)); else await load();
   } catch(e){
     if(outcomeUnknown){mutationOutcomeUnknown.current=true;setCalendarNeedsReconciliation(true);}
     const reason=safeMutationFailure(e);
     setEditError(reason+(outcomeUnknown?' The change may already have committed. Further calendar edits and cancellations are locked in this session. Inspect the refreshed calendar and reload the page before retrying; never repeat this action blindly.':''));
   }
   finally{mutationInFlight.current=false;setBusy(false);setConfirmCancel(false);}
 }
 function save(e:FormEvent){e.preventDefault();void change('save');}
 const past=selected?Date.parse(selected.starts_at)<=Date.now():false;
 return <div className="calendarWorkspace">
   <header className="calendarHeading"><div><p className="eyebrow">Your practice schedule</p><h2>Booked appointments</h2><p>{timezone} · Click an appointment to view or edit it.</p></div>{onBook?<button type="button" onClick={onBook}>Place patient appointments</button>:<Link className="secondaryButton" href="/appointments">Book appointments & manage hours</Link>}</header>
   <div className="calendarToolbar"><div><button type="button" onClick={()=>{setMonth(shiftMonth(month,-1));setSelected(null);}} disabled={busy} aria-label="Previous month">←</button><button type="button" onClick={()=>{setMonth(today.slice(0,7));setSelected(null);}} disabled={busy}>Today</button><button type="button" onClick={()=>{setMonth(shiftMonth(month,1));setSelected(null);}} disabled={busy} aria-label="Next month">→</button></div><h2 aria-live="polite">{new Date(month+'-15T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})}</h2><button type="button" onClick={()=>void load()} disabled={busy||loading}>Refresh</button></div>
   {notice&&<p role="status" className="authMessage">{notice}</p>}{calendarNeedsReconciliation&&<p role="alert" className="calendarError">A calendar edit or cancellation may already have committed. Further changes are locked in this session. Inspect the refreshed calendar, then reload the page before any new edit or cancellation.</p>}{error&&<p role="alert" className="calendarError">{error} Previously loaded appointments may be out of date.</p>}{loading&&<p role="status">Loading appointments…</p>}
   <div className={selected?'calendarLayout withEditor':'calendarLayout'}>
     <div className="calendarScroll"><table className="monthCalendar" aria-label="Monthly appointment calendar" aria-busy={loading}><thead><tr>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><th scope="col" key={d}>{d}</th>)}</tr></thead><tbody>
       {Array.from({length:6},(_,week)=><tr key={week}>{days.slice(week*7,week*7+7).map(day=><td key={day} className={`${day.slice(0,7)!==month?'outsideMonth ':''}${day===today?'calendarToday':''}`}><time dateTime={day}>{Number(day.slice(8))}</time><div className="calendarEvents">{(groups.get(day)??[]).map(a=><button type="button" className="calendarEvent" key={a.id} disabled={busy||loading||!!error} onClick={()=>open(a)} aria-label={`${name(a)}, ${day}, ${localParts(a.starts_at,timezone).time}`}><span>{new Date(a.starts_at).toLocaleTimeString('en-US',{timeZone:timezone,hour:'numeric',minute:'2-digit'})}{a.series_id?' ↻':''}</span><strong>{name(a)}</strong></button>)}</div></td>)}</tr>)}
     </tbody></table>{!loading&&!error&&groups.size===0&&<p className="appointmentEmpty">No booked appointments in this calendar range. <Link href="/appointments">Place a patient appointment</Link> to see it here.</p>}</div>
     {selected&&<aside className="calendarEditor" aria-labelledby="edit-appointment-title"><div className="calendarEditorHeading"><h2 id="edit-appointment-title" ref={heading} tabIndex={-1}>Appointment details</h2><button type="button" aria-label="Close appointment details" disabled={busy} onClick={()=>setSelected(null)}>×</button></div>
       <p>{name(selected)}</p>{!selected.patient_id&&<p role="status" className="calendarError">This is a name-only booking, not a central patient chart link. Verify the patient identity and open the correct EMR chart independently before documenting care. Renaming this booking will not create a chart link.</p>}<p>{new Date(selected.starts_at).toLocaleString('en-US',{timeZone:timezone,dateStyle:'full',timeStyle:'short'})}<br/>{timezone}</p>
       {past?<p>Past appointments are shown for reference and cannot be edited here.</p>:<form className="authForm" onSubmit={save}>
         {!selected.patient_id&&<label>Patient name<input required maxLength={160} value={edit.name} disabled={busy} onChange={e=>setEdit({...edit,name:e.target.value})}/></label>}
         <label>Appointment date<input type="date" required min={today} value={edit.date} disabled={busy} onChange={e=>setEdit({...edit,date:e.target.value})}/></label>
         <label>Start time<input type="time" required value={edit.time} disabled={busy} onChange={e=>setEdit({...edit,time:e.target.value})}/></label>
         <p>Appointments use the current {duration}-minute length and must fit office hours without overlapping bookings or blocked time.</p>
         {selected.series_id&&<label>Apply to<select value={edit.scope} disabled={busy} onChange={e=>{setEdit({...edit,scope:e.target.value});setConfirmCancel(false);}}><option value="one">Only this appointment</option><option value="future">This and future appointments in this series</option></select></label>}
         {edit.scope==='future'&&<p>Future appointments shift by the same number of days and use the new local start time. All changes save together; a conflict leaves the series unchanged.</p>}
         <button type="submit" disabled={busy||calendarNeedsReconciliation}>{busy?'Saving…':'Save changes'}</button>
         {confirmCancel?<div className="cancelConfirmation"><p>Cancel {edit.scope==='future'?'this and all future appointments in this series':'this appointment'}?</p><button type="button" disabled={busy||calendarNeedsReconciliation} onClick={()=>void change('cancel')}>Confirm cancellation</button><button type="button" disabled={busy} onClick={()=>setConfirmCancel(false)}>Keep appointment</button></div>:<button className="calendarCancel" type="button" disabled={busy||calendarNeedsReconciliation} onClick={()=>setConfirmCancel(true)}>Cancel appointment</button>}
       </form>}{editError&&<p className="calendarError" role="alert">{editError}</p>}
     </aside>}
   </div>
 </div>;
}
