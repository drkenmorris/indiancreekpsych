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

    // Realistic release gate: exercise a new fictional linked patient and an
    // authenticated clinician's BPS save against the fully replayed schema.
    // PGlite is isolated: no production user, chart, appointment, or mail exists here.
    const adminId='00000000-0000-4000-8000-000000000902';
    const patientId='00000000-0000-4000-8000-000000000903';
    const outsiderId='00000000-0000-4000-8000-000000000904';
    for(const [userId,email] of [
      [adminId,'fictional-admin@example.invalid'],
      [patientId,'fictional-patient@example.invalid'],
      [outsiderId,'fictional-outsider@example.invalid'],
    ]){
      await db.query('insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)',
        [userId,email,{}]);
    }
    // Only the fictional seed setup bypasses the normal promotion process;
    // application code below runs as authenticated with the real RLS/MFA gates.
    await db.exec('alter table public.profiles disable trigger profiles_prevent_role_escalation');
    try {
      await db.query("update public.profiles set account_type='admin' where id=$1",[adminId]);
      await db.query("update public.profiles set account_type='patient' where id=$1",[patientId]);
    } finally {
      await db.exec('alter table public.profiles enable trigger profiles_prevent_role_escalation');
    }
    const {rows:[chart]}=await db.query('select id from public.clinical_patients where account_id=$1',[patientId]);
    assert.ok(chart?.id,'Patient registration must establish the real linked central chart');
    const answers={
      counseling_reason:'Fictional reported concern',
      trauma_history:'Fictional reported history',
      protective_factors:'Fictional family support',
      insurance_member:'PRIVATE TEST POLICY',
      roi_authorize:'No',
      medication_allergy_status:'Medication allergies reported',
      medication_allergy_notes:'PRIVATE TEST ALLERGY',
    };
    await db.query("insert into public.patient_intakes(patient_id,answers,status) values($1,$2,'draft')",[patientId,answers]);
    const {rows:[source]}=await db.query('select version,status,updated_at from public.patient_intakes where patient_id=$1',[patientId]);
    const payload={
      patient_id:chart.id,source_account_id:patientId,source_version:source.version,
      source_status:source.status,source_updated_at:new Date(source.updated_at).toISOString(),
      reviewed:true,clinician_notes:{presenting:'Independent fictional clinician review; unsigned'},
    };
    async function as(id,aal='aal2'){
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
        [id,JSON.stringify({sub:id,aal,role:'authenticated'})]);
      await db.exec('set role authenticated');
    }
    await as(adminId,'aal1');
    await assert.rejects(db.query('select public.save_emr_bps_intake_review($1) as id',[payload]),
      /MFA|Administrator sign-in/,'AAL1 must not save clinician BPS history');
    // The scheduler's own RLS must require MFA for administrators, not merely
    // a protected UI. Existing patient appointment reads remain available.
    const {rows:[unverifiedAdminSettings]}=await db.query(
      'select id from public.appointment_settings where id=true');
    assert.equal(unverifiedAdminSettings.length,0,
      'AAL1 administrator must not read scheduling administration records');
    await as(patientId,'aal1');
    const {rows:[patientSettings]}=await db.query(
      'select id from public.appointment_settings where id=true');
    assert.equal(patientSettings.length,1,
      'Patient availability reads must remain accessible without administrator MFA');
    await as(adminId,'aal2');
    const {rows:[verifiedAdminSettings]}=await db.query(
      'update public.appointment_settings set scheduling_enabled=scheduling_enabled where id=true returning id');
    assert.equal(verifiedAdminSettings.length,1,
      'An AAL2 administrator must retain scheduling administration writes');
    const {rows:[saved]}=await db.query('select public.save_emr_bps_intake_review($1) as id',[payload]);
    assert.ok(saved?.id,'AAL2 admin should be able to save an explicitly reviewed linked intake');
    const {rows:[review]}=await db.query(
      'select source_account_id,source_version,source_status,reviewed,clinical_answers,clinician_notes from public.emr_bps_intake_reviews where id=$1',
      [saved.id]);
    assert.equal(review.source_account_id,patientId);
    assert.equal(review.source_version,source.version);
    assert.equal(review.source_status,'draft');
    assert.equal(review.reviewed,true);
    assert.equal(review.clinical_answers.counseling_reason,'Fictional reported concern');
    assert.equal(review.clinical_answers.trauma_history,'Fictional reported history');
    for(const key of ['insurance_member','roi_authorize','medication_allergy_status','medication_allergy_notes']){
      assert.equal(review.clinical_answers[key],undefined,key+' must never be imported into BPS');
    }
    await assert.rejects(db.query('select public.save_emr_bps_intake_review($1) as id',[payload]),
      /duplicate key/,'One clinician/source version is immutable');
    await as(outsiderId);
    assert.equal((await db.query('select id from public.emr_bps_intake_reviews')).rows.length,0,
      'A different logged-in account must not see clinician review history');
    await as(patientId);
    assert.equal((await db.query('select id from public.emr_bps_intake_reviews')).rows.length,0,
      'The patient cannot read privileged clinician-only snapshots');
    await db.query('update public.patient_intakes set answers=$1 where patient_id=$2',
      [{...answers,counseling_reason:'Updated fictional report'},patientId]);
    await as(adminId);
    await assert.rejects(db.query('select public.save_emr_bps_intake_review($1) as id',[payload]),
      /changed/,'Saving with an outdated source timestamp/version must fail closed');

  } finally {
    await db.close();
  }
});
