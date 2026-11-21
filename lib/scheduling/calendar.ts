export type CalendarAppointment = { id:string; patient_id:string|null; patient_name:string|null; starts_at:string; ends_at:string; status:string; series_id:string|null };
export function localParts(instant:string, timezone:string) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
  const get=(key:string)=>parts.find(p=>p.type===key)?.value??'';
  return {date:`${get('year')}-${get('month')}-${get('day')}`,time:`${get('hour')}:${get('minute')}`};
}
export function shiftMonth(month:string, offset:number) {
 const [year,m]=month.split('-').map(Number);
 return new Date(Date.UTC(year,m-1+offset,1)).toISOString().slice(0,7);
}
export function monthDays(month:string) {
 const [year,m]=month.split('-').map(Number); const first=new Date(Date.UTC(year,m-1,1));
 return Array.from({length:42},(_,i)=>new Date(Date.UTC(year,m-1,1-first.getUTCDay()+i)).toISOString().slice(0,10));
}
export function monthQueryRange(month:string) {
 const days=monthDays(month);
 // One-day padding covers every supported timezone; rendered dates use practice time.
 return {from:new Date(Date.parse(days[0]+'T00:00:00Z')-86400000).toISOString(),to:new Date(Date.parse(days[41]+'T00:00:00Z')+2*86400000).toISOString()};
}

/**
 * Convert a practice-local datetime-local control into a single UTC instant.
 * The browser's own timezone must never determine a clinician's blackout.
 * Reject nonexistent (spring-forward) and ambiguous (fall-back) wall times
 * instead of silently blocking the wrong hour.
 */
export function practiceWallTimeToIso(value:string, timezone:string) {
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
 if(!match)throw new Error('Enter a complete blackout date and time in the practice time zone.');
 const [year,month,day,hour,minute]=match.slice(1).map(Number);
 if(year<2000||year>2100||hour>23||minute>59)throw new Error('Enter a valid blackout date and time.');
 const wall=Date.UTC(year,month-1,day,hour,minute);
 const check=new Date(wall);
 if(check.getUTCFullYear()!==year||check.getUTCMonth()+1!==month||check.getUTCDate()!==day)
  throw new Error('Enter a real calendar date for the blackout.');
 const requestedDate=value.slice(0,10),requestedTime=value.slice(11);
 // Sampling on either side of the wall date covers both offsets at a DST
 // transition. An offset is local wall-minute epoch minus UTC-minute epoch.
 const offsets=new Set<number>();
 for(const probe of [wall-86400000,wall,wall+86400000]){
  const p=localParts(new Date(probe).toISOString(),timezone);
  offsets.add(Date.parse(p.date+'T'+p.time+':00Z')-probe);
 }
 const matching=[...offsets].map(offset=>wall-offset).filter(instant=>{
  const p=localParts(new Date(instant).toISOString(),timezone);
  return p.date===requestedDate&&p.time===requestedTime;
 });
 if(matching.length!==1)
  throw new Error('This local time is missing or occurs twice due to a daylight-saving change. Choose an unambiguous practice-local time.');
 return new Date(matching[0]).toISOString();
}
