import { createOmniCore } from '../omnicore-server.mjs';
import { validateInput, ROUTE, PROTOCOL } from './catalog.mjs';
import { verifyRun, equal } from './security.mjs';

// Shared by the local lab and the proposed clinic route. No patient/db imports.
export function createTarget(config) {
  const { runSecret, witnessSecret, botSecret, telemetry, approvedOrigin, unapprovedOrigin }=config;
  if([runSecret,witnessSecret,botSecret].some(v=>typeof v!=='string'||!/^[a-f0-9]{64}$/i.test(v)))throw Error('Configure three random 32-byte secrets');
  for(const origin of [approvedOrigin,unapprovedOrigin]) {
    const u=new URL(origin);
    if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password)throw Error('Exact HTTPS receiver origin required');
  }
  if(approvedOrigin===unapprovedOrigin)throw Error('Receivers must have different origins');
  return async request => {
    const lease=verifyRun(runSecret,request.headers.get('x-demo-lease'));
    const enabled=Number(config.enabledUntil);
    if(!Number.isFinite(enabled)||Date.now()>=enabled||enabled>Date.now()+16*60_000||!lease)
      return Response.json({error:'Exercise disabled or lease invalid'},{status:404});
    if(new URL(request.url).pathname!==ROUTE)return new Response(null,{status:404});
    // Bounded actual bytes, independent of Content-Length. Never feed a large stream to inspection.
    let raw;
    try {
      const reader=request.body?.getReader();let size=0;const chunks=[];
      if(reader) {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){void reader.cancel();throw Error('limit');}chunks.push(value);}}
      raw=Buffer.concat(chunks).toString();
    }catch{return Response.json({error:'Exercise byte limit'},{status:413});}
    let input;
    try{input=validateInput(JSON.parse(raw));if(input.runId!==lease.runId)throw Error('run');}
    catch{return Response.json({error:'Invalid exercise input'},{status:422});}
    try {
      const reserved=await fetch(`${approvedOrigin}/reserve`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(3000),
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${witnessSecret}`,'X-Demo-Lease':request.headers.get('x-demo-lease')},
        body:JSON.stringify({runId:input.runId,attemptId:input.attemptId})});
      if(!reserved.ok)return Response.json({error:'Independent exercise budget or replay control denied the attempt'},{status:429});
    }catch{return Response.json({error:'Independent witness unavailable'},{status:503});}
    const events=[], deliveries=[];
    const monitor=createOmniCore({ ...telemetry,
      onDelivery: result => deliveries.push({ok:result.ok,status:result.status,eventId:result.eventId}),
      fetchImpl: async (url,init) => {
        if(String(url)===telemetry.endpoint) {
          const parsed=JSON.parse(init.body);events.push(...parsed.events);
        }
        return fetch(url,init);
      },
    });
    let handlerStarted=false;
    const handler=monitor.withRoute(async req => {
      handlerStarted=true;
      // Resource permissions belong to the application; label this separately from OmniCore decisions.
      if(input.record==='restricted')return Response.json({code:'application_authorization_denied'},{status:403});
      if(input.operation==='export') {
        const destination=input.destination==='approved'?approvedOrigin:unapprovedOrigin;
        const result=await monitor.observedFetch(`${destination}/effect`,{
          method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${witnessSecret}`},
          body:JSON.stringify({runId:input.runId,attemptId:input.attemptId,operation:'export',marker:'DUMMY_ONLY'}),
          signal:AbortSignal.timeout(4000),
        },{route:ROUTE,scope:'outbound',dataClass:'operational',synthetic:true,
          requireVerifiedRequest:true,outboundFirewall:{mode:'enforce',allowedOrigins:[approvedOrigin]}});
        return Response.json({code:result.ok?'dummy_export_received':'export_not_completed'},{status:result.status});
      }
      const result=await fetch(`${approvedOrigin}/effect`,{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${witnessSecret}`},
        body:JSON.stringify({runId:input.runId,attemptId:input.attemptId,operation:input.operation,marker:'DUMMY_ONLY'}),
        signal:AbortSignal.timeout(4000),redirect:'error',
      });
      const receipt=await result.json();
      return Response.json({code:result.ok?'dummy_operation_completed':'witness_unavailable',
        ...(result.ok?{dummyValue:receipt.value}:{})},{status:result.ok?200:503});
    },{route:ROUTE,scope:'application',synthetic:true,dataClass:'operational',
      identity:{verify:()=>equal(request.headers.get('authorization'),`Bearer ${botSecret}`)?{verified:true,subject:'demo-bot',expiresAt:lease.expires}:null},
      inspection:{requestBody:true,url:false,responseBody:false,maxBytes:2048,timeoutMs:100},
      requestFirewall:{mode:'enforce',allowedMethods:['POST'],allowedContentTypes:['application/json'],
        maxDeclaredRequestBytes:2048,denyIndicators:['prompt_override','script_markup','sql_pattern','path_traversal','shell_pattern']},
    });
    try {
      const result=await handler(new Request(request.url,{method:request.method,headers:request.headers,body:raw}));
      const unique=[...new Map(events.map(e=>[e.id,e])).values()];
      return Response.json({protocol:PROTOCOL,runId:input.runId,attemptId:input.attemptId,
        handlerStarted,result:await result.json(),connectorEvents:unique,deliveries,
        evidenceSource:'connector-emitted telemetry; receiver delivery reported separately'}, {status:result.status});
    }catch{return Response.json({protocol:PROTOCOL,runId:input.runId,attemptId:input.attemptId,error:'Outcome unavailable; inspect witness',connectorEvents:events,deliveries},{status:503});}
  };
}
