import type { MonitorOptions } from './omnicore-server.mjs';
export type OperationManifest = { version: 1; id: string; name: string; route: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; allowedOrigins: readonly string[]; maxBodyBytes: number };
export type VerifiedIdentity = { verified: true; subject: string; expiresAt: number };
export type OperationAdapters<T> = {
  verifyIdentity: NonNullable<MonitorOptions['identity']>['verify'];
  /** Must check role and resource permission; verification alone is not authorization. No mutations here. */
  authorize: (context: { request: Request; identity: VerifiedIdentity; input: T; signal: AbortSignal }) => boolean | Promise<boolean>;
  /** Pure validation. Throw to reject. Request bodies stay on the website. */
  validateInput: (input: unknown) => T;
  /** All protected outgoing calls must use this fetch, including SDK global.fetch. */
  handler: (context: { request: Request; identity: VerifiedIdentity; input: T; fetch: typeof fetch }) => Response | Promise<Response>;
  schedule?: MonitorOptions['schedule']; synthetic?: boolean; dataClass?: MonitorOptions['dataClass'];
};
export function operationManifest(value: unknown): Readonly<OperationManifest>;
export function operationManifestHash(value: unknown): string;
export function createProtectedOperations(config: {
  websiteOrigin: string; siteId?: string; key?: string; endpoint?: string;
  fetchImpl?: typeof fetch; onDelivery?: (result: { ok: boolean; status: number; eventId: string }) => void;
}): { sync(): Promise<{ operationId: string; approved: boolean }[]>;
  register<T>(manifest: OperationManifest, adapters: OperationAdapters<T>): (request: Request) => Promise<Response> };
