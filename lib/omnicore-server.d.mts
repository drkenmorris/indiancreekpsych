export type BoundarySignal = {
  udvId: string;
  acceptableConditionsMet: boolean;
  boundaryCrossingConditionPresent: boolean;
  evidenceConfidence: number;
  severity: 0 | 1 | 2 | 3 | 4;
  /** SHA-256 references to evidence retained on your site; never send the evidence contents. */
  evidenceRefs: string[];
};
export type MonitorOptions = {
  /** Server-configured native rules. Defaults to observe-only. Not a managed WAF ruleset. */
  requestFirewall?: {
    mode?: "observe" | "enforce";
    allowedMethods?: string[];
    allowedContentTypes?: string[];
    /** Content-Length only: not a measured stream limit. */
    maxDeclaredRequestBytes?: number;
    /** Requires explicit inspection; incomplete inspection also matches. */
    denyIndicators?: ("prompt_override" | "script_markup" | "sql_pattern" | "path_traversal" | "shell_pattern")[];
  };
  /** Exact HTTPS origins; enforced calls reject all redirects. No DNS pinning. */
  outboundFirewall?: { mode?: "observe" | "enforce"; allowedOrigins: string[] };
  /** Node.js only. Verify through a trusted server-side identity provider.
   * Never accept a supplied caller ID, user-agent or unverified JWT claim.
   * Identification does not replace resource/operation authorization.
   */
  identity?: {
    /** Optional same-site path, e.g. /login, returned with 401. No queued replay. */
    authenticationPath?: string;
    verify: (request: Request, context: { signal: AbortSignal }) =>
      Promise<{ verified: true; subject: string; expiresAt: number } | null>
      | { verified: true; subject: string; expiresAt: number } | null;
    /** Bounded to 10–5000 ms; default 1000. Timeout fails closed. */
    timeoutMs?: number;
  };
  /** For observedFetch: reject before fetch without an active verified parent.
   * Parent authority expires with its handler, credential expiry, or five minutes.
   */
  requireVerifiedRequest?: boolean;
  /** A literal route template, never a URL containing user identifiers. */
  route: string;
  /** Explicit local enable switch. Owner-approved rules are still required. */
  enforcement?: boolean;
  scope?: "application" | "middleware" | "outbound";
  inspection?: {
    url?: boolean;
    requestBody?: boolean;
    responseBody?: boolean;
    maxBytes?: number;
    timeoutMs?: number;
  };
  /** Optional domain-specific evaluator; no automatic mapping is supplied. */
  assessBoundaries?: (
    metadata: Readonly<Record<string, unknown>>,
  ) => BoundarySignal[] | Promise<BoundarySignal[]>;
  dataClass?: "operational" | "personal" | "health" | "credential" | "unknown";
  synthetic?: boolean;
  /** On Vercel/Next.js, register this promise with waitUntil/after. */
  schedule?: (delivery: Promise<boolean>) => void;
};
export function createOmniCore(config?: {
  siteId?: string;
  key?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  onDelivery?: (result: {
    ok: boolean;
    status: number;
    eventId: string;
  }) => void;
}): {
  withRoute<Args extends unknown[], R extends Response>(
    handler: (request: Request, ...args: Args) => R | Promise<R>,
    options: MonitorOptions,
  ): (request: Request, ...args: Args) => Promise<R | Response>;
  observedFetch(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    options: MonitorOptions,
  ): Promise<Response>;
};

export function inspectSecurity(
  message: Request | Response,
  options?: {
    url?: boolean;
    body?: boolean;
    maxBytes?: number;
    timeoutMs?: number;
  },
): Promise<{
  detectorVersion: string;
  state: string;
  inspectedBytes: number;
  codes: string[];
}>;
