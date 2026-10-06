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
  /** A literal route template, never a URL containing user identifiers. */
  route: string;
  scope?: "application" | "middleware" | "outbound";
  inspection?: { requestBody?: boolean; responseBody?: boolean; maxBytes?: number; timeoutMs?: number };
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
  ): (request: Request, ...args: Args) => Promise<R>;
  observedFetch(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    options: MonitorOptions,
  ): Promise<Response>;
};

export function inspectSecurity(message: Request | Response, options?: { body?: boolean; maxBytes?: number; timeoutMs?: number }): Promise<{ detectorVersion: string; state: string; inspectedBytes: number; codes: string[] }>;
