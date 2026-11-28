// Preview-only isolation guard: never allow an unconfigured Vercel preview
// to use the application's historical production Supabase defaults.
// Production configuration and local disposable CI are not changed.
import assert from 'node:assert/strict';
const productionHost = 'ufyopuunkprfpcprfngk.supabase.co';
function assertPreviewIsolation(env) {
  if (env.VERCEL_ENV !== 'preview') return;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const raw = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw?.trim() || !key?.trim()) throw new Error('Preview requires explicit Supabase URL and publishable key.');
  let url;
  try { url = new URL(raw); } catch { throw new Error('Preview Supabase URL is invalid.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      url.pathname !== '/' || url.search || url.hash ||
      !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname) || url.hostname === productionHost) {
    throw new Error('Preview must target a distinct hosted Supabase project.');
  }
}
// Pure checks; never contact a database or expose a key in build output.
const valid = { VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: 'https://isolatedfixture.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fictional-test-key' };
assert.doesNotThrow(() => assertPreviewIsolation(valid));
assert.throws(() => assertPreviewIsolation({ ...valid, NEXT_PUBLIC_SUPABASE_URL: '' }));
assert.throws(() => assertPreviewIsolation({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' }));
assert.throws(() => assertPreviewIsolation({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'https://' + productionHost }));
assert.throws(() => assertPreviewIsolation({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'https://example.com' }));
assert.throws(() => assertPreviewIsolation({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'http://isolatedfixture.supabase.co' }));
assert.throws(() => assertPreviewIsolation({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'https://isolatedfixture.supabase.co/other' }));
assert.doesNotThrow(() => assertPreviewIsolation({ VERCEL_ENV: 'production' }));
assert.doesNotThrow(() => assertPreviewIsolation({}));
assertPreviewIsolation(process.env);
console.log('Preview isolation guard: nine configuration checks passed.');
