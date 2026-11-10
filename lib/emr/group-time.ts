/** Convert an explicitly entered clinic-local wall time to UTC.
 * A browser's timezone must never silently change the intended America/Chicago time.
 * Reject nonexistent spring-forward times and ambiguous fall-back times rather than guessing.
 */
const CLINIC_ZONE = 'America/Chicago';
const localFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
export function groupSessionStartUtc(local: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw Error('Choose a valid clinic-local date and time.');
  const [,ys,ms,ds,hs,mins] = match;
  const [year,month,day,hour,minute] = [ys,ms,ds,hs,mins].map(Number);
  const nominal = Date.UTC(year,month-1,day,hour,minute);
  if (year < 2000 || year > 2100 || !Number.isFinite(nominal) ||
      new Date(nominal).toISOString().slice(0,16) !== local)
    throw Error('Choose a valid clinic-local date and time.');
  const expected = [year,month,day,hour,minute];
  const matches = [5,6].map(offsetHours => new Date(nominal + offsetHours*3600000))
    .filter(date => {
      const values = Object.fromEntries(localFormat.formatToParts(date).map(p => [p.type, p.value]));
      return ['year','month','day','hour','minute'].every((key,i) => Number(values[key]) === expected[i]);
    });
  if (matches.length !== 1)
    throw Error(matches.length ? 'This local time occurs twice during the daylight-saving change. Choose another time.' :
      'This local time does not exist during the daylight-saving change. Choose another time.');
  return matches[0].toISOString();
}
