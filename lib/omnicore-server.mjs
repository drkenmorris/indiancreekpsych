/** OmniCore server connector v2. Server only: never import in browser code.
 * Only instrumented operations are visible. No bodies, headers, queries or visitor IPs leave the site.
 */
import { randomUUID } from "node:crypto";
// Fixed detector codes only: inspected content never becomes telemetry.
const indicators = [
  ["prompt_override", /(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|system)\s+(?:instructions|prompts|rules)/i],
  ["script_markup", /<\s*script\b|javascript\s*:/i],
  ["sql_pattern", /\bunion\s+(?:all\s+)?select\b|\bdrop\s+table\b/i],
  ["path_traversal", /(?:\.\.[/\\]){2,}/],
  ["shell_pattern", /(?:\bcurl\b|\bwget\b)[^\r\n]{0,200}\|\s*(?:sh|bash)\b/i],
];
const scanText = (text) => {
  let decoded = text;
  try { decoded = decodeURIComponent(text.replace(/\+/g, " ")); } catch {}
  // Recognize JSON unicode escapes without executing or recursively parsing input.
  decoded = decoded.replace(/\\u([0-9a-f]{4})/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
  return indicators.filter(([, pattern]) => pattern.test(decoded)).map(([code]) => code);
};
export async function inspectSecurity(message, options = {}) {
  const maxBytes = Math.max(1, Math.min(65536, Math.floor(options.maxBytes || 16384)));
  const timeoutMs = Math.max(1, Math.min(500, Math.floor(options.timeoutMs || 100)));
  const result = { detectorVersion: "OC-SECURITY-1", state: "disabled", inspectedBytes: 0, codes: [] };
  if (options.url) {
    try {
      const url = new URL(message.url);
      const text = url.pathname + url.search;
      const raw = new TextEncoder().encode(text.slice(0, maxBytes));
      result.inspectedBytes = Math.min(raw.byteLength, maxBytes);
      result.state = text.length > maxBytes || raw.byteLength > maxBytes ? "limited" : "complete";
      result.codes = scanText(new TextDecoder().decode(raw.subarray(0, maxBytes)));
    } catch { result.state = "error"; }
    return result;
  }
  if (!options.body) return result;
  if (!message?.body) return { ...result, state: "empty" };
  const type = (message.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!/^(application\/(?:json|[^/]+\+json|x-www-form-urlencoded)|text\/(?:plain|html))$/.test(type))
    return { ...result, state: "unsupported" };
  let reader, timer;
  try {
    reader = message.clone().body.getReader();
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("inspection deadline")), timeoutMs);
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
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    result.codes = scanText(new TextDecoder().decode(bytes));
  } catch { result.state = "error"; }
  finally {
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
  async function observe(
    operation,
    request,
    options,
    direction,
    remoteHostname = null,
  ) {
    const route = routeLabel(options.route),
      start = performance.now();
    const operationId = randomUUID();
    const hint = request.headers.get("sec-fetch-site");
    const base = {
      operationId,
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
      ? await inspectSecurity(request, { ...options.inspection, url: false, body: options.inspection.requestBody })
      : undefined;
    // Outbound inspection uses a dedicated Request clone. Release that unused
    // branch before fetch consumes the original, avoiding an unbounded tee buffer.
    if (direction === "outbound" && request instanceof Request && request.body)
      void request.body.cancel().catch(() => {});
    let response,
      thrown,
      failed = false;
    try {
      response = await operation();
    } catch (error) {
      failed = true;
      thrown = error;
    }
    const urlInspection = options.inspection?.url
      ? await inspectSecurity(request, { ...options.inspection, url: true })
      : undefined;
    const responseInspection = options.inspection
      ? await inspectSecurity(response, { ...options.inspection, url: false, body: options.inspection.responseBody })
      : undefined;
    submit({
      ...(requestInspection ? { security: { request: requestInspection, response: responseInspection, ...(urlInspection ? { url: urlInspection } : {}) } } : {}),
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
      return (request, ...args) =>
        observe(() => handler(request, ...args), request, options, "inbound");
    },
    observedFetch(input, init = {}, options) {
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
          request = new Request(input instanceof Request ? input.clone() : input, init);
        } catch {
          // Still report that the body could not be inspected; preserve fetch semantics.
          request.body = true;
        }
      }
      return observe(
        () => fetchImpl(input, init),
        request,
        options,
        "outbound",
        url.hostname.replace(/^\[|\]$/g, ""),
      );
    },
  };
}
