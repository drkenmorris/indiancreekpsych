/** Converts practice-local date/time to an unambiguous instant.
 * The practice timezone comes from protected appointment_settings, not the browser.
 * DST gaps and duplicate times fail closed to protect immutable clinical records.
 */
export function groupSessionStartUtc(local:string, timeZone:string):string {
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if(!match)throw Error('Choose a valid clinic-local date and time.');
  const [year,month,day,hour,minute]=match.slice(1).map(Number);
  const nominal=Date.UTC(year,month-1,day,hour,minute);
  if(year<2000||year>2100||new Date(nominal).toISOString().slice(0,16)!==local)
    throw Error('Choose a valid clinic-local date and time.');
  let fmt:Intl.DateTimeFormat;
  try {
    fmt=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  }catch{throw Error('The clinic timezone is invalid. Review scheduling settings.');}
  const fields=(value:number)=>Object.fromEntries(fmt.formatToParts(new Date(value)).map(p=>[p.type,p.value]));
  const offsets=new Set<number>();
  for(const shift of [-36,-12,0,12,36]){
    const sample=nominal+shift*3600000,p=fields(sample);
    offsets.add(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute))-sample);
  }
  const matches=new Set<number>();
  for(const offset of offsets){
    const candidate=nominal-offset,p=fields(candidate);
    if([p.year,p.month,p.day,p.hour,p.minute].map(Number).every((v,i)=>v===[year,month,day,hour,minute][i]))matches.add(candidate);
  }
  if(matches.size!==1)throw Error('This clinic time is missing or duplicated during a daylight-saving transition. Choose another time.');
  return new Date([...matches][0]).toISOString();
}
