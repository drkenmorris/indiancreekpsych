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
