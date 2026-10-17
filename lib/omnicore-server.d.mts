export type SourceAttribution={version:'OC-SOURCE-1';observedIp:string|null;observation:'vercel_edge'|'unavailable';originHostname:string|null;referrerHostname:string|null;listedWebsite:string|null;listedWebsiteSource:'origin'|'referer'|'not_provided';websiteTrust:'caller_declared_unverified';proxyIndicators:('via_header_present'|'forwarded_header_present'|'origin_referrer_disagree')[];proxyAssessment:'possible_intermediary_unverified'|'not_determined';ultimateSource:'not_identified'};
export function observeSource(request:Request,options?:{trustedVercel?:boolean}):SourceAttribution;
export type OperationEffect={action:'create'|'update'|'delete';resource:'records'|'files'|'configuration';outcome:'changed'|'none'|'unknown';count:number|null};
export type OperationEvidence={version:'OC-OPERATION-EVIDENCE-1';definitionId:string;gateReason:'not_evaluated'|'authorized'|'policy_unavailable'|'owner_approval_required'|'invalid_operation_input'|'authorization_unavailable'|'operation_not_authorized'|'identity_expired'|'operation_approval_expired'|'operation_context_required'|'operation_approval_changed';handlerState:'not_started'|'completed'|'failed';effects:OperationEffect[];effectsDropped:number};
export function operationEvidence(value:unknown):OperationEvidence;
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
  /** Owner opt-in: site-reported connection IP and unverified website/proxy hints. */
  sourceAttribution?: boolean;
  /** Trusted server callback only. No body contents, identifiers or free text. */
  operationEvidence?: (request:Request)=>OperationEvidence|undefined;
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
  /** Trusted server configuration only; never derive from request headers/body.
   * Describes a fixed controlled test; confers no authority or protection bypass.
   */
  testProvenance?: { kind: "controlled_test"; source: "server_fixed_fixture"; version: "OC-TEST-PROVENANCE-1"; scenario: "office_hours_content_type"; runId: string };
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
