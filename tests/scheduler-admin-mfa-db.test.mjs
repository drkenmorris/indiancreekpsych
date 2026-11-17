import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

// Fictional, isolated PostgreSQL role/JWT simulation. The real pending
// administrator-MFA migration is executed, not a copy of its predicates.
// Never connect this suite to production or mutate patient/scheduler records.
const admin='00000000-0000-4000-8000-000000000001';
const patient='00000000-0000-4000-8000-000000000002';
const unrelated='00000000-0000-4000-8000-000000000003';
const db=new PGlite();
await db.exec([
 'CREATE ROLE authenticated;',
 'CREATE SCHEMA auth;',
 'CREATE SCHEMA private;',
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.user',true),'')::uuid $$;",
 "CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;",
 'CREATE TABLE public.profiles(id uuid PRIMARY KEY,account_type text,full_name text,preferred_name text);',
 "INSERT INTO public.profiles VALUES ('"+admin+"','admin','Fictional Administrator',null),('"+patient+"','patient','Fictional Patient',null),('"+unrelated+"','patient','Fictional Other Patient',null);",
 "CREATE FUNCTION private.current_user_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND account_type='admin') $$;",
 'CREATE TABLE public.appointment_settings(id boolean PRIMARY KEY,scheduling_enabled boolean);',
 'INSERT INTO public.appointment_settings VALUES(true,true);',
 'CREATE TABLE public.appointment_availability_rules(id integer PRIMARY KEY,enabled boolean);',
 'INSERT INTO public.appointment_availability_rules VALUES(1,true);',
 'CREATE TABLE public.appointment_blocks(id integer PRIMARY KEY,label text);',
 "INSERT INTO public.appointment_blocks VALUES(1,'Fictional protected time');",
 'CREATE TABLE public.appointments(id uuid PRIMARY KEY,patient_id uuid,starts_at timestamptz);',
 "INSERT INTO public.appointments VALUES ('00000000-0000-4000-8000-000000000101','"+patient+"','2030-01-01T10:00:00Z'),('00000000-0000-4000-8000-000000000102','"+unrelated+"','2030-01-02T10:00:00Z');",
 'ALTER TABLE public.appointment_settings ENABLE ROW LEVEL SECURITY;',
 'ALTER TABLE public.appointment_availability_rules ENABLE ROW LEVEL SECURITY;',
 'ALTER TABLE public.appointment_blocks ENABLE ROW LEVEL SECURITY;',
 'ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;',
 'CREATE POLICY settings_admin ON public.appointment_settings FOR ALL TO authenticated USING(private.current_user_is_admin()) WITH CHECK(private.current_user_is_admin());',
 'CREATE POLICY rules_admin ON public.appointment_availability_rules FOR ALL TO authenticated USING(private.current_user_is_admin()) WITH CHECK(private.current_user_is_admin());',
 'CREATE POLICY blocks_admin ON public.appointment_blocks FOR ALL TO authenticated USING(private.current_user_is_admin()) WITH CHECK(private.current_user_is_admin());',
 'CREATE POLICY appointments_admin ON public.appointments FOR ALL TO authenticated USING(private.current_user_is_admin()) WITH CHECK(private.current_user_is_admin());',
 'CREATE POLICY appointments_patient_own ON public.appointments FOR SELECT TO authenticated USING(patient_id=auth.uid());',
 'GRANT USAGE ON SCHEMA public,private,auth TO authenticated;',
 'GRANT SELECT ON public.profiles TO authenticated;',
 'GRANT SELECT,UPDATE,INSERT ON public.appointment_settings,public.appointment_availability_rules,public.appointment_blocks,public.appointments TO authenticated;',
 'GRANT EXECUTE ON FUNCTION private.current_user_is_admin() TO authenticated;'
].join('\n'));

const pendingMigration=readFileSync(new URL('../supabase/migrations/20261111170500_scheduler_admin_mfa_gate.sql',import.meta.url),'utf8');
await db.exec(pendingMigration);
async function session(id,aal){
 await db.exec('RESET ROLE');
 await db.query("SELECT set_config('request.user',$1,false),set_config('request.jwt.claims',$2,false)",[
  id,JSON.stringify(aal?{aal}:{})
 ]);
 await db.exec('SET ROLE authenticated');
}
async function count(table){
 const result=await db.query('SELECT count(*)::int AS n FROM public.'+table);
 return result.rows[0].n;
}
test('pending MFA gate blocks an administrator without AAL2 from all four scheduler tables and the SECURITY DEFINER patient list',async()=>{
 await session(admin,'aal1');
 for(const table of ['appointment_settings','appointment_availability_rules','appointment_blocks','appointments']){
  assert.equal(await count(table),0,table+' should not expose scheduler records without admin MFA');
 }
 assert.equal((await db.query('UPDATE public.appointment_settings SET scheduling_enabled=false RETURNING id')).rows.length,0);
 await assert.rejects(
  db.query("INSERT INTO public.appointment_blocks(id,label) VALUES(2,'Never persisted')"),
  /row-level security/i
 );
 await assert.rejects(db.query('SELECT * FROM private.scheduling_patients_impl()'),/MFA required/);
});
test('AAL2 permits an authorized administrator to read and update protected scheduler state and list patients',async()=>{
 await session(admin,'aal2');
 assert.equal(await count('appointment_settings'),1);
 assert.equal(await count('appointment_availability_rules'),1);
 assert.equal(await count('appointment_blocks'),1);
 assert.equal(await count('appointments'),2);
 assert.equal((await db.query('UPDATE public.appointment_settings SET scheduling_enabled=false RETURNING id')).rows.length,1);
 const listed=await db.query('SELECT id FROM private.scheduling_patients_impl()');
 assert.deepEqual(new Set(listed.rows.map(row=>row.id)),new Set([patient,unrelated]));
});
test('patient access still uses patient-specific RLS and cannot elevate through AAL2',async()=>{
 await session(patient,'aal1');
 assert.equal(await count('appointments'),1);
 assert.equal(await count('appointment_settings'),0);
 await assert.rejects(db.query('SELECT * FROM private.scheduling_patients_impl()'),/MFA required/);
 await session(patient,'aal2');
 assert.equal(await count('appointments'),1);
 await assert.rejects(db.query('SELECT * FROM private.scheduling_patients_impl()'),/MFA required/);
 await session(unrelated,'aal1');
 assert.equal(await count('appointments'),1);
});
test('missing, unrecognized, or downgraded administrator assurance cannot pass the policy',async()=>{
 for(const assurance of [null,'aal0','aal3','aal1']){
  await session(admin,assurance);
  assert.equal(await count('appointments'),0);
  await assert.rejects(db.query('SELECT * FROM private.scheduling_patients_impl()'),/MFA required/);
 }
 await db.exec('RESET ROLE');
 assert.equal((await db.query('SELECT count(*)::int AS n FROM public.appointments')).rows[0].n,2);
});
await db.close();
