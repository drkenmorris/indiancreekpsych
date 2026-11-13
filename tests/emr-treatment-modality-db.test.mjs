import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = number => '00000000-0000-4000-8000-' + String(number).padStart(12, '0');
const [admin, therapist, otherStaff, patientAccount, chart, otherChart] = [1, 2, 3, 4, 5, 6].map(id);
const migration = readFileSync(new URL('../supabase/migrations/20261113175618_emr_treatment_modality.sql', import.meta.url), 'utf8');

await db.exec(`
 create role anon;
 create role authenticated;
 create schema auth;
 create schema private;
 create function auth.uid() returns uuid language sql stable as $$ select current_setting('test.user')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('test.aal')) $$;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz);
 create table public.profiles(id uuid primary key,account_type text,full_name text,preferred_name text);
 create table public.clinical_patients(id uuid primary key,demographics jsonb,directory_deleted_at timestamptz);
 alter table public.profiles enable row level security;
 grant select on public.profiles to authenticated;
 grant usage on schema private,auth to authenticated;
 create policy own_profile on public.profiles for select to authenticated using (id=auth.uid());
`);
for (const [user, role] of [[admin,'admin'],[therapist,'staff'],[otherStaff,'staff'],[patientAccount,'patient']]) {
 await db.query('insert into auth.users values($1,now(),null)', [user]);
 await db.query('insert into public.profiles values($1,$2,$3,null)', [user, role, 'Fictional ' + user.slice(-2)]);
}
for (const patient of [chart, otherChart]) {
 await db.query("insert into public.clinical_patients values($1,'{}',null)", [patient]);
}
await db.exec(migration);
await db.exec(readFileSync(new URL('../supabase/migrations/20261113181247_expand_modality_cpt.sql', import.meta.url), 'utf8'));

async function signIn(user, assurance = 'aal2') {
 await db.exec('reset role');
 await db.query("select set_config('test.user',$1,false),set_config('test.aal',$2,false)", [user, assurance]);
 await db.exec('set role authenticated');
}
const sessions = JSON.stringify([
 { code:'90837', count:12, frequency:'weekly', providerId:therapist },
 { code:'90853', count:6, frequency:'every_two_weeks', providerId:admin },
]);
const read = () => db.query('select * from public.emr_treatment_modalities order by patient_id');

await test('administrator enrolls a staff provider and saves two independent modalities on one chart', async () => {
 await signIn(admin);
 const roster = await db.query('select * from emr_modality_directory(true)');
 assert.equal(roster.rows.find(row => row.id === therapist).enrolled, false);
 assert.equal(roster.rows.some(row => row.id === patientAccount), false);
 await db.query('insert into emr_modality_providers values($1)', [therapist]);
 await db.query('insert into emr_treatment_modalities(patient_id,assigned_provider_id,sessions) values($1,$2,$3)', [chart, therapist, sessions]);
 await db.query('insert into emr_treatment_modalities(patient_id,assigned_provider_id) values($1,$2)', [otherChart, admin]);
 assert.deepEqual((await read()).rows[0].sessions, JSON.parse(sessions));
});

await test('assigned therapist can edit session rows but only an administrator controls chart access', async () => {
 await signIn(therapist);
 assert.deepEqual((await read()).rows.map(row => row.patient_id), [chart]);
 assert.deepEqual((await db.query('select id from emr_modality_assigned_charts()')).rows, [{id:chart}]);
 assert.equal((await db.query('select * from emr_modality_directory(true)')).rows.length, 2);
 await assert.rejects(db.query('update emr_treatment_modalities set assigned_provider_id=$1,revision=revision+1', [admin]), /Only an administrator|row-level security/);
 const updated = await db.query('update emr_treatment_modalities set sessions=$1,revision=revision+1 where patient_id=$2 and revision=1 returning revision', [sessions, chart]);
 assert.deepEqual(updated.rows, [{revision:2}]);
 await assert.rejects(db.query('update emr_treatment_modalities set sessions=$1,revision=2', [sessions]), /revision conflict/);
 await assert.rejects(db.query('update emr_treatment_modalities set sessions=$1,revision=3', [
  JSON.stringify([{code:'90837',count:1,frequency:'weekly',providerId:otherStaff}]),
 ]), /inactive session provider/);
});

await test('unassigned staff, patients, and sessions without MFA cannot read or change chart plans', async () => {
 for (const [user, assurance] of [[otherStaff,'aal2'],[patientAccount,'aal2'],[therapist,'aal1']]) {
  await signIn(user, assurance);
  assert.equal((await read()).rows.length, 0);
  assert.equal((await db.query('select * from emr_modality_assigned_charts()')).rows.length, 0);
  assert.equal((await db.query('update emr_treatment_modalities set revision=revision+1 returning revision')).rows.length, 0);
  await assert.rejects(db.query('insert into emr_modality_providers values($1)', [otherStaff]), /row-level security/);
 }
 await signIn(admin);
 await db.query('update emr_treatment_modalities set assigned_provider_id=$1,revision=revision+1 where patient_id=$2', [admin, chart]);
 await signIn(therapist);
 assert.equal((await read()).rows.length, 0);
});

await test('accepts the added base codes and rejects standalone add-on codes', async () => {
 await signIn(admin);
 const added = ['90839','96130','96136','96138','96146'].map(code => ({
  code, count:1, frequency:'weekly', providerId:admin,
 }));
 const saved = await db.query('update emr_treatment_modalities set sessions=$1,revision=revision+1 where patient_id=$2 returning sessions',
  [JSON.stringify(added), chart]);
 assert.deepEqual(saved.rows[0].sessions, added);
 for (const code of ['90785','90840','96131','96137','96139']) {
  await assert.rejects(db.query('update emr_treatment_modalities set sessions=$1,revision=revision+1 where patient_id=$2',
   [JSON.stringify([{...added[0],code}]), chart]), /Invalid session row/);
 }
});

await db.close();
