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
 // Simplified identity/MFA fixture for the legacy production session rule. The
 // combined SQL policies below are executed exactly from their migrations.
 "CREATE FUNCTION private.patient_secure_session() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND ((p.account_type='admin' AND auth.jwt()->>'aal'='aal2') OR (p.account_type='patient' AND auth.jwt()->>'aal' IN ('aal1','aal2')))) $$;",
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
 'CREATE POLICY settings_authenticated_read ON public.appointment_settings FOR SELECT TO authenticated USING(true);',
 'CREATE POLICY rules_authenticated_read ON public.appointment_availability_rules FOR SELECT TO authenticated USING(true);',
 'CREATE POLICY settings_admin ON public.appointment_settings FOR ALL TO authenticated USING(private.current_user_is_admin()) WITH CHECK(private.current_user_is_admin());',
 'CREATE POLICY rules_admin ON public.appointment_availability_rules FOR ALL TO authenticated USING(private.current_user_is_admin()) WITH CHECK(private.current_user_is_admin());',
 'CREATE POLICY blocks_admin ON public.appointment_blocks FOR ALL TO authenticated USING(private.current_user_is_admin()) WITH CHECK(private.current_user_is_admin());',
 // Mirror current production's command-specific grants: no permissive DELETE
 // policy exists, even though the authenticated role has table DELETE privilege.
 // A synthetic FOR ALL admin policy would mask an unintended direct-delete path.
 'CREATE POLICY appointments_admin_insert ON public.appointments FOR INSERT TO authenticated WITH CHECK(private.current_user_is_admin());',
 "CREATE POLICY appointments_patient_insert ON public.appointments FOR INSERT TO authenticated WITH CHECK(patient_id=auth.uid() AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND account_type IN ('patient','admin')));",
 'CREATE POLICY appointments_patient_own ON public.appointments FOR SELECT TO authenticated USING(patient_id=auth.uid() OR private.current_user_is_admin());',
 'CREATE POLICY appointments_patient_edit ON public.appointments FOR UPDATE TO authenticated USING(patient_id=auth.uid() OR private.current_user_is_admin()) WITH CHECK(patient_id=auth.uid() OR private.current_user_is_admin());',
 // Reproduce the legacy permissive ALL policy which could once override the
 // patient-ownership SELECT/UPDATE policy through PostgreSQL OR composition.
 'CREATE POLICY appointments_patient_security ON public.appointments FOR ALL TO authenticated USING(private.current_user_is_admin() OR private.patient_secure_session()) WITH CHECK(private.current_user_is_admin() OR private.patient_secure_session());',
 'GRANT USAGE ON SCHEMA public,private,auth TO authenticated;',
 'GRANT SELECT ON public.profiles TO authenticated;',
 'GRANT SELECT,UPDATE,INSERT ON public.appointment_settings,public.appointment_availability_rules,public.appointment_blocks,public.appointments TO authenticated;',
 // PostgreSQL table privilege is not authorization: RLS must still deny
 // direct DELETE of every appointment, even for an MFA-authenticated admin.
 'GRANT DELETE ON public.appointments TO authenticated;',
 'GRANT EXECUTE ON FUNCTION private.current_user_is_admin(),private.patient_secure_session() TO authenticated;'
].join('\n'));

// Apply BOTH pending protections to the same isolated database. Testing only
// their separate fixtures misses policy interactions in the real scheduler.
await db.exec(readFileSync(new URL('../supabase/migrations/20261115120000_restrict_appointment_patient_row_scope.sql',import.meta.url),'utf8'));
const pendingMigration=readFileSync(new URL('../supabase/migrations/20261111170500_scheduler_admin_mfa_gate.sql',import.meta.url),'utf8');
await db.exec(pendingMigration);
// Exercise the ACTUAL public scheduler RPC's SQL wrapper from the historical
// migration, not merely the private helper. An isolated test that bypasses the
// public entry point can miss an authorization regression in its call chain.
const originalSchedulerMigration=readFileSync(new URL('../supabase/migrations/20260926154213_adjacent_patient_scheduling.sql',import.meta.url),'utf8');
const publicPatientListDefinition=originalSchedulerMigration.match(/CREATE OR REPLACE FUNCTION public\.scheduling_patients\(\)[\s\S]*?\$\$;/i)?.[0];
assert.ok(publicPatientListDefinition,'The historical public scheduling_patients RPC must remain available for wrapper-level authorization regression');
await db.exec(publicPatientListDefinition);
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
await test('pending MFA gate blocks an administrator without AAL2 from all four scheduler tables and the SECURITY DEFINER patient list',async()=>{
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
await test('AAL2 permits an authorized administrator to read and update protected scheduler state and list patients',async()=>{
 await session(admin,'aal2');
 assert.equal(await count('appointment_settings'),1);
 assert.equal(await count('appointment_availability_rules'),1);
 assert.equal(await count('appointment_blocks'),1);
 assert.equal(await count('appointments'),2);
 assert.equal((await db.query('UPDATE public.appointment_settings SET scheduling_enabled=false RETURNING id')).rows.length,1);
 const listed=await db.query('SELECT id FROM private.scheduling_patients_impl()');
 assert.deepEqual(new Set(listed.rows.map(row=>row.id)),new Set([patient,unrelated]));
});
await test('composed restrictive patient-isolation and administrator-MFA policies preserve own-row care while denying cross-patient writes',async()=>{
 await session(patient,'aal1');
 assert.equal(await count('appointments'),1);
 // An AAL1 patient may update their own fictional appointment, but a legacy
 // permissive ALL policy must not allow updates or inserts for another chart.
 assert.equal((await db.query("UPDATE public.appointments SET starts_at='2030-01-03T10:00:00Z' WHERE patient_id=$1 RETURNING id",[unrelated])).rows.length,0);
 assert.equal((await db.query("UPDATE public.appointments SET starts_at='2030-01-03T10:00:00Z' WHERE patient_id=$1 RETURNING id",[patient])).rows.length,1);
 await assert.rejects(db.query("INSERT INTO public.appointments(id,patient_id,starts_at) VALUES ('00000000-0000-4000-8000-000000000103',$1,'2030-01-04T10:00:00Z')",[unrelated]),/row-level security/i);
 assert.equal(await count('appointment_settings'),1);
 assert.equal(await count('appointment_availability_rules'),1);
 await assert.rejects(db.query('SELECT * FROM private.scheduling_patients_impl()'),/MFA required/);
 await session(patient,'aal2');
 assert.equal(await count('appointments'),1);
 await assert.rejects(db.query('SELECT * FROM private.scheduling_patients_impl()'),/MFA required/);
 await session(unrelated,'aal1');
 assert.equal(await count('appointments'),1);
});
await test('missing, unrecognized, or downgraded administrator assurance cannot pass the policy',async()=>{
 for(const assurance of [null,'aal0','aal3','aal1']){
  await session(admin,assurance);
  assert.equal(await count('appointments'),0);
  await assert.rejects(db.query('SELECT * FROM private.scheduling_patients_impl()'),/MFA required/);
 }
 await db.exec('RESET ROLE');
 assert.equal((await db.query('SELECT count(*)::int AS n FROM public.appointments')).rows[0].n,2);
});
// Production contains recurring scheduler occurrences that predate central chart
// linkage. Such rows have NULL patient_id. They must remain visible to an MFA
// administrator for reconciliation, but must never become visible or writable
// to either patient merely because the older FOR ALL scheduler policy existed.
await test('legacy unlinked recurring occurrence remains admin-visible but patient-isolated',async()=>{
 const legacy='00000000-0000-4000-8000-000000000199';
 await db.exec('RESET ROLE');
 await db.query("INSERT INTO public.appointments(id,patient_id,starts_at) VALUES($1,NULL,'2030-01-05T10:00:00Z')",[legacy]);
 try{
  for(const identity of [patient,unrelated]){
   for(const assurance of ['aal1','aal2']){
    await session(identity,assurance);
    assert.equal(await count('appointments'),1,'patient sees only their own linked appointment');
    assert.equal((await db.query('SELECT id FROM public.appointments WHERE id=$1',[legacy])).rows.length,0);
    assert.equal((await db.query("UPDATE public.appointments SET starts_at='2030-01-06T10:00:00Z' WHERE id=$1 RETURNING id",[legacy])).rows.length,0);
   }
  }
  await session(admin,'aal1');
  assert.equal((await db.query('SELECT id FROM public.appointments WHERE id=$1',[legacy])).rows.length,0);
  await session(admin,'aal2');
  assert.equal((await db.query('SELECT id FROM public.appointments WHERE id=$1',[legacy])).rows.length,1);
  assert.equal(await count('appointments'),3);
 }finally{
  // Tear down only the fictional fixture inside this isolated PGlite database.
  await db.exec('RESET ROLE');
  await db.query('DELETE FROM public.appointments WHERE id=$1',[legacy]);
 }
 assert.equal((await db.query('SELECT count(*)::int n FROM public.appointments')).rows[0].n,2);
});
await test('direct DELETE stays denied for patient and administrator despite authenticated table-level DELETE privilege',async()=>{
 const before=await db.query('SELECT id,patient_id,starts_at FROM public.appointments ORDER BY id');
 for(const [identity,assurance] of [[patient,'aal1'],[patient,'aal2'],[unrelated,'aal1'],[admin,'aal1'],[admin,'aal2']]){
  await session(identity,assurance);
  // The scheduler must cancel through its audited workflow instead of
  // physically removing appointments or historical recurring occurrences.
  assert.equal((await db.query('DELETE FROM public.appointments RETURNING id')).rows.length,0);
 }
 await db.exec('RESET ROLE');
 assert.deepEqual((await db.query('SELECT id,patient_id,starts_at FROM public.appointments ORDER BY id')).rows,before.rows);
});
// Regression for real scheduling release gates: an administrator who has not
// completed MFA cannot create even an appointment addressed to their own UUID
// through a permissive INSERT policy, nor rewrite patient ownership through UPDATE.
await test('AAL1 administrator cannot create or relink appointments through a direct table write',async()=>{
 await session(admin,'aal1');
 await assert.rejects(
  db.query("INSERT INTO public.appointments(id,patient_id,starts_at) VALUES($1,$2,'2030-01-08T10:00:00Z')",
   ['00000000-0000-4000-8000-000000000198',admin]),
  /row-level security/i
 );
 assert.equal((await db.query('UPDATE public.appointments SET patient_id=$1 RETURNING id',[admin])).rows.length,0);
 await db.exec('RESET ROLE');
 assert.equal((await db.query('SELECT count(*)::int AS n FROM public.appointments')).rows[0].n,2);
});

// Production contains name-only recurring occurrences. They remain editable
// through the authorized scheduler for an AAL2 administrator, but must be
// impossible for an AAL1 administrator or any patient to alter directly.
await test('only MFA-authenticated administrators can update an unlinked recurring occurrence',async()=>{
 const legacy='00000000-0000-4000-8000-000000000199';
 await db.exec('RESET ROLE');
 await db.query("INSERT INTO public.appointments(id,patient_id,starts_at) VALUES($1,NULL,'2030-01-09T10:00:00Z')",[legacy]);
 try{
  await session(admin,'aal1');
  assert.equal((await db.query("UPDATE public.appointments SET starts_at='2030-01-09T11:00:00Z' WHERE id=$1 RETURNING id",[legacy])).rows.length,0);
  await session(admin,'aal2');
  assert.deepEqual((await db.query("UPDATE public.appointments SET starts_at='2030-01-09T11:00:00Z' WHERE id=$1 RETURNING id",[legacy])).rows.map(row=>row.id),[legacy]);
  for(const identity of [patient,unrelated]){
   await session(identity,'aal2');
   assert.equal((await db.query("UPDATE public.appointments SET starts_at='2030-01-09T12:00:00Z' WHERE id=$1 RETURNING id",[legacy])).rows.length,0);
  }
 }finally{
  await db.exec('RESET ROLE');
  await db.query('DELETE FROM public.appointments WHERE id=$1',[legacy]);
 }
 assert.equal((await db.query('SELECT count(*)::int AS n FROM public.appointments')).rows[0].n,2);
});
await test('public scheduling_patients RPC cannot reveal any patient directory without administrator AAL2',async()=>{
 // This is the SQL entry point used by authenticated scheduler clients.
 // The source is extracted from the versioned historical migration above.
 for(const [identity,assurance] of [
  [admin,null],[admin,'aal1'],[admin,'aal0'],[patient,'aal1'],
  [patient,'aal2'],[unrelated,'aal2'],['','aal2']
 ]){
  await session(identity,assurance);
  await assert.rejects(
   db.query('SELECT id,full_name FROM public.scheduling_patients()'),
   /Administrator sign-in and MFA required/i,
   'The public function must fail closed for non-MFA/non-admin sessions'
  );
 }
 await session(admin,'aal2');
 const authorized=await db.query('SELECT id FROM public.scheduling_patients()');
 assert.deepEqual(new Set(authorized.rows.map(row=>row.id)),new Set([patient,unrelated]));
});
await db.close();
