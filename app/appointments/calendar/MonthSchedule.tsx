'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {localParts,monthDays,monthQueryRange,shiftMonth} from '@/lib/scheduling/calendar';

type Slot={starts_at:string;ends_at:string};
type Booking=Slot&{id:string;status:string};
type Props={timezone:string;enabled:boolean;showAvailability:boolean;showBookings:boolean;patientId:string;readOnly:boolean;layout:'month'|'agenda';revision:number;onChoose?:(slot:Slot)=>void};

export default function MonthSchedule({timezone,enabled,showAvailability,showBookings,patientId,readOnly,layout,revision,onChoose}:Props){
 const supabase=useMemo(()=>createClient(),[]);
 const today=localParts(new Date().toISOString(),timezone).date;
 const [month,setMonth]=useState(today.slice(0,7));
 const [slots,setSlots]=useState<Slot[]>([]),[bookings,setBookings]=useState<Booking[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [refresh,setRefresh]=useState(0);
 const [selection,setSelection]=useState<{slot:Slot;id?:string}|null>(null);
 const generation=useRef(0);
 useEffect(()=>{
   const version=++generation.current;
   const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),15000);
   setLoading(true);setError('');setSlots([]);setBookings([]);setSelection(null);
   const range=monthQueryRange(month);
   const last=new Date(Date.parse(shiftMonth(month,1)+'-01T12:00:00Z')-86400000).toISOString().slice(0,10);
   void (async()=>{
     try{
       const [available,own]=await Promise.all([
         showAvailability&&enabled?supabase.rpc('get_available_appointment_slots',{p_from:month+'-01',p_to:last}).abortSignal(abort.signal):Promise.resolve({data:[],error:null}),
         showBookings&&patientId?supabase.from('appointments').select('id,starts_at,ends_at,status').eq('patient_id',patientId).eq('status','booked').gte('starts_at',range.from).lt('starts_at',range.to).order('starts_at').abortSignal(abort.signal):Promise.resolve({data:[],error:null})
       ]);
       if(available.error||own.error)throw new Error('This month could not be loaded. Please try Refresh.');
       if(version===generation.current){setSlots(available.data??[]);setBookings(own.data??[]);}
     }catch{if(version===generation.current)setError('This month could not be loaded. Please try Refresh.');}
     finally{clearTimeout(timeout);if(version===generation.current)setLoading(false);}
   })();
   return()=>{generation.current++;abort.abort();clearTimeout(timeout);};
 },[month,timezone,patientId,showAvailability,showBookings,enabled,revision,refresh,supabase]);
 const time=(s:string)=>new Date(s).toLocaleTimeString('en-US',{timeZone:timezone,hour:'numeric',minute:'2-digit'});
 const dates=monthDays(month);
 const days=dates.filter(d=>d.startsWith(month));
 const byDay=<T extends Slot>(items:T[])=>{const map=new Map<string,T[]>();for(const item of items){const date=localParts(item.starts_at,timezone).date;map.set(date,[...(map.get(date)??[]),item]);}return map;};
 const openings=byDay(slots),own=byDay(bookings);
 const hasItems=days.some(d=>(openings.get(d)?.length??0)+(own.get(d)?.length??0)>0);
 async function confirm(){
   if(!selection||readOnly||busy||loading)return;
   setBusy(true);setError('');
   try{
     const result=selection.id
       ?await supabase.from('appointments').update({status:'cancelled'}).eq('id',selection.id).eq('patient_id',patientId).eq('status','booked').select('id').abortSignal(AbortSignal.timeout(20000))
       :await supabase.from('appointments').insert({patient_id:patientId,...selection.slot}).select('id').abortSignal(AbortSignal.timeout(20000));
     if(result.error)throw result.error;
     if(!result.data?.length)throw new Error('This appointment has changed. Refresh before retrying.');
     setNotice(selection.id?'Appointment cancelled.':'Appointment booked.');setSelection(null);setRefresh(v=>v+1);
   }catch(e){setError((e as {message?:string}).message??'The change could not be confirmed. Refresh before retrying.');setSelection(null);setRefresh(v=>v+1);setNotice(`${(e as {message?:string}).message??'The change could not be confirmed.'} Check the refreshed calendar before retrying.`);}
   finally{setBusy(false);}
 }
 function entries(day:string){return <div className="calendarEvents">
   {(own.get(day)??[]).map(b=><button type="button" className="calendarEvent" key={b.id} disabled={readOnly||busy||loading||!!error||Date.parse(b.starts_at)<=Date.now()} onClick={()=>setSelection({slot:b,id:b.id})}><span>{time(b.starts_at)}</span><strong>Your appointment</strong></button>)}
   {(openings.get(day)??[]).map(s=><button type="button" className="calendarEvent availableEvent" key={s.starts_at} disabled={busy||loading||!!error||(readOnly&&!onChoose)} onClick={()=>onChoose?onChoose(s):setSelection({slot:s})}><span>{time(s.starts_at)}</span><strong>Available</strong></button>)}
 </div>;}
 return <section className="appointmentPanel">
   <h2>{showAvailability?(showBookings?'Patient online calendar':'Appointment availability'):'Your booked appointments'}</h2>
   <p>Times shown in {timezone}. {readOnly?(onChoose?'Select an opening to place a patient appointment.':'Patient preview is read-only.'):'Select an available time to book, or your appointment to cancel.'} Days without openings are unavailable for online booking.</p>
   {!enabled&&showAvailability&&<p role="status">Online scheduling is currently paused.</p>}
   <div className="calendarToolbar"><button type="button" aria-label="Previous month" disabled={busy} onClick={()=>setMonth(shiftMonth(month,-1))}>←</button><h3 aria-live="polite">{new Date(month+'-15T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})}</h3><button type="button" aria-label="Next month" disabled={busy} onClick={()=>setMonth(shiftMonth(month,1))}>→</button><button type="button" disabled={busy} onClick={()=>setMonth(today.slice(0,7))}>Today</button><button type="button" disabled={busy||loading} onClick={()=>setRefresh(v=>v+1)}>Refresh</button></div>
   {loading&&<p role="status">Loading calendar…</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
   {!loading&&!error&&(layout==='month'?<div className="calendarScroll"><table className="monthCalendar" aria-label="Monthly availability and appointments"><thead><tr>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><th key={d} scope="col">{d}</th>)}</tr></thead><tbody>{Array.from({length:6},(_,w)=><tr key={w}>{dates.slice(w*7,w*7+7).map(day=><td key={day} className={`${day.startsWith(month)?'':'outsideMonth '}${day===today?'calendarToday':''}`}><time dateTime={day}>{Number(day.slice(8))}</time>{day.startsWith(month)&&entries(day)}</td>)}</tr>)}</tbody></table></div>:<div className="patientAgenda">{days.filter(d=>openings.has(d)||own.has(d)).map(day=><section key={day}><h3>{new Date(day+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',weekday:'long',month:'short',day:'numeric'})}</h3>{entries(day)}</section>)}</div>)}
   {!loading&&!error&&!hasItems&&<p>No {showAvailability?'available times or appointments':'booked appointments'} in this month.</p>}
   {selection&&!readOnly&&<section className="calendarEditor" aria-label="Confirm appointment"><h3>{selection.id?'Cancel appointment?':'Book appointment?'}</h3><p>{new Date(selection.slot.starts_at).toLocaleString('en-US',{timeZone:timezone,dateStyle:'full',timeStyle:'short'})}</p><button type="button" disabled={busy} onClick={()=>void confirm()}>{selection.id?'Confirm cancellation':'Confirm booking'}</button><button type="button" disabled={busy} onClick={()=>setSelection(null)}>Go back</button></section>}
 </section>;
}
