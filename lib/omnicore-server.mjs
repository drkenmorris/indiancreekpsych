/** OmniCore server connector v2. Server only: never import in browser code.
 * Only instrumented operations are visible. No raw bodies, headers, queries or visitor IPs leave the site. Only bounded, sanitized signal categories are emitted.
 */
import { randomUUID, createHmac, createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
// Server-created context only. Never recover authority from request headers.
const requestContext = new AsyncLocalStorage();
// Export only bounded media-type categories, never raw header values or parameters.
const mediaTypes = ["application/json", "text/plain", "application/x-www-form-urlencoded", "multipart/form-data", "application/octet-stream", "text/html", "application/xml", "text/xml"];
const mediaType = value => !value ? "missing" : mediaTypes.includes(value.split(";")[0].trim().toLowerCase()) ? value.split(";")[0].trim().toLowerCase() : "other";
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
function validateTestProvenance(value) {
  if (value === undefined) return;
  if (!value || Object.keys(value).sort().join(",") !== "kind,runId,scenario,source,version"
    || value.kind !== "controlled_test" || value.source !== "server_fixed_fixture"
    || value.version !== "OC-TEST-PROVENANCE-1" || value.scenario !== "office_hours_content_type"
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.runId)) throw Error("Invalid server test provenance");
}
const detectorCodes = ["prompt_override", "script_markup", "sql_pattern", "path_traversal", "shell_pattern"];
function validateFirewall(policy, outbound = false) {
  if (policy === undefined) return;
  const keys = outbound ? ["mode", "allowedOrigins"] : ["mode", "allowedMethods", "allowedContentTypes", "maxDeclaredRequestBytes", "denyIndicators"];
  if (!policy || typeof policy !== "object" || Array.isArray(policy)
    || Object.keys(policy).some(k => !keys.includes(k))
    || (policy.mode !== undefined && !["observe", "enforce"].includes(policy.mode)))
    throw Error("Invalid firewall policy");
  const list = (value, valid) => Array.isArray(value) && value.length <= 100 && value.every(valid);
  if (outbound) {
    if (!list(policy.allowedOrigins, value => {
      try { const u = new URL(value); return u.protocol === "https:" && value === u.origin && !u.username && !u.password; } catch { return false; }
    })) throw Error("Use exact HTTPS origins in the outgoing allowlist");
  } else {
    if (policy.allowedMethods !== undefined && !list(policy.allowedMethods, v => ["GET","HEAD","POST","PUT","PATCH","DELETE","OPTIONS"].includes(v))) throw Error("Invalid method allowlist");
    if (policy.allowedContentTypes !== undefined && !list(policy.allowedContentTypes, v => typeof v === "string" && /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(v))) throw Error("Invalid content-type allowlist");
    if (policy.maxDeclaredRequestBytes !== undefined && (!Number.isSafeInteger(policy.maxDeclaredRequestBytes) || policy.maxDeclaredRequestBytes < 0 || policy.maxDeclaredRequestBytes > 1e9)) throw Error("Invalid declared size limit");
    if (policy.denyIndicators !== undefined && !list(policy.denyIndicators, v => detectorCodes.includes(v))) throw Error("Invalid indicator codes");
  }
}
// Fixed detector codes only: inspected content never becomes telemetry.
const indicators = [
  [
    "prompt_override",
    /(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|system)\s+(?:instructions|prompts|rules)/i,
  ],
  ["script_markup", /<\s*script\b|javascript\s*:/i],
  ["sql_pattern", /\bunion\s+(?:all\s+)?select\b|\bdrop\s+table\b/i],
  ["path_traversal", /(?:\.\.[/\\]){2,}/],
  ["shell_pattern", /(?:\bcurl\b|\bwget\b)[^\r\n]{0,200}\|\s*(?:sh|bash)\b/i],
];
const scanText = (text) => {
  let decoded = text;
  try {
    decoded = decodeURIComponent(text.replace(/\+/g, " "));
  } catch {}
  // Recognize JSON unicode escapes without executing or recursively parsing input.
  decoded = decoded.replace(/\\u([0-9a-f]{4})/gi, (_, n) =>
    String.fromCharCode(parseInt(n, 16)),
  );
  return indicators
    .filter(([, pattern]) => pattern.test(decoded))
    .map(([code]) => code);
};
export async function inspectSecurity(message, options = {}) {
  const maxBytes = Math.max(
    1,
    Math.min(65536, Math.floor(options.maxBytes || 16384)),
  );
  const timeoutMs = Math.max(
    1,
    Math.min(500, Math.floor(options.timeoutMs || 100)),
  );
  const result = {
    detectorVersion: "OC-SECURITY-1",
    state: "disabled",
    inspectedBytes: 0,
    codes: [],
  };
  if (options.url) {
    try {
      const url = new URL(message.url);
      const text = url.pathname + url.search;
      const raw = new TextEncoder().encode(text.slice(0, maxBytes));
      result.inspectedBytes = Math.min(raw.byteLength, maxBytes);
      result.state =
        text.length > maxBytes || raw.byteLength > maxBytes
          ? "limited"
          : "complete";
      result.codes = scanText(
        new TextDecoder().decode(raw.subarray(0, maxBytes)),
      );
    } catch {
      result.state = "error";
    }
    return result;
  }
  if (!options.body) return result;
  if (!message?.body) return { ...result, state: "empty" };
  const type = (message.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (
    !/^(application\/(?:json|[^/]+\+json|x-www-form-urlencoded)|text\/(?:plain|html))$/.test(
      type,
    )
  )
    return { ...result, state: "unsupported" };
  let reader, timer;
  try {
    reader = message.clone().body.getReader();
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("inspection deadline")),
        timeoutMs,
      );
    });
    const chunks = [];
    result.state = "complete";
    while (true) {
      const { value, done } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      const remaining = maxBytes - result.inspectedBytes;
      const part = value.subarray(0, remaining);
      chunks.push(part);
      result.inspectedBytes += part.byteLength;
      if (value.byteLength > remaining || result.inspectedBytes === maxBytes) {
        result.state = "limited";
        break;
      }
    }
    const bytes = new Uint8Array(result.inspectedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    result.codes = scanText(new TextDecoder().decode(bytes));
  } catch {
    result.state = "error";
  } finally {
    clearTimeout(timer);
    // A tee branch can wait for the original consumer: never await cancellation.
    if (reader) void reader.cancel().catch(() => {});
  }
  return result;
}

export function createOmniCore({
  siteId = process.env.OMNICORE_SITE_ID,
  key = process.env.OMNICORE_INGEST_KEY,
  endpoint = "https://omnicoreai.app/api/omnicore/monitoring/ingest",
  fetchImpl = globalThis.fetch,
  onDelivery = () => {},
} = {}) {
  if (!siteId || !key)
    throw new Error(
      "Configure server-only OMNICORE_SITE_ID and OMNICORE_INGEST_KEY.",
    );
  const target = new URL(endpoint);
  if (target.protocol !== "https:")
    throw new Error("OmniCore ingestion requires HTTPS.");
  const bytes = (value) =>
    value !== null && /^\d+$/.test(value) && Number(value) <= 1e9
      ? Number(value)
      : null;
  const method = (value) =>
    ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(
      String(value).toUpperCase(),
    )
      ? String(value).toUpperCase()
      : "OTHER";
  const routeLabel = (value) => {
    if (
      typeof value !== "string" ||
      !value.length ||
      value.length > 120 ||
      !/^[a-zA-Z0-9_/:.*\[\]-]+$/.test(value)
    )
      throw new Error(
        "Use a static route template without user identifiers or queries.",
      );
    return value;
  };
  async function send(event) {
    let status = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({ siteId, events: [event] }),
          signal: AbortSignal.timeout(2000),
          redirect: "error",
        });
        status = response.status;
        if (response.ok) {
          try {
            onDelivery({ ok: true, status, eventId: event.id });
          } catch {}
          return true;
        }
        if (status < 500 && status !== 429) break;
      } catch {
        status = 0;
      }
    }
    try {
      onDelivery({ ok: false, status, eventId: event.id });
    } catch {}
    return false;
  }
  async function approvedDecision(request, options, operationId, codes) {
    if (!options.enforcement) return { outcome: "disabled" };
    if (!codes.length || /[\[\]*]/.test(options.route))
      return { outcome: "no_match" };
    try {
      const response = await fetchImpl(new URL("decision", endpoint).href, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(800),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          siteId,
          operationId,
          hostname: new URL(request.url).hostname,
          route: options.route,
          method: method(request.method),
          scope: options.scope ?? "application",
          synthetic: options.synthetic === true,
          codes,
        }),
      });
      if (!response.ok) throw new Error("Decision unavailable");
      const decision = await response.json();
      if (decision.action === "allow") return { outcome: "no_match" };
      const uuid =
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
      const deadline = Date.parse(decision.validUntil),
        expires = Date.parse(decision.expiresAt),
        now = Date.now();
      if (
        decision.action !== "block" ||
        decision.operationId !== operationId ||
        !uuid.test(decision.ruleId) ||
        !uuid.test(decision.decisionId) ||
        !Number.isFinite(deadline) ||
        !Number.isFinite(expires) ||
        deadline <= now ||
        expires <= now ||
        deadline > now + 3000 ||
        expires < deadline
      )
        throw new Error("Invalid or stale decision");
      return {
        outcome: "blocked",
        ruleId: decision.ruleId,
        decisionId: decision.decisionId,
      };
    } catch {
      try {
        onDelivery({ ok: false, status: 503, eventId: operationId });
      } catch {}
      return { outcome: "unavailable" };
    }
  }
  async function observe(
    operation,
    request,
    options,
    direction,
    remoteHostname = null,
    outboundURL = null,
  ) {
    const route = routeLabel(options.route),
      start = performance.now();
    const operationId = randomUUID();
    const inherited = requestContext.getStore();
    const parent = direction === "outbound" && inherited?.siteId === siteId
      && inherited.active ? inherited : undefined;
    const requestId = direction === "inbound" ? randomUUID() : parent?.requestId;
    const context = direction === "inbound"
      ? { siteId, requestId, operationId, active: true, verifiedUntil: 0 }
      : undefined;
    let access = { outcome: "not_required" };
    const hint = request.headers.get("sec-fetch-site");
    const base = {
      operationId,
      ...(requestId ? { requestId } : {}),
      ...(parent ? { parentOperationId: parent.operationId } : {}),
      ...(options.scope ? { scope: options.scope } : {}),
      direction,
      method: method(request.method),
      route,
      remoteHostname,
      originHint: ["same-origin", "same-site", "cross-site", "none"].includes(
        hint,
      )
        ? hint
        : "unknown",
      requestBytes: bytes(request.headers.get("content-length")),
      dataClass: options.dataClass ?? "unknown",
      synthetic: options.synthetic === true,
      ...(options.testProvenance ? { testProvenance: { ...options.testProvenance } } : {}),
    };
    const deliveries = [];
    let needsAwait = !options.schedule;
    function submit(fields) {
      const event = {
        ...base,
        ...fields,
        id: randomUUID(),
        observedAt: new Date().toISOString(),
      };
      const delivery = (async () => {
        if (fields.phase === "completed" && options.assessBoundaries) {
          let timer;
          try {
            const signals = await Promise.race([
              Promise.resolve().then(() =>
                options.assessBoundaries(Object.freeze({ ...event })),
              ),
              new Promise((_, reject) => {
                timer = setTimeout(
                  () => reject(new Error("Criterion adapter timeout")),
                  1500,
                );
              }),
            ]);
            if (
              !Array.isArray(signals) ||
              signals.length > 174 ||
              new Set(signals.map((s) => s?.udvId)).size !== signals.length
            )
              throw new Error("Invalid criterion signals");
            event.boundarySignals = signals.map((s) => {
              if (
                !/^UDV-\d{3}$/.test(s.udvId) ||
                Number(s.udvId.slice(4)) < 1 ||
                Number(s.udvId.slice(4)) > 174 ||
                (s.acceptableConditionsMet &&
                  s.boundaryCrossingConditionPresent) ||
                (s.boundaryCrossingConditionPresent && s.severity < 1) ||
                typeof s.acceptableConditionsMet !== "boolean" ||
                typeof s.boundaryCrossingConditionPresent !== "boolean" ||
                !Number.isFinite(s.evidenceConfidence) ||
                s.evidenceConfidence < 0 ||
                s.evidenceConfidence > 1 ||
                !Number.isInteger(s.severity) ||
                s.severity < 0 ||
                s.severity > 4 ||
                !Array.isArray(s.evidenceRefs) ||
                !s.evidenceRefs.length ||
                s.evidenceRefs.length > 2 ||
                s.evidenceRefs.some(
                  (ref) =>
                    typeof ref !== "string" || !/^[a-f0-9]{64}$/.test(ref),
                )
              )
                throw new Error("Invalid criterion evidence");
              return {
                udvId: s.udvId,
                acceptableConditionsMet: s.acceptableConditionsMet,
                boundaryCrossingConditionPresent:
                  s.boundaryCrossingConditionPresent,
                evidenceConfidence: s.evidenceConfidence,
                severity: s.severity,
                evidenceRefs: s.evidenceRefs,
              };
            });
          } catch {
            try {
              onDelivery({ ok: false, status: 422, eventId: event.id });
            } catch {}
          } finally {
            clearTimeout(timer);
          }
        }
        return send(event);
      })();
      deliveries.push(delivery);
      if (options.schedule) {
        try {
          options.schedule(delivery);
        } catch {
          needsAwait = true;
        }
      }
    }
    // Report initiation immediately, without waiting for the business operation to finish.
    submit({ phase: "started", status: 0, durationMs: 0, responseBytes: null });
    const requestInspection = options.inspection
      ? await inspectSecurity(request, {
          ...options.inspection,
          url: false,
          body: options.inspection.requestBody,
        })
      : undefined;
    // Outbound inspection uses a dedicated Request clone. Release that unused
    // branch before fetch consumes the original, avoiding an unbounded tee buffer.
    if (direction === "outbound" && request instanceof Request && request.body)
      void request.body.cancel().catch(() => {});
    const urlInspection = options.inspection?.url
      ? await inspectSecurity(request, { ...options.inspection, url: true })
      : undefined;
    const policy = direction === "inbound" ? options.requestFirewall : options.outboundFirewall;
    const policyCodes = [];
    if (policy && direction === "inbound") {
      if (policy.allowedMethods && !policy.allowedMethods.includes(request.method)) policyCodes.push("method_not_allowed");
      if (policy.allowedContentTypes && !policy.allowedContentTypes.includes((request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase())) policyCodes.push("content_type_not_allowed");
      if (policy.maxDeclaredRequestBytes !== undefined) {
        const raw = request.headers.get("content-length");
        if (raw !== null && (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)))) policyCodes.push("invalid_declared_length");
        else if (raw !== null && Number(raw) > policy.maxDeclaredRequestBytes) policyCodes.push("declared_size_exceeded");
      }
      if (policy.denyIndicators?.length) {
        const scans = [requestInspection, urlInspection].filter(Boolean);
        if (!scans.length || scans.some(s => ["limited","error","unsupported"].includes(s.state))) policyCodes.push("inspection_incomplete");
        if (scans.some(s => s.codes.some(code => policy.denyIndicators.includes(code)))) policyCodes.push("indicator_matched");
      }
    }
    if (policy && direction === "outbound" && (outboundURL.protocol !== "https:"
      || outboundURL.username || outboundURL.password || !policy.allowedOrigins.includes(outboundURL.origin)))
      policyCodes.push("destination_not_allowed");
    const firewall = policy ? { mode: policy.mode ?? "observe", outcome: policyCodes.length
      ? policy.mode === "enforce" ? "denied" : "would_deny" : "allowed", codes: policyCodes } : undefined;
    const firewallResponse = firewall?.outcome === "denied" ? new Response(JSON.stringify({
      error: "Request denied by the site's OmniCore firewall policy.", reference: operationId,
    }), {status: 403, headers: {"Content-Type":"application/json", "Cache-Control":"no-store"}}) : undefined;
    let accessResponse;
    const denyAccess = (status, outcome) => {
      access = { outcome };
      return new Response(JSON.stringify({
        error: status === 401 ? "Verified caller identification required."
          : status === 503 ? "Caller verification unavailable. Retry later."
          : "An active verified parent request is required.",
        code: outcome, reference: operationId,
        ...(status === 401 ? {
          authenticationRequired: true, retryWithNewRequest: true,
          ...(options.identity?.authenticationPath ? { authenticationPath: options.identity.authenticationPath } : {}),
        } : {}),
      }), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    };
    if (direction === "inbound" && options.identity !== undefined) {
      const controller = new AbortController();
      // Trace verification calls without sharing the handler's future authority.
      const verificationContext = { ...context, verifiedUntil: 0 };
      let timer;
      try {
        if (typeof options.identity?.verify !== "function") throw Error("Missing identity verifier");
        const deadline = Math.max(10, Math.min(5000, options.identity.timeoutMs || 1000));
        const identity = await Promise.race([
          requestContext.run(verificationContext, () =>
            Promise.resolve().then(() => options.identity.verify(request, { signal: controller.signal }))),
          new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Error("Verification timed out")); }, deadline); }),
        ]);
        if (identity?.verified !== true || typeof identity.subject !== "string"
          || !identity.subject.length || identity.subject.length > 1024
          || !Number.isFinite(identity.expiresAt) || identity.expiresAt <= Date.now()) {
          accessResponse = denyAccess(401, "identity_rejected");
        } else {
          context.verifiedUntil = Math.min(identity.expiresAt, Date.now() + 300000);
          context.principalRef = createHmac("sha256", key).update(JSON.stringify([siteId, identity.subject])).digest("hex");
          access = { outcome: "verified", principalRef: context.principalRef };
        }
      } catch {
        accessResponse = denyAccess(503, "identity_unavailable");
      } finally {
        verificationContext.active = false;
        clearTimeout(timer);
        controller.abort();
      }
    }
    if (direction === "outbound" && options.requireVerifiedRequest === true) {
      if (!parent || !parent.active || parent.verifiedUntil <= Date.now()) {
        accessResponse = denyAccess(403, "verified_request_required");
      } else {
        access = { outcome: "verified", principalRef: parent.principalRef };
      }
    }
    const enforcement =
      accessResponse || firewallResponse ? { outcome: "not_applicable" } :
      direction === "inbound"
        ? options.enforcement !== true
          ? { outcome: "disabled" }
          : await approvedDecision(request, options, operationId, [
              ...new Set([
                ...(requestInspection?.codes ?? []),
                ...(urlInspection?.codes ?? []),
              ]),
            ])
        : { outcome: "not_applicable" };
    let response,
      thrown,
      failed = false;
    try {
      // The existing rule-decision lookup may have consumed the remaining lease.
      if (!accessResponse && context?.verifiedUntil && context.verifiedUntil <= Date.now())
        accessResponse = denyAccess(401, "identity_rejected");
      response =
        accessResponse ?? firewallResponse ?? (enforcement.outcome === "blocked"
          ? new Response(
              JSON.stringify({
                error: "Request blocked by an owner-approved OmniCore rule.",
                reference: enforcement.decisionId,
              }),
              {
                status: 403,
                headers: {
                  "Content-Type": "application/json",
                  "Cache-Control": "no-store",
                  "X-OmniCore-Blocked": "1",
                },
              },
            )
          : context
            ? await requestContext.run(context, operation)
            : await operation());
    } catch (error) {
      failed = true;
      thrown = error;
    } finally {
      // Detached background work must obtain its own authority.
      if (context) context.active = false;
    }

    const responseInspection = options.inspection
      ? await inspectSecurity(response, {
          ...options.inspection,
          url: false,
          body: options.inspection.responseBody,
        })
      : undefined;
    submit({
      ...(requestInspection
        ? {
            security: {
              request: requestInspection,
              response: responseInspection,
              ...(urlInspection ? { url: urlInspection } : {}),
            },
          }
        : {}),
      enforcement,
      access,
      ...(firewall ? { firewall, firewallEvidence: {
        version: "OC-FIREWALL-EVIDENCE-1", policyVersion: "OC-NATIVE-FIREWALL-1", stage: "before_handler",
        policyHash: createHash("sha256").update(canonical({ version: "OC-NATIVE-FIREWALL-1", direction, route, method: method(request.method), scope: options.scope ?? null, policy })).digest("hex"),
        ...(direction === "inbound" ? { contentType: mediaType(request.headers.get("content-type")),
          ...(policy.allowedContentTypes ? { allowedContentTypes: policy.allowedContentTypes.map(mediaType) } : {}) } : {}),
      } } : {}),
      phase: "completed",
      status: response?.status ?? 0,
      durationMs: Math.min(3600000, Math.round(performance.now() - start)),
      responseBytes: bytes(response?.headers.get("content-length") ?? null),
    });
    if (needsAwait) await Promise.all(deliveries);
    if (failed) throw thrown;
    return response;
  }
  return {
    withRoute(handler, options) {
      routeLabel(options.route);
      validateFirewall(options.requestFirewall);
      validateTestProvenance(options.testProvenance);
      if (options.outboundFirewall !== undefined) throw Error("Use outboundFirewall on observedFetch");
      if (options.requestFirewall?.denyIndicators?.length && !options.inspection?.url && !options.inspection?.requestBody)
        throw Error("Indicator rules require explicit request or URL inspection");
      if (options.requireVerifiedRequest !== undefined)
        throw Error("requireVerifiedRequest is an outbound option; configure identity on protected routes.");
      const authPath = options.identity?.authenticationPath;
      if (authPath !== undefined && (typeof authPath !== "string"
        || !/^\/[a-zA-Z0-9_/-]*$/.test(authPath) || authPath.startsWith("//")))
        throw Error("Use a same-site authentication path without query parameters.");
      return (request, ...args) =>
        observe(() => handler(request, ...args), request, options, "inbound");
    },
    observedFetch(input, init = {}, options) {
      validateFirewall(options.outboundFirewall, true);
      validateTestProvenance(options.testProvenance);
      if (options.requestFirewall !== undefined) throw Error("Use requestFirewall on withRoute");
      if (options.identity !== undefined)
        throw Error("Configure identity on the parent route, not an outgoing call.");
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.hostname === target.hostname)
        throw new Error("Do not instrument OmniCore telemetry calls.");
      let request = {
        method:
          init.method ?? (input instanceof Request ? input.method : "GET"),
        headers: new Headers(
          init.headers ??
            (input instanceof Request ? input.headers : undefined),
        ),
      };
      if (options.inspection?.requestBody) {
        try {
          request = new Request(
            input instanceof Request ? input.clone() : input,
            init,
          );
        } catch {
          // Still report that the body could not be inspected; preserve fetch semantics.
          request.body = true;
        }
      }
      return observe(
        () => fetchImpl(input instanceof Request ? input : url.href,
          options.outboundFirewall?.mode === "enforce" ? { ...init, redirect: "error" } : init),
        request,
        options,
        "outbound",
        url.hostname.replace(/^\[|\]$/g, ""),
        url,
      );
    },
  };
}
