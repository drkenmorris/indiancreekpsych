"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AccountType = "guest" | "patient" | "admin";
type Settings = { scheduling_enabled:boolean; timezone:string; appointment_duration_minutes:number; slot_interval_minutes:number; minimum_notice_hours:number; maximum_advance_days:number };
type Rule = { id:string; weekday:number; start_time:string; end_time:string; enabled:boolean };
type Block = { id:string; starts_at:string; ends_at:string; label:string|null };
type Appointment = { id:string; patient_id:string; starts_at:string; ends_at:string; status:string; created_at:string };
type Slot = { starts_at:string; ends_at:string };

const weekdays=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const dateInput=(d:Date)=>{const p=(n:number)=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;};

export default function AppointmentsClient({userId,accountType,preferredName,initialSettings,initialRules,initialBlocks,initialAppointments}:{userId:string;accountType:AccountType;preferredName:string;initialSettings:Settings|null;initialRules:Rule[];initialBlocks:Block[];initialAppointments:Appointment[]}) {
  const supabase=useMemo(()=>createClient(),[]);
  const [settings,setSettings]=useState<Settings>(initialSettings??{scheduling_enabled:false,timezone:"America/Chicago",appointment_duration_minutes:50,slot_interval_minutes:30,minimum_notice_hours:24,maximum_advance_days:60});
  const [rules,setRules]=useState(initialRules);
  const [blocks,setBlocks]=useState(initialBlocks);
  const [appointments,setAppointments]=useState(initialAppointments);
  const [slots,setSlots]=useState<Slot[]>([]);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [from,setFrom]=useState(new Date().toISOString().slice(0,10));
  const [to,setTo]=useState(()=>{const d=new Date();d.setDate(d.getDate()+21);return d.toISOString().slice(0,10);});
  const [rule,setRule]=useState({weekday:1,start_time:"09:00",end_time:"17:00"});
  const [block,setBlock]=useState(()=>{const s=new Date();s.setHours(s.getHours()+1,0,0,0);const e=new Date(s);e.setHours(e.getHours()+1);return{starts_at:dateInput(s),ends_at:dateInput(e),label:""};});

  const refreshAppointments=async()=>{const {data}=await supabase.from("appointments").select("id, patient_id, starts_at, ends_at, status, created_at").order("starts_at");setAppointments((data??[]) as Appointment[]);};
  const loadSlots=async()=>{if(accountType==="guest")return;setBusy(true);setMessage("");const {data,error}=await supabase.rpc("get_available_appointment_slots",{p_from:from,p_to:to});if(error)setMessage(error.message);else setSlots((data??[]) as Slot[]);setBusy(false);};
  useEffect(()=>{if(accountType!=="guest")void loadSlots();},[]);

  const book=async(s:Slot)=>{setBusy(true);const {error}=await supabase.from("appointments").insert({patient_id:userId,starts_at:s.starts_at,ends_at:s.ends_at});setMessage(error?error.message:"Appointment booked.");if(!error){await refreshAppointments();await loadSlots();}setBusy(false);};
  const cancel=async(id:string)=>{setBusy(true);const {error}=await supabase.from("appointments").update({status:"cancelled"}).eq("id",id);setMessage(error?error.message:"Appointment cancelled.");if(!error){await refreshAppointments();await loadSlots();}setBusy(false);};
  const saveSettings=async(e:FormEvent)=>{e.preventDefault();setBusy(true);const {error}=await supabase.from("appointment_settings").update(settings).eq("id",true);setMessage(error?error.message:"Scheduling settings saved.");setBusy(false);};
  const addRule=async(e:FormEvent)=>{e.preventDefault();const {data,error}=await supabase.from("appointment_availability_rules").insert(rule).select().single();if(error)setMessage(error.message);else{setRules(v=>[...v,data as Rule].sort((a,b)=>a.weekday-b.weekday||a.start_time.localeCompare(b.start_time)));setMessage("Availability rule added.");}};
  const toggleRule=async(r:Rule)=>{const {data,error}=await supabase.from("appointment_availability_rules").update({enabled:!r.enabled}).eq("id",r.id).select().single();if(error)setMessage(error.message);else setRules(v=>v.map(x=>x.id===r.id?data as Rule:x));};
  const deleteRule=async(id:string)=>{const {error}=await supabase.from("appointment_availability_rules").delete().eq("id",id);if(error)setMessage(error.message);else setRules(v=>v.filter(x=>x.id!==id));};
  const addBlock=async(e:FormEvent)=>{e.preventDefault();const payload={starts_at:new Date(block.starts_at).toISOString(),ends_at:new Date(block.ends_at).toISOString(),label:block.label||null};const {data,error}=await supabase.from("appointment_blocks").insert(payload).select().single();if(error)setMessage(error.message);else{setBlocks(v=>[...v,data as Block].sort((a,b)=>a.starts_at.localeCompare(b.starts_at)));setMessage("Blocked time added.");}};
  const deleteBlock=async(id:string)=>{const {error}=await supabase.from("appointment_blocks").delete().eq("id",id);if(error)setMessage(error.message);else setBlocks(v=>v.filter(x=>x.id!==id));};

  const mine=appointments.filter(a=>accountType==="admin"||a.patient_id===userId);

  return <div className="appointmentStack">
    <section className="appointmentHeader">
      <p className="eyebrow">Online scheduling</p>
      <h1>{accountType==="admin"?"Appointment administration":preferredName?`Appointments for ${preferredName}`:"Appointments"}</h1>
      <p>{accountType==="guest"?"Online booking is available to Patient accounts. The practice must convert your account to Patient status before you can schedule.":accountType==="admin"?"Control weekly hours, booking rules, blocked time, and scheduled appointments.":"Choose from the available appointment times below."}</p>
      {message&&<p className="authMessage">{message}</p>}
    </section>

    {accountType!=="guest"&&<>
      <section className="appointmentPanel">
        <div className="appointmentPanelHeading"><div><p className="eyebrow">Open times</p><h2>Available appointments</h2></div><div className="appointmentRange"><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Through<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button className="secondaryAction" type="button" onClick={loadSlots} disabled={busy}>Refresh</button></div></div>
        <div className="slotGrid">{slots.length===0?<p className="appointmentEmpty">No open appointments are available in this date range.</p>:slots.map(s=><button className="slotButton" key={s.starts_at} disabled={busy||accountType==="admin"} onClick={()=>void book(s)}><strong>{new Date(s.starts_at).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}</strong><span>{new Date(s.starts_at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</span>{accountType==="patient"&&<small>Book this time</small>}</button>)}</div>
      </section>
      <section className="appointmentPanel">
        <p className="eyebrow">{accountType==="admin"?"Schedule":"Your schedule"}</p><h2>{accountType==="admin"?"Booked appointments":"Your appointments"}</h2>
        <div className="appointmentList">{mine.length===0?<p className="appointmentEmpty">No appointments are scheduled.</p>:mine.map(a=><article key={a.id}><div><strong>{new Date(a.starts_at).toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</strong><span className="appointmentStatus">{a.status.replace("_"," ")}</span></div>{a.status==="booked"&&accountType==="patient"&&<button type="button" className="secondaryAction" onClick={()=>void cancel(a.id)} disabled={busy}>Cancel</button>}</article>)}</div>
      </section>
    </>}

    {accountType==="admin"&&<>
      <section className="appointmentPanel"><p className="eyebrow">Booking parameters</p><h2>Online scheduling rules</h2>
        <form className="appointmentSettingsForm" onSubmit={saveSettings}>
          <label className="checkRow"><input type="checkbox" checked={settings.scheduling_enabled} onChange={e=>setSettings({...settings,scheduling_enabled:e.target.checked})}/> Enable online scheduling</label>
          <label>Time zone<input value={settings.timezone} onChange={e=>setSettings({...settings,timezone:e.target.value})}/></label>
          <label>Appointment length (minutes)<input type="number" min="15" max="240" value={settings.appointment_duration_minutes} onChange={e=>setSettings({...settings,appointment_duration_minutes:Number(e.target.value)})}/></label>
          <label>Start-time interval (minutes)<input type="number" min="5" max="240" value={settings.slot_interval_minutes} onChange={e=>setSettings({...settings,slot_interval_minutes:Number(e.target.value)})}/></label>
          <label>Minimum notice (hours)<input type="number" min="0" max="720" value={settings.minimum_notice_hours} onChange={e=>setSettings({...settings,minimum_notice_hours:Number(e.target.value)})}/></label>
          <label>Maximum advance booking (days)<input type="number" min="1" max="365" value={settings.maximum_advance_days} onChange={e=>setSettings({...settings,maximum_advance_days:Number(e.target.value)})}/></label>
          <button type="submit" disabled={busy}>Save scheduling settings</button>
        </form>
      </section>

      <section className="appointmentPanel"><p className="eyebrow">Recurring availability</p><h2>Weekly office hours</h2>
        <form className="inlineSchedulerForm" onSubmit={addRule}><label>Day<select value={rule.weekday} onChange={e=>setRule({...rule,weekday:Number(e.target.value)})}>{weekdays.map((n,i)=><option value={i} key={n}>{n}</option>)}</select></label><label>Start<input type="time" value={rule.start_time} onChange={e=>setRule({...rule,start_time:e.target.value})}/></label><label>End<input type="time" value={rule.end_time} onChange={e=>setRule({...rule,end_time:e.target.value})}/></label><button type="submit">Add hours</button></form>
        <div className="ruleList">{rules.map(r=><article key={r.id}><div><strong>{weekdays[r.weekday]}</strong><span>{r.start_time.slice(0,5)}–{r.end_time.slice(0,5)} · {r.enabled?"Open":"Paused"}</span></div><div><button className="secondaryAction" type="button" onClick={()=>void toggleRule(r)}>{r.enabled?"Pause":"Enable"}</button><button className="secondaryAction" type="button" onClick={()=>void deleteRule(r.id)}>Delete</button></div></article>)}</div>
      </section>

      <section className="appointmentPanel"><p className="eyebrow">Blocked time</p><h2>Blackout periods</h2>
        <form className="inlineSchedulerForm blockForm" onSubmit={addBlock}><label>Starts<input type="datetime-local" value={block.starts_at} onChange={e=>setBlock({...block,starts_at:e.target.value})}/></label><label>Ends<input type="datetime-local" value={block.ends_at} onChange={e=>setBlock({...block,ends_at:e.target.value})}/></label><label>Label<input placeholder="Vacation, meeting, personal time" value={block.label} onChange={e=>setBlock({...block,label:e.target.value})}/></label><button type="submit">Block time</button></form>
        <div className="ruleList">{blocks.map(b=><article key={b.id}><div><strong>{b.label||"Blocked time"}</strong><span>{new Date(b.starts_at).toLocaleString()} – {new Date(b.ends_at).toLocaleString()}</span></div><button className="secondaryAction" type="button" onClick={()=>void deleteBlock(b.id)}>Remove</button></article>)}</div>
      </section>
    </>}
  </div>;
}
