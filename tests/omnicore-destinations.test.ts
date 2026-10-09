// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createServer } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { createOmniCore } from '../lib/omnicore-server.mjs';

const state = vi.hoisted(() => ({
  config: { supabaseUrl: 'https://approved.example.com' },
  events: [] as any[], deliveries: [] as Promise<unknown>[], fetch: vi.fn(),
}));
vi.mock('../lib/supabase/config', () => state.config);
vi.mock('next/server', () => ({ after: (fn: () => Promise<unknown>) => { state.deliveries.push(fn()); } }));
import { protectedSupabaseFetch, monitoredSupabaseFetch } from '../lib/omnicore-monitoring';

const nativeFetch = globalThis.fetch;
const siteId = '00000000-0000-4000-8000-000000000001';
beforeEach(() => {
  state.config.supabaseUrl = 'https://approved.example.com';
  state.events.length = 0; state.deliveries.length = 0; state.fetch.mockReset();
  vi.stubEnv('OMNICORE_SITE_ID', siteId); vi.stubEnv('OMNICORE_INGEST_KEY', 'synthetic-test-only');
  state.fetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes('omnicoreai.app')) {
      state.events.push(...JSON.parse(String(init?.body)).events); return Response.json({});
    }
    return Response.json([{ id: 'synthetic-fixture' }]);
  });
  vi.stubGlobal('fetch', state.fetch);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function verified(handler: () => Promise<Response>) {
  const connector = createOmniCore({ siteId, key: 'synthetic-test-only', fetchImpl: state.fetch });
  return connector.withRoute(handler, {
    route: '/synthetic/protected', synthetic: true,
    identity: { verify: () => ({ verified: true, subject: 'synthetic-caller', expiresAt: Date.now() + 60000 }) },
    schedule: p => state.deliveries.push(p),
  })(new Request('https://clinic.example/synthetic/protected'));
}
const receiverCalls = () => state.fetch.mock.calls.filter(([input]) => !String(input instanceof Request ? input.url : input).includes('omnicoreai.app'));

test('approved Request preserves body, headers, signal and response, with linked verified evidence', async () => {
  const signal = new AbortController().signal;
  const request = new Request('https://approved.example.com/rest/v1/synthetic_fixture', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'SYNTHETIC-SECRET' },
    body: '{"fixture":"SYNTHETIC-BODY"}', signal,
  });
  const response = await verified(() => protectedSupabaseFetch(request));
  expect(await response.json()).toEqual([{ id: 'synthetic-fixture' }]);
  const [sent, init] = receiverCalls()[0];
  expect(sent).toBe(request); expect(init.redirect).toBe('error');
  expect(await sent.text()).toBe('{"fixture":"SYNTHETIC-BODY"}');
  expect(sent.headers.get('authorization')).toBe('SYNTHETIC-SECRET'); expect(sent.signal).toBe(request.signal);
  await Promise.all(state.deliveries);
  const event = state.events.find(e => e.scope === 'outbound' && e.phase === 'completed');
  expect(event.access.outcome).toBe('verified'); expect(event.firewall.outcome).toBe('allowed');
  expect(event.parentOperationId).toBeTruthy();
  const parent = state.events.find(e => e.scope !== 'outbound' && e.phase === 'completed');
  expect(event.parentOperationId).toBe(parent.operationId); expect(event.requestId).toBe(parent.requestId);
  expect(JSON.stringify(state.events)).not.toMatch(/SYNTHETIC-SECRET|SYNTHETIC-BODY/);
});

test.each([
  'https://denied.example.com', 'http://approved.example.com',
  'https://approved.example.com.evil.example', 'https://child.approved.example.com',
  'https://approved.example.com:8443', 'https://user:password@approved.example.com',
])('verified request to %s is denied before receiver effects', async origin => {
  const response = await verified(() => protectedSupabaseFetch(`${origin}/rest/v1/synthetic_fixture`));
  expect(response.status).toBe(403); expect(receiverCalls()).toHaveLength(0);
  await Promise.all(state.deliveries);
  const event = state.events.find(e => e.scope === 'outbound' && e.phase === 'completed');
  expect(event.access.outcome).toBe('verified'); expect(event.firewall.outcome).toBe('denied');
  expect(event.firewall.codes).toContain('destination_not_allowed'); expect(event.parentOperationId).toBeTruthy();
  const parent = state.events.find(e => e.scope !== 'outbound' && e.phase === 'completed');
  expect(event.parentOperationId).toBe(parent.operationId); expect(event.requestId).toBe(parent.requestId);
});

test('Supabase SDK uses the approved destination through the protected wrapper', async () => {
  const client = createClient('https://approved.example.com', 'synthetic-publishable-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: protectedSupabaseFetch },
  });
  await verified(async () => {
    const result = await client.from('synthetic_fixture').select('id');
    expect(result.error).toBeNull(); expect(result.data).toEqual([{ id: 'synthetic-fixture' }]);
    return new Response(null, { status: 204 });
  });
  expect(receiverCalls()).toHaveLength(1); expect(receiverCalls()[0][1].redirect).toBe('error');
});

test('an expired verified parent loses permission before its outgoing call', async () => {
  const connector = createOmniCore({ siteId, key: 'synthetic-test-only', fetchImpl: state.fetch });
  const response = await connector.withRoute(async () => {
    await new Promise(resolve => setTimeout(resolve, 30));
    return protectedSupabaseFetch('https://approved.example.com/rest/v1/synthetic_fixture');
  }, {
    route: '/synthetic/expired', synthetic: true,
    identity: { verify: () => ({ verified: true, subject: 'synthetic-caller', expiresAt: Date.now() + 15 }) },
    schedule: p => state.deliveries.push(p),
  })(new Request('https://clinic.example/synthetic/expired'));
  expect(response.status).toBe(403); expect(receiverCalls()).toHaveLength(0);
});

test('detached work cannot reuse a completed verified parent', async () => {
  let release!: () => void;
  let detached!: Promise<Response>;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await verified(async () => {
    detached = gate.then(() => protectedSupabaseFetch('https://approved.example.com/rest/v1/synthetic_fixture'));
    return new Response(null, { status: 204 });
  });
  release();
  expect((await detached).status).toBe(403); expect(receiverCalls()).toHaveLength(0);
});

test.each(['http://approved.example.com', 'https://user:secret@approved.example.com',
  'https://approved.example.com/path', 'https://approved.example.com?secret=x',
  'https://approved.example.com#fragment', 'not-a-url'])
('invalid configured origin %s fails closed', async config => {
  state.config.supabaseUrl = config;
  const response = await verified(() => protectedSupabaseFetch('https://approved.example.com/rest/v1/synthetic_fixture'));
  expect(response.status).toBe(503); expect(receiverCalls()).toHaveLength(0);
  expect(await response.text()).not.toContain(config);
});

test('preliminary ordinary calls retain their existing destination behavior', async () => {
  expect((await monitoredSupabaseFetch('https://other.example/auth/v1/user')).status).toBe(200);
  expect(receiverCalls()).toHaveLength(1); expect(receiverCalls()[0][1]?.redirect).toBeUndefined();
});

test('an approved receiver redirect cannot reach a second receiver', async () => {
  let initialHits = 0, destinationHits = 0;
  const destination = createServer((_req, res) => { destinationHits++; res.end('synthetic'); });
  await new Promise<void>(resolve => destination.listen(0, '127.0.0.1', resolve));
  const destinationPort = (destination.address() as any).port;
  const initial = createServer((_req, res) => {
    initialHits++; res.writeHead(302, { location: `http://127.0.0.1:${destinationPort}/synthetic` }); res.end();
  });
  await new Promise<void>(resolve => initial.listen(0, '127.0.0.1', resolve));
  const initialPort = (initial.address() as any).port;
  const previous = state.fetch.getMockImplementation()!;
  state.fetch.mockImplementation((input, init) => String(input).startsWith('https://approved.example.com/')
    ? nativeFetch(`http://127.0.0.1:${initialPort}/synthetic`, init) : previous(input, init));
  try {
    await expect(verified(() => protectedSupabaseFetch('https://approved.example.com/redirect'))).rejects.toThrow();
    expect(initialHits).toBe(1); expect(destinationHits).toBe(0);
  } finally {
    await Promise.all([new Promise<void>(resolve => initial.close(() => resolve())),
      new Promise<void>(resolve => destination.close(() => resolve()))]);
  }
});
