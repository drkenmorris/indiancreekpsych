// Facility availability is separate from each signed, time-limited run lease.
export function facilityEnabled(env, now=Date.now()) {
  if(env.OMNICORE_DEMO_ENABLED==='true')return true;
  if(env.OMNICORE_DEMO_ENABLED==='false')return false;
  const until=Date.parse(env.OMNICORE_DEMO_UNTIL??'');
  return Number.isFinite(until)&&until>now&&until<=now+16*60000;
}
