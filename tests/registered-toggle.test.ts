// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { operationManifestHash } from '../lib/omnicore-operations.mjs';
const state=vi.hoisted(()=>({user:true,role:'admin',approved:true,receiverHits:0,enabled:true,missing:false,fail:false,fetch:vi.fn(),events:[] as any[],deliveries:[] as Promise<unknown>[]}));
vi.mock('@/lib/supabase/config',()=>({supabaseUrl:'https://db.example'}));
vi.mock('@/lib/omnicore-identity',()=>({verifyExistingSiteIdentity:()=>state.user?{verified:true,subject:'synthetic-admin',expiresAt:Date.now()+60000}:null}));
vi.mock('next/server',()=>({after:(fn:()=>Promise<unknown>)=>{state.deliveries.push(fn());}}));
vi.mock('@/lib/supabase/server',async()=>({createClient:async(options:any={})=>{
  if(options.operationFetch){const {createClient}=await import('@supabase/supabase-js');return createClient('https://db.example','synthetic-publishable',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:options.operationFetch}});}
  return {from:()=>({select:()=>({eq:()=>({single:async()=>({data:{account_type:state.role},error:null})})})})};
}}));
import {POST} from '../app/api/scheduling/office-hours/toggle/route';
const siteId='00000000-0000-4000-8000-000000000001', id='00000000-0000-4000-8000-000000000002';
const request=(input:unknown,origin='https://www.indiancreekpsych.com',type='application/json')=>new Request('https://www.indiancreekpsych.com/api/scheduling/office-hours/toggle',{method:'POST',headers:{origin,'content-type':type},body:JSON.stringify(input)});
beforeEach(()=>{
  state.user=true;state.role='admin';state.approved=true;state.receiverHits=0;state.enabled=true;state.missing=false;state.fail=false;state.events.length=0;state.deliveries.length=0;
  vi.stubEnv('OMNICORE_SITE_ID',siteId);vi.stubEnv('OMNICORE_INGEST_KEY','synthetic-only');
  state.fetch.mockReset();state.fetch.mockImplementation(async(input:any,init:any)=>{
    const url=String(input);
    if(url.endsWith('/ingest')){state.events.push(...JSON.parse(init.body).events);return Response.json({});}
    if(url.endsWith('/protected-operation')){const body=JSON.parse(init.body);return Response.json({siteId,operationId:body.manifest.id,nonce:body.nonce,manifestHash:operationManifestHash(body.manifest),state:state.approved?'approved':'inactive',revision:1,allowedOrigins:['https://db.example'],validUntil:new Date(Date.now()+5000).toISOString()});}
    state.receiverHits++;expect(init.redirect).toBe('error');
    expect(new URL(url).origin).toBe('https://db.example');expect(init.method).toBe('PATCH');
    if(state.fail)return Response.json({message:'synthetic receiver failure'},{status:500});
    if(state.missing)return Response.json([]);
    state.enabled=JSON.parse(init.body).enabled;
    return Response.json({id,weekday:1,start_time:'09:00:00',end_time:'17:00:00',anchor_time:null,enabled:state.enabled});
  });vi.stubGlobal('fetch',state.fetch);
});
afterEach(async()=>{await Promise.all(state.deliveries);vi.unstubAllEnvs();vi.unstubAllGlobals();});
test('registered clinic adapter pauses and enables only the synthetic rule through guarded SDK fetch',async()=>{
  expect((await POST(request({id,enabled:false}))).status).toBe(200);expect(state.enabled).toBe(false);
  const response=await POST(request({id,enabled:true}));expect(response.status).toBe(200);expect((await response.json()).rule.enabled).toBe(true);expect(state.receiverHits).toBe(2);
  await Promise.all(state.deliveries);
  const outgoing=state.events.filter(e=>e.scope==='outbound'&&e.phase==='completed');expect(outgoing).toHaveLength(2);
  for(const event of outgoing){expect(event.access.outcome).toBe('verified');expect(event.firewall.outcome).toBe('allowed');expect(event.parentOperationId).toBeTruthy();expect(event.requestId).toBeTruthy();}
});
test('missing approval, unsigned caller, non-admin, cross-origin and format controls cannot update',async()=>{
  state.approved=false;expect((await POST(request({id,enabled:false}))).status).toBe(403);state.approved=true;
  state.user=false;expect((await POST(request({id,enabled:false}))).status).toBe(401);state.user=true;
  state.role='patient';expect((await POST(request({id,enabled:false}))).status).toBe(403);state.role='admin';
  expect((await POST(request({id,enabled:false},'https://evil.example'))).status).toBe(403);
  expect((await POST(request({id,enabled:false},undefined,'text/plain'))).status).toBe(403);
  expect(state.receiverHits).toBe(0);expect(state.enabled).toBe(true);
});
test.each([{id:'bad-id',enabled:false},{id,enabled:'false'},{id,enabled:false,extra:'synthetic'}])('invalid operation payload %j sends nothing',async input=>{
  expect((await POST(request(input))).status).toBe(422);expect(state.receiverHits).toBe(0);
});
test('missing row and failed receiver are not reported as successful updates',async()=>{
  state.missing=true;expect((await POST(request({id,enabled:false}))).status).toBe(404);
  state.missing=false;state.fail=true;expect((await POST(request({id,enabled:false}))).status).toBe(503);expect(state.enabled).toBe(true);
});
