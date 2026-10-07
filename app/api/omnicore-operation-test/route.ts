export const dynamic = 'force-dynamic';
const endpoint = 'https://omnicoreai.app/api/omnicore/monitoring/operation-test';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const reply = (body: unknown, status: number) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});

// Separate synthetic fixture. Never calls patient, scheduling, session or database code.
// The fixed upstream stores the synthetic records; export returns across the network
// and is then delivered to a separately recorded receipt in OmniCore.
export async function POST(request: Request) {
  const until = Date.parse(process.env.OMNICORE_OPERATION_TEST_UNTIL ?? '');
  if (!Number.isFinite(until) || until<=Date.now() || until>Date.now()+30*60_000) return new Response(null,{status:404});
  const key=process.env.OMNICORE_INGEST_KEY, siteId=process.env.OMNICORE_SITE_ID;
  if(!key||!siteId) return reply({error:'Diagnostic connector unavailable'},503);
  if(!request.headers.get('content-type')?.includes('application/json')) return reply({error:'Use JSON'},415);
  let input: any;
  try {const raw=await request.text();if(Buffer.byteLength(raw)>1024)return reply({error:'Too large'},413);input=JSON.parse(raw);}catch{return reply({error:'Invalid JSON'},422);}
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='destination,operation,operationId,record,sessionId'
    ||!uuid.test(input.sessionId)||!uuid.test(input.operationId)||!['read','write','export'].includes(input.operation)
    ||!['alpha','beta'].includes(input.record)||!['none','approved','unapproved'].includes(input.destination)) return reply({error:'Invalid diagnostic operation'},422);
  const hostname=new URL(request.url).hostname;
  if(!['indiancreekpsych.com','www.indiancreekpsych.com'].includes(hostname)) return reply({error:'Diagnostic production hostname required'},403);
  const headers={'content-type':'application/json',authorization:`Bearer ${key}`};
  const body={...input,siteId,hostname};
  try {
    const decision=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(5000),redirect:'error',cache:'no-store'});
    const result=await decision.json();
    if(!decision.ok||result.allowed!==true) return reply({synthetic:true,allowed:false,reason:result.reason??'UPSTREAM_REJECTED',operationId:input.operationId},decision.status===403?403:503);
    if(result.operationId!==input.operationId||!['SYNTHETIC_ALPHA','SYNTHETIC_UPDATED'].includes(result.value)) return reply({error:'Invalid upstream result'},503);
    if(input.operation==='export') {
      if(input.destination!=='approved') return reply({error:'Export destination rejected'},403);
      const delivered=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({...body,operation:'receipt',value:result.value}),signal:AbortSignal.timeout(5000),redirect:'error',cache:'no-store'});
      const receipt=await delivered.json();
      if(!delivered.ok||receipt.allowed!==true||receipt.operationId!==input.operationId||receipt.received!==true) return reply({synthetic:true,allowed:false,reason:receipt.reason??'RECEIPT_UNVERIFIED',operationId:input.operationId},delivered.status===403?403:503);
      console.info('OMNICORE_DIAGNOSTIC_EXPORT_DELIVERED',input.operationId);
      return reply({synthetic:true,allowed:true,operationId:input.operationId,received:true},200);
    }
    console.info('OMNICORE_DIAGNOSTIC_OPERATION_COMPLETED',input.operationId,input.operation);
    return reply(result,200);
  } catch {return reply({synthetic:true,allowed:false,error:'Diagnostic outcome unavailable; inspect evidence before retrying',operationId:input.operationId},503);}
}
