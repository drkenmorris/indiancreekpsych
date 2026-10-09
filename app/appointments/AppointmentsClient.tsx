"use client";

import FirewallCheck from "./FirewallCheck";
import CalendarClient from "./calendar/CalendarClient";
import MonthSchedule from "./calendar/MonthSchedule";
import { localParts } from "@/lib/scheduling/calendar";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AccountType = "guest" | "patient" | "admin";
type Settings = { scheduling_enabled:boolean; timezone:string; appointment_duration_minutes:number; slot_interval_minutes:number; minimum_notice_hours:number; maximum_advance_days:number };
type Rule = { id:string; weekday:number; start_time:string; end_time:string; anchor_time?:string|null; enabled:boolean };
type Block = { id:string; starts_at:string; ends_at:string; label:string|null };
type Patient = { id:string; full_name:string|null; preferred_name:string|null };

const weekdays=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const dateInput=(d:Date)=>{const p=(n:number)=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;};

export default function AppointmentsClient({userId,accountType,preferredName,initialSettings,initialRules,initialBlocks}:{userId:string;accountType:AccountType;preferredName:string;initialSettings:Settings|null;initialRules:Rule[];initialBlocks:Block[]}) {
  const supabase=useMemo(()=>createClient(),[]);
  const [view,setView]=useState(accountType==="admin"?"booked":"patient-calendar");
  const [previewPatient,setPreviewPatient]=useState("");
  const [revision,setRevision]=useState(0);
  const [settings,setSettings]=useState<Settings>(initialSettings??{scheduling_enabled:false,timezone:"America/Chicago",appointment_duration_minutes:50,slot_interval_minutes:30,minimum_notice_hours:24,maximum_advance_days:60});
  const [rules,setRules]=useState(initialRules);
  const [blocks,setBlocks]=useState(initialBlocks);
  const [patients,setPatients]=useState<Patient[]>([]);
  const [patientError,setPatientError]=useState("");
  const [patientsLoading,setPatientsLoading]=useState(accountType==="admin");
  const [ruleMessage,setRuleMessage]=useState("");
  const [bookingMessage,setBookingMessage]=useState("");
  const [booking,setBooking]=useState({patient_id:"",patient_name:"",first_date:"",start_time:"10:00",repeat_weeks:0,through:""});
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [editingRuleId,setEditingRuleId]=useState<string|null>(null);
  const [rule,setRule]=useState({weekday:1,start_time:"09:00",end_time:"17:00",anchor_time:""});
  const [block,setBlock]=useState(()=>{const s=new Date();s.setHours(s.getHours()+1,0,0,0);const e=new Date(s);e.setHours(e.getHours()+1);return{starts_at:dateInput(s),ends_at:dateInput(e),label:""};});

  const loadSlots=async()=>{setRevision(v=>v+1);};
  useEffect(()=>{if(accountType==="admin")void (async()=>{const {data,error}=await supabase.rpc("scheduling_patients").abortSignal(AbortSignal.timeout(15000));if(error)setPatientError("Patient list could not be loaded. Refresh the page or contact support.");else setPatients((data??[]) as Patient[]);setPatientsLoading(false);})();},[]);
  const bookForPatient=async(e:FormEvent)=>{
    e.preventDefault();setBusy(true);setBookingMessage("");
    try {
      const {data,error}=await supabase.rpc("book_patient_appointments",{p_patient_id:booking.patient_id||null,p_patient_name:booking.patient_id?null:booking.patient_name,p_first_date:booking.first_date,p_start_time:booking.start_time,p_repeat_weeks:booking.repeat_weeks,p_through:booking.repeat_weeks===0?booking.first_date:booking.through}).abortSignal(AbortSignal.timeout(20000));
      if(error)throw error;
      setBookingMessage(`${data} appointment${data===1?"":"s"} booked. Adjacent openings updated.`);
      await loadSlots();
    }catch(error){setBookingMessage(error instanceof Error?error.message:(error as {message?:string})?.message??"Booking could not be confirmed. Refresh the schedule before retrying.");}finally{setBusy(false);}
  };

  const saveSettings=async(e:FormEvent)=>{e.preventDefault();setBusy(true);const {error}=await supabase.from("appointment_settings").update(settings).eq("id",true);if(!error)await loadSlots();setMessage(error?error.message:"Scheduling settings saved.");setBusy(false);};
  const addRule=async(e:FormEvent)=>{
    e.preventDefault();setRuleMessage("");
    if(!rule.start_time||!rule.end_time||rule.end_time<=rule.start_time){setRuleMessage("Choose an end time later than the start time on the same day.");return;}
    if(rules.some(r=>r.id!==editingRuleId&&r.weekday===rule.weekday&&r.start_time.slice(0,5)===rule.start_time&&r.end_time.slice(0,5)===rule.end_time)){setRuleMessage("These hours already exist. Use Enable if they are paused.");return;}
    setBusy(true);
    try {
      const response=await fetch("/api/scheduling/office-hours",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...rule,...(editingRuleId?{id:editingRuleId}:{})}),signal:AbortSignal.timeout(15000)});
      const result=await response.json();if(!response.ok)throw new Error(result.error??"Hours could not be saved.");
      setRules(result.rules as Rule[]);setEditingRuleId(null);
      setRuleMessage(`${weekdays[rule.weekday]} hours saved: ${rule.start_time}–${rule.end_time} (${settings.timezone}). Patient openings appear next to booked appointments or the reserved starting hour.`);
      await loadSlots();
    }catch(error){setRuleMessage(error instanceof Error&&error.name!=="TimeoutError"?error.message:"Save could not be confirmed. Refresh the page before trying again.");}finally{setBusy(false);}
  };
  const toggleRule=async(r:Rule)=>{const {data,error}=await supabase.from("appointment_availability_rules").update({enabled:!r.enabled}).eq("id",r.id).select().single();if(error)setMessage(error.message);else{setRules(v=>v.map(x=>x.id===r.id?data as Rule:x));await loadSlots();}};
  const deleteRule=async(id:string)=>{const {error}=await supabase.from("appointment_availability_rules").delete().eq("id",id);if(error)setMessage(error.message);else{setRules(v=>v.filter(x=>x.id!==id));await loadSlots();}};
  const addBlock=async(e:FormEvent)=>{e.preventDefault();const payload={starts_at:new Date(block.starts_at).toISOString(),ends_at:new Date(block.ends_at).toISOString(),label:block.label||null};const {data,error}=await supabase.from("appointment_blocks").insert(payload).select().single();if(error)setMessage(error.message);else{setBlocks(v=>[...v,data as Block].sort((a,b)=>a.starts_at.localeCompare(b.starts_at)));await loadSlots();setMessage("Blocked time added.");}};
  const deleteBlock=async(id:string)=>{const {error}=await supabase.from("appointment_blocks").delete().eq("id",id);if(error)setMessage(error.message);else{setBlocks(v=>v.filter(x=>x.id!==id));await loadSlots();}};



  return <div className="appointmentStack">
    <section className="appointmentHeader">
      <p className="eyebrow">Online scheduling</p>
      <h1>{accountType==="admin"?"Appointment administration":preferredName?`Appointments for ${preferredName}`:"Appointments"}</h1>
      <p>{accountType==="guest"?"Online booking is available to Patient accounts. The practice must convert your account to Patient status before you can schedule.":accountType==="admin"?"Control weekly hours, booking rules, blocked time, and scheduled appointments.":"Choose from the available appointment times below."}</p>

      {message&&<p className="authMessage" role="status">{message}</p>}
    </section>

    {accountType!=="guest"&&<>
      <nav className="calendarMenu" aria-label="Calendar menu">
        {(accountType==="admin"?[
          ["availability","Appointment availability"],["booked","Booked appointments"],["book","Place patient appointments"],
          ["rules","Online scheduling rules"],["hours","Weekly office hours"],["blackouts","Blackout periods"],
          ["patient-summary","Patient availability & appointments"],["patient-calendar","Patient online calendar"]
        ]:[["availability","Appointment availability"],["booked","My booked appointments"],["patient-calendar","My online calendar"]]).map(([id,label])=><button key={id} type="button" aria-pressed={view===id} disabled={busy} onClick={()=>{setView(id);setMessage("");}}>{label}</button>)}
      </nav>
      {view==="booked"&&accountType==="admin"&&<CalendarClient timezone={settings.timezone} duration={settings.appointment_duration_minutes} onBook={()=>setView("book")}/>}
      {accountType==="admin"&&(view==="patient-summary"||view==="patient-calendar")&&<section className="appointmentPanel">
        <h2>Patient view preview</h2><p>This is a read-only preview. Choose a Patient account to include their own appointments. Other patients’ bookings and names are never shown in the patient interface.</p>
        <label>Preview patient<select value={previewPatient} onChange={e=>setPreviewPatient(e.target.value)}><option value="">Availability only</option>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name||p.preferred_name||"Patient"} · {p.id.slice(0,8)}</option>)}</select></label>
        {patientError&&<p role="alert">{patientError}</p>}
      </section>}
      {(["availability","patient-summary","patient-calendar"].includes(view)||(view==="booked"&&accountType==="patient"))&&<MonthSchedule
        key={view+previewPatient} timezone={settings.timezone} enabled={settings.scheduling_enabled}
        showAvailability={view!=="booked"} showBookings={view!=="availability"}
        patientId={accountType==="patient"?userId:previewPatient} readOnly={accountType!=="patient"}
        layout="month" revision={revision}
        onChoose={accountType==="admin"&&view==="availability"?(slot)=>{const local=localParts(slot.starts_at,settings.timezone);setBooking({...booking,first_date:local.date,start_time:local.time});setView("book");}:undefined}
      />}
    </>}

    {accountType==="admin"&&<>
      {view==="book"&&<section className="appointmentPanel"><p className="eyebrow">Existing patients</p><h2>Place patient appointments</h2>
        <p>Choose a Patient account or enter an established patient’s name, then place a single appointment or a standing schedule through a selected date. Times use {settings.timezone}. Each booking and reserved starting hour offers only the available hour before and after it, within office hours. Other times remain closed to patient booking.</p>
        {patientsLoading&&<p role="status">Loading Patient accounts…</p>}{patientError&&<p role="alert">{patientError}</p>}
        {!patientError&&!patientsLoading&&patients.length===0&&<p>No Patient accounts are available. You can still book an established patient by entering their name below; this does not create a website account.</p>}
        <form className="appointmentSettingsForm" onSubmit={bookForPatient}>
          <label>Patient<select value={booking.patient_id} onChange={e=>setBooking({...booking,patient_id:e.target.value})}><option value="">Established patient without a website account</option>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name||p.preferred_name||"Patient"} · {p.id.slice(0,8)}</option>)}</select></label>
          {!booking.patient_id&&<label>Patient name<input required maxLength={160} value={booking.patient_name} onChange={e=>setBooking({...booking,patient_name:e.target.value})}/></label>}
          <label>First appointment date<input required type="date" value={booking.first_date} onChange={e=>setBooking({...booking,first_date:e.target.value})}/></label>
          <label>Appointment start<input required type="time" value={booking.start_time} onChange={e=>setBooking({...booking,start_time:e.target.value})}/></label>
          <label>Repeat<select value={booking.repeat_weeks} onChange={e=>setBooking({...booking,repeat_weeks:Number(e.target.value)})}><option value={0}>One appointment</option><option value={1}>Every week</option><option value={2}>Every other week</option></select></label>
          {booking.repeat_weeks!==0&&<label>Repeat through (up to one year)<input required type="date" min={booking.first_date} value={booking.through} onChange={e=>setBooking({...booking,through:e.target.value})}/></label>}
          <button type="submit" disabled={busy}>{busy?"Working…":"Book patient appointments"}</button>
        </form>
        <p>Repeated bookings keep the same local start time across daylight-saving changes. If any date conflicts with a booking, blocked time, or office hours, none of the series is saved.</p>
        {bookingMessage&&<p className="authMessage" role="status">{bookingMessage}</p>}
      </section>}
      {view==="rules"&&<section className="appointmentPanel"><p className="eyebrow">Booking parameters</p><h2>Online scheduling rules</h2>
        <form className="appointmentSettingsForm" onSubmit={saveSettings}>
          <label className="checkRow"><input type="checkbox" checked={settings.scheduling_enabled} onChange={e=>setSettings({...settings,scheduling_enabled:e.target.checked})}/> Enable online scheduling</label>
          <label>Time zone<input value={settings.timezone} onChange={e=>setSettings({...settings,timezone:e.target.value})}/></label>
          <label>Appointment length (minutes)<input type="number" min="15" max="240" value={settings.appointment_duration_minutes} onChange={e=>setSettings({...settings,appointment_duration_minutes:Number(e.target.value)})}/></label>
          <label>Minimum notice (hours)<input type="number" min="0" max="720" value={settings.minimum_notice_hours} onChange={e=>setSettings({...settings,minimum_notice_hours:Number(e.target.value)})}/></label>
          <label>Maximum advance booking (days)<input type="number" min="1" max="365" value={settings.maximum_advance_days} onChange={e=>setSettings({...settings,maximum_advance_days:Number(e.target.value)})}/></label>
          <p>Patient openings use hourly start times next to booked appointments.</p><button type="submit" disabled={busy}>Save scheduling settings</button>
        </form>
      </section>}

      {view==="hours"&&<section className="appointmentPanel"><p className="eyebrow">Recurring availability</p><h2>Weekly office hours</h2>
        {accountType==="admin" && <FirewallCheck disabled={busy} />}
        <form className="inlineSchedulerForm" onSubmit={addRule}><label>Day<select value={rule.weekday} onChange={e=>setRule({...rule,weekday:Number(e.target.value)})}>{weekdays.map((n,i)=><option value={i} key={n}>{n}</option>)}</select></label><label>Start<input required type="time" value={rule.start_time} onChange={e=>setRule({...rule,start_time:e.target.value})}/></label><label>End<input required type="time" value={rule.end_time} onChange={e=>setRule({...rule,end_time:e.target.value})}/></label><label>Reserved starting hour (optional)<input type="time" value={rule.anchor_time} onChange={e=>setRule({...rule,anchor_time:e.target.value})}/></label><button type="submit" disabled={busy}>{busy?"Working…":editingRuleId?"Save hours":"Add hours"}</button></form>
        {editingRuleId&&<button className="secondaryAction" type="button" onClick={()=>{setEditingRuleId(null);setRuleMessage("");}}>Cancel editing</button>}
        {ruleMessage&&<p className="authMessage" role="status">{ruleMessage}</p>}
        <p>Office hours set the outer limits. Patient openings are one hour before or after booked appointments; a day needs a reserved starting hour or an existing booking to offer openings.</p>
        <div className="ruleList">{rules.map(r=><article key={r.id}><div><strong>{weekdays[r.weekday]}</strong><span>{r.start_time.slice(0,5)}–{r.end_time.slice(0,5)} · {r.enabled?"Open":"Paused"}{r.anchor_time?` · Starting hour ${r.anchor_time.slice(0,5)} reserved`:""}</span></div><div><button className="secondaryAction" type="button" disabled={busy} onClick={()=>{setEditingRuleId(r.id);setRule({weekday:r.weekday,start_time:r.start_time.slice(0,5),end_time:r.end_time.slice(0,5),anchor_time:r.anchor_time?.slice(0,5)??""});setRuleMessage("Editing hours above. Set a reserved starting hour, then choose Save hours.");}}>Edit</button><button className="secondaryAction" type="button" onClick={()=>void toggleRule(r)}>{r.enabled?"Pause":"Enable"}</button><button className="secondaryAction" type="button" onClick={()=>void deleteRule(r.id)}>Delete</button></div></article>)}</div>
      </section>}

      {view==="blackouts"&&<section className="appointmentPanel"><p className="eyebrow">Blocked time</p><h2>Blackout periods</h2>
        <form className="inlineSchedulerForm blockForm" onSubmit={addBlock}><label>Starts<input type="datetime-local" value={block.starts_at} onChange={e=>setBlock({...block,starts_at:e.target.value})}/></label><label>Ends<input type="datetime-local" value={block.ends_at} onChange={e=>setBlock({...block,ends_at:e.target.value})}/></label><label>Label<input placeholder="Vacation, meeting, personal time" value={block.label} onChange={e=>setBlock({...block,label:e.target.value})}/></label><button type="submit">Block time</button></form>
        <div className="ruleList">{blocks.map(b=><article key={b.id}><div><strong>{b.label||"Blocked time"}</strong><span>{new Date(b.starts_at).toLocaleString()} – {new Date(b.ends_at).toLocaleString()}</span></div><button className="secondaryAction" type="button" onClick={()=>void deleteBlock(b.id)}>Remove</button></article>)}</div>
      </section>}
    </>}
  </div>;
}
