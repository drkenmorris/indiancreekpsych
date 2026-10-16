import { createHmac, timingSafeEqual } from 'node:crypto';
export function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x,y);
}
export function signRun(secret, runId, expires) {
  return `${runId}.${expires}.${createHmac('sha256',secret).update(`${runId}.${expires}`).digest('hex')}`;
}
export function verifyRun(secret, token, now=Date.now()) {
  if (!secret || typeof token !== 'string') return null;
  const parts=token.split('.');
  if(parts.length!==3 || !/^[a-f0-9-]{36}$/.test(parts[0]) || !/^\d{13}$/.test(parts[1]))return null;
  const exp=Number(parts[1]);
  if(exp<=now || exp>now+16*60_000 || !equal(token,signRun(secret,parts[0],exp)))return null;
  return {runId:parts[0],expires:exp};
}
export async function readJSON(req, max=4096) {
  const chunks=[];let bytes=0;
  for await(const c of req) {bytes+=c.length;if(bytes>max)throw Error('Body limit');chunks.push(c);}
  return JSON.parse(Buffer.concat(chunks).toString());
}
export function json(res,status,value) {
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(value));
}
