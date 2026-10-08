import { createClient } from "./supabase/server";

// Identification only. The route must retain resource/role/CSRF authorization.
export async function verifyExistingSiteIdentity(_request: Request, { signal }: { signal: AbortSignal }) {
  const client = await createClient({ verificationSignal: signal });
  // getClaims validates the token cryptographically, including expiry.
  const claims = await client.auth.getClaims();
  if (claims.error && (!claims.error.status || claims.error.status >= 500)) throw new Error("Identity provider unavailable");
  if (claims.error || !claims.data?.claims) return null;
  const { sub, exp } = claims.data.claims;
  if (typeof sub !== "string" || typeof exp !== "number" || exp * 1000 <= Date.now()) return null;
  // Also consult Auth for current user state; never trust user-editable metadata.
  const user = await client.auth.getUser();
  if (user.error && (!user.error.status || user.error.status >= 500)) throw new Error("Identity provider unavailable");
  if (user.error || !user.data.user || user.data.user.id !== sub || user.data.user.is_anonymous) return null;
  if (signal.aborted) throw new Error("Verification cancelled");
  return { verified: true as const, subject: sub, expiresAt: exp * 1000 };
}
