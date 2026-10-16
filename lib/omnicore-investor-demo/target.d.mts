export function createTarget(config: {
  enabledUntil: number; runSecret?: string; botSecret?: string; witnessSecret?: string;
  approvedOrigin?: string; unapprovedOrigin?: string;
  telemetry: { siteId?: string; key?: string; endpoint: string };
}): (request: Request) => Promise<Response>;
