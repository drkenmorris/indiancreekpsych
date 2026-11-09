"use client";
import { useMemo,useState } from "react";
import Link from "next/link";
import type { WeeklyInsight } from "@/app/content/weekly-insights";

type Schedule={article_slug:string;status:string;scheduled_at:string|null;updated_at:string};
type Props={articles:WeeklyInsight[];initialSchedules:Schedule[]};
const readable=(date:string)=>new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeStyle:"short"}).format(new Date(date));

export default function NewsletterPlanner({articles,initialSchedules}:Props){
 const [schedules,setSchedules]=useState<Record<string,Schedule>>(()=>Object.fromEntries(initialSchedules.map(s=>[s.article_slug,s])));
 const [dates,setDates]=useState<Record<string,string>>({});
 const [search,setSearch]=useState("");
 const [category,setCategory]=useState("all");
 const [status,setStatus]=useState("all");
 const [busy,setBusy]=useState<string|null>(null);
 const [feedback,setFeedback]=useState("");
 const planned=articles.filter(a=>schedules[a.slug]?.status==="planned").length;
 const categories=Array.from(new Set(articles.map(a=>a.category))).sort();
 const filtered=useMemo(()=>articles.filter(a=>(category==="all"||a.category===category)&&(status==="all"||(status==="planned"?schedules[a.slug]?.status==="planned":schedules[a.slug]?.status!=="planned"))&&(`${a.title} ${a.summary} ${a.week}`).toLowerCase().includes(search.toLowerCase())),[articles,category,status,search,schedules]);

 async function save(slug:string,action:"plan"|"clear"){
   setFeedback("");setBusy(slug);
   try{
     const date=dates[slug];
     if(action==="plan"&&!date)throw new Error("Select a date and time first.");
     const scheduledAt=action==="plan"?new Date(date).toISOString():null;
     if(action==="plan"&&(!Number.isFinite(Date.parse(scheduledAt!))||Date.parse(scheduledAt!)<Date.now()+60000))throw new Error("Choose a future date and time.");
     const response=await fetch("/api/admin/newsletter-schedule",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,action,scheduledAt})});
     const result=await response.json();if(!response.ok)throw new Error(result.error??"Could not save schedule");
     setSchedules(previous=>({...previous,[slug]:result.schedule}));
     setFeedback(`${action==="plan"?"Planned":"Cleared"}: ${articles.find(a=>a.slug===slug)?.title}. No email was sent.`);
   }catch(error){setFeedback(error instanceof Error?error.message:"Could not save schedule");}
   finally{setBusy(null);}
 }

 return <>
   <div className="newsletterMetrics"><div><strong>{articles.length}</strong><span>Total editions</span></div><div><strong>{planned}</strong><span>Dates planned</span></div><div><strong>{articles.length-planned}</strong><span>Not scheduled</span></div><div><strong>Off</strong><span>Automatic delivery</span></div></div>
   <div className="newsletterFilters"><label>Search articles<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Title, topic, week..."/></label><label>Subject<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All subjects</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label><label>Editorial status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All articles</option><option value="planned">Planned</option><option value="draft">Unscheduled</option></select></label></div>
   {feedback&&<p className="newsletterFeedback" role="status">{feedback}</p>}
   <p className="newsletterResults">Showing {filtered.length} of 52 editions. Dates are displayed in your browser's local timezone.</p>
   <div className="newsletterEditorialList">{filtered.map(article=>{const plan=schedules[article.slug];const isPlanned=plan?.status==="planned"&&Boolean(plan.scheduled_at);return <article key={article.slug} className="newsletterEditorialRow"><img src={article.image} alt="Indian Creek educational article illustration" loading="lazy"/><div className="newsletterRowBody"><div className="newsletterRowLabel">Week {String(article.week).padStart(2,"0")} · {article.category}</div><h2>{article.title}</h2><p>{article.summary}</p><div className="newsletterRowLinks"><Link href={`/insights/${article.slug}`} target="_blank">Read article</Link><a href={`/insights/${article.slug}/email`} target="_blank" rel="noopener noreferrer">Preview email design</a></div></div><div className="newsletterRowSchedule"><span className={`newsletterStatus ${isPlanned?"planned":"draft"}`}>{isPlanned?"Date planned":"Unscheduled"}</span>{isPlanned&&<p className="newsletterScheduledDate">{readable(plan.scheduled_at!)}</p>}<label>Proposed send date & time<input type="datetime-local" value={dates[article.slug]??""} onChange={e=>setDates(previous=>({...previous,[article.slug]:e.target.value}))} aria-label={`Proposed date for ${article.title}`}/></label><div className="newsletterActions"><button disabled={busy!==null} onClick={()=>void save(article.slug,"plan")}>{busy===article.slug?"Saving…":"Save date"}</button>{isPlanned&&<button className="newsletterClear" disabled={busy!==null} onClick={()=>void save(article.slug,"clear")}>Clear date</button>}</div><small>Editorial plan only · no send</small></div></article>;})}</div>
 </>;
}
