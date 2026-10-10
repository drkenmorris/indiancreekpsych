import { after } from 'next/server';
import { createProtectedOperations } from '@/lib/omnicore-operations.mjs';
import { verifyExistingSiteIdentity } from '@/lib/omnicore-identity';
import { createClient } from '@/lib/supabase/server';
import { supabaseUrl } from '@/lib/supabase/config';
type Input = { id: string; enabled: boolean };
// This reserved identifier is a connection check, never an availability rule.
const CHECK_ID = '00000000-0000-0000-0000-000000000000';
const CHECK_EXCLUSION_ID = '00000000-0000-0000-0000-000000000001';
let handler: ((request: Request) => Promise<Response>) | undefined;
const reply = (body: unknown, status: number) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: Request) {
  try {
    if (!handler) {
      const operations = createProtectedOperations({ websiteOrigin: 'https://www.indiancreekpsych.com' });
      const database = new URL(supabaseUrl);
      if (database.pathname !== '/' || database.search || database.hash || database.username || database.password)
        return reply({ error: 'Protected scheduling configuration unavailable.' }, 503);
      handler = operations.register<Input>({ version: 1, id: 'office-hours-toggle', name: 'Pause or enable office hours',
        route: '/api/scheduling/office-hours/toggle', method: 'POST', allowedOrigins: [database.origin], maxBodyBytes: 256 }, {
        dataClass: 'operational', verifyIdentity: verifyExistingSiteIdentity,
        authorize: async ({ identity, signal }) => {
          // Permission lookup is preliminary; it cannot perform the business mutation.
          const client = await createClient({ verificationSignal: signal });
          const { data, error } = await client.from('profiles').select('account_type').eq('id', identity.subject).single();
          if (error) throw Error('Permission lookup unavailable');
          return data?.account_type === 'admin';
        },
        validateInput: (input: unknown) => {
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).sort().join() !== 'enabled,id') throw Error('Invalid input');
          const value = input as Input;
          if (typeof value.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.id) || typeof value.enabled !== 'boolean') throw Error('Invalid input');
          return value;
        },
        handler: async ({ input, fetch: operationFetch }) => {
          const client = await createClient({ operationFetch });
          const check = input.id === CHECK_ID;
          let update = client.from('appointment_availability_rules').update({ enabled: input.enabled }).eq('id', input.id);
          // Both equalities apply with AND. No row can match, even if the reserved ID exists.
          if (check) update = update.eq('id', CHECK_EXCLUSION_ID);
          const { data, error } = await update
            .select('id,weekday,start_time,end_time,anchor_time,enabled').abortSignal(AbortSignal.timeout(10000)).maybeSingle();
          if (error) return reply({ error: 'Office hours could not be updated. Check OmniCore approval and refresh before retrying.' }, 503);
          if (check) {
            if (data) return reply({ error: 'Protected connection check could not be confirmed.' }, 503);
            return reply({ check: 'office_hours_protected_operation', matchedRules: 0, changed: false }, 200);
          }
          if (!data) return reply({ error: 'Office-hours rule not found.' }, 404);
          return reply({ rule: data }, 200);
        },
        schedule: delivery => after(async () => { await delivery; }),
      });
    }
    return await handler(request);
  } catch { return reply({ error: 'Protected scheduling unavailable. No update was confirmed.' }, 503); }
}
