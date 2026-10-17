export function createTarget(config: {
  enabledUntil: number; enabledPermanently?: boolean; hostedWitness?: boolean; witnessBypass?: string; runSecret?: string; botSecret?: string; witnessSecret?: string;
  approvedOrigin?: string; unapprovedOrigin?: string;
  telemetry: { siteId?: string; key?: string; endpoint: string };
}): (request: Request) => Promise<Response>;
