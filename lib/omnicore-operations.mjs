/** Server-only protected-operation kit. Explicit registered handlers only; never remote code. */
import { createHash, randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createOmniCore } from './omnicore-server.mjs';

export function operationManifest(value) {
  const keys = ['version','id','name','route','method','allowedOrigins','maxBodyBytes'];
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join() !== keys.sort().join() || value.version !== 1 ||
      !/^[a-z][a-z0-9-]{0,63}$/.test(value.id) || typeof value.name !== 'string' ||
      !value.name.trim() || value.name.length > 120 || typeof value.route !== 'string' ||
      !/^\/[a-zA-Z0-9_/.:-]{1,119}$/.test(value.route) ||
      !['POST','PUT','PATCH','DELETE'].includes(value.method) ||
      !Number.isSafeInteger(value.maxBodyBytes) || value.maxBodyBytes < 2 || value.maxBodyBytes > 65536 ||
      !Array.isArray(value.allowedOrigins) || !value.allowedOrigins.length || value.allowedOrigins.length > 20)
    throw Error('Invalid protected operation manifest');
  for (const origin of value.allowedOrigins) {
    const u = new URL(origin);
    if (typeof origin !== 'string' || u.protocol !== 'https:' || u.origin !== origin || u.username || u.password)
      throw Error('Use exact HTTPS destination origins');
  }
  return Object.freeze({ version: 1, id: value.id, name: value.name.trim(), route: value.route,
    method: value.method, allowedOrigins: Object.freeze([...new Set(value.allowedOrigins)].sort()), maxBodyBytes: value.maxBodyBytes });
}
export const operationManifestHash = value => createHash('sha256').update(JSON.stringify(operationManifest(value))).digest('hex');
const denial = (status, code) => Response.json({ error: 'Protected operation cannot proceed.', code },
  { status, headers: { 'Cache-Control': 'no-store' } });
async function boundedJSON(request, limit) {
  const reader = request.body?.getReader();
  if (!reader) throw Error('Invalid JSON');
  let timer, length = 0;
  const chunks = [];
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Body deadline')), 1000); });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw Error('Body limit');
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
}

export function createProtectedOperations({ websiteOrigin, siteId = process.env.OMNICORE_SITE_ID,
  key = process.env.OMNICORE_INGEST_KEY, endpoint = 'https://omnicoreai.app/api/omnicore/monitoring/ingest',
  fetchImpl = globalThis.fetch, onDelivery } = {}) {
  const origin = new URL(websiteOrigin);
  if (origin.protocol !== 'https:' || origin.origin !== websiteOrigin || origin.username || origin.password)
    throw Error('Configure the exact HTTPS website origin');
  const monitor = createOmniCore({ siteId, key, endpoint, fetchImpl, onDelivery });
  const registrations = new Map(), context = new AsyncLocalStorage();
  async function resolve(manifest) {
    const nonce = randomUUID();
    const response = await fetchImpl(new URL('protected-operation', endpoint).href, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(1500),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ siteId, hostname: origin.hostname, nonce, manifest }),
    });
    if (!response.ok) throw Error('Policy unavailable');
    const policy = await response.json();
    if (policy.siteId !== siteId || policy.operationId !== manifest.id || policy.nonce !== nonce ||
        policy.manifestHash !== operationManifestHash(manifest)) throw Error('Policy binding mismatch');
    if (policy.state !== 'approved') return null;
    const until = Date.parse(policy.validUntil);
    if (!Number.isFinite(until) || until <= Date.now() || until > Date.now() + 10000 ||
        !Number.isSafeInteger(policy.revision) || !Array.isArray(policy.allowedOrigins) ||
        !policy.allowedOrigins.length || policy.allowedOrigins.some(v => !manifest.allowedOrigins.includes(v)))
      throw Error('Invalid approved policy');
    return { ...policy, until };
  }
  return {
    async sync() {
      const results = [];
      for (const manifest of registrations.values()) {
        const policy = await resolve(manifest);
        results.push({ operationId: manifest.id, approved: policy !== null });
      }
      return results;
    },
    register(manifestInput, adapters) {
      const manifest = operationManifest(manifestInput);
      if (registrations.has(manifest.id)) throw Error('Operation already registered');
      if (registrations.size >= 100) throw Error('Operation registration limit');
      for (const fn of ['verifyIdentity','authorize','validateInput','handler'])
        if (typeof adapters?.[fn] !== 'function') throw Error(`Configure trusted ${fn} adapter`);
      registrations.set(manifest.id, manifest);
      const identities = new WeakMap();
      const wrapped = monitor.withRoute(async request => {
        let policy;
        try { policy = await resolve(manifest); } catch { return denial(503, 'policy_unavailable'); }
        if (!policy) return denial(403, 'owner_approval_required');
        let input;
        try { input = await adapters.validateInput(await boundedJSON(request, manifest.maxBodyBytes)); }
        catch { return denial(422, 'invalid_operation_input'); }
        const identity = identities.get(request);
        let authorized, timer;
        const controller = new AbortController();
        try {
          authorized = await Promise.race([
            Promise.resolve().then(() => adapters.authorize({ request, identity, input, signal: controller.signal })),
            new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Error('Authorization deadline')); }, 1500); }),
          ]);
        } catch { return denial(503, 'authorization_unavailable'); }
        finally { clearTimeout(timer); }
        if (authorized !== true) return denial(403, 'operation_not_authorized');
        if (identity.expiresAt <= Date.now()) return denial(403, 'identity_expired');
        if (policy.until <= Date.now()) return denial(403, 'operation_approval_expired');
        const grant = { active: true, identity, policy };
        const guardedFetch = async (destination, init) => {
          if (context.getStore() !== grant || !grant.active || identity.expiresAt <= Date.now())
            return denial(403, 'operation_context_required');
          let current;
          try { current = await resolve(manifest); } catch { return denial(503, 'policy_unavailable'); }
          if (!current || current.revision !== policy.revision) return denial(403, 'operation_approval_changed');
          if (!grant.active || identity.expiresAt <= Date.now()) return denial(403, 'operation_context_required');
          return monitor.observedFetch(destination, init, {
            route: manifest.route, scope: 'outbound', dataClass: adapters.dataClass ?? 'unknown',
            requireVerifiedRequest: true, outboundFirewall: { mode: 'enforce', allowedOrigins: current.allowedOrigins },
            synthetic: adapters.synthetic === true, schedule: adapters.schedule,
          });
        };
        try { return await context.run(grant, () => adapters.handler({ request, identity, input, fetch: guardedFetch })); }
        finally { grant.active = false; }
      }, {
        route: manifest.route, scope: 'application', dataClass: adapters.dataClass ?? 'unknown', synthetic: adapters.synthetic === true,
        identity: { timeoutMs: 3000, verify: async (request, ctx) => { const identity = await adapters.verifyIdentity(request, ctx);
          if (identity?.verified === true) identities.set(request, Object.freeze({ ...identity })); return identity; } },
        requestFirewall: { mode: 'enforce', allowedMethods: [manifest.method], allowedContentTypes: ['application/json'], maxDeclaredRequestBytes: manifest.maxBodyBytes },
        schedule: adapters.schedule,
      });
      return async request => {
        const url = new URL(request.url);
        if (url.origin !== websiteOrigin || url.pathname !== manifest.route || request.headers.get('origin') !== websiteOrigin)
          return denial(403, 'operation_origin_mismatch');
        try { return await wrapped(request); } finally { identities.delete(request); }
      };
    },
  };
}
