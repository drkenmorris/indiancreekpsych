import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

test('clinic migrations replay in order on an empty application database', async () => {
  const db = new PGlite({extensions:{btree_gist,pgcrypto}});
  try {
    // Supabase provisions these roles, auth relations and helpers before application migrations.
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema extensions;
      create extension pgcrypto with schema extensions;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz,
        raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
      create table auth.mfa_factors(user_id uuid references auth.users, status text, factor_type text);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as
        $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      grant usage on schema auth,extensions to anon,authenticated,service_role;
    `);

    const migrations = new URL('../supabase/migrations/', import.meta.url);
    const files = readdirSync(migrations).filter(file => file.endsWith('.sql')).sort();
    for (const file of files) {
      try {
        await db.exec(readFileSync(new URL(file, migrations), 'utf8'));
      } catch (error) {
        throw new Error('Migration ' + file + ' failed: ' + error.message, {cause:error});
      }
    }

    const id = '00000000-0000-4000-8000-000000000901';
    await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)", [
      id, 'replay@example.invalid', {full_name:'Fictional Replay',newsletter_consent:true},
    ]);
    const {rows:[schema]} = await db.query(`
      select to_regclass('public.appointments') is not null as appointments,
        to_regclass('private.kiosk_patient_intakes') is not null as kiosk,
        to_regclass('public.emr_bps_intake_reviews') is not null as bps,
        exists(select 1 from information_schema.columns where table_schema='public'
          and table_name='clinical_patients' and column_name='directory_deleted_at') as directory,
        (select account_type from public.profiles where id=$1) as account_type,
        (select subscribed from public.newsletter_subscriptions where user_id=$1) as subscribed
    `, [id]);
    assert.deepEqual(schema, {
      appointments:true, kiosk:true, bps:true, directory:true, account_type:'guest', subscribed:true,
    });
  } finally {
    await db.close();
  }
});
