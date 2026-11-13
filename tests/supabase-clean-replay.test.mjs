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
      // Reproduce the current Supabase auth.users columns needed by clinic migrations.
      // This PGlite fixture is isolated and never reads or mutates hosted accounts.
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, banned_until timestamptz,
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
      full_name:'Fictional Intake Patient',
      date_of_birth:'1990-01-01',
      address:'123 Fictional Street',city:'Example',state:'KS',postal_code:'66000',
      phone:'555-0100',email:'fictional-patient@example.invalid',insurance_coverage:'unsure',
      emergency_contact_name:'Fictional Contact',
      emergency_contact_relationship:'Family',emergency_contact_phone:'555-0101',
      emergency_contact_permission:'Yes',
      functional_impact:'Fictional day-to-day impact',counseling_goals:'Fictional goal',
      prior_mental_health_treatment:'None reported',
      suicidal_thoughts_current:'No',suicidal_plan_current:'No',
      homicidal_thoughts_current:'No',abuse_neglect_current:'No',
      comm_phone_calls:'No',comm_voicemail:'No',comm_text:'No',
      comm_email:'No',comm_portal:'Yes',comm_mail:'No',
      npp_received:'Decline acknowledgment',information_accuracy:'Yes',
      electronic_signature_consent:'Yes',patient_signature:'Fictional Patient',
      patient_signature_date:'2026-11-11',
      legal_packet_version:'2026-11-02-directory-1',
      legal_routing_answers:JSON.stringify({version:'1.0.0',answers:{
        telehealth:'No',electronic:'No',minor:'No',representative:'No',
        release:'No',part2:'No',sud_notes:'No',psychotherapy_notes:'No'}}),
      treatment_consent:'I need to discuss this before consenting',
      financial_review:'I request fee clarification before treatment',
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
    await assert.rejects(db.query('select * from public.scheduling_patients()'),
      /MFA/,'An AAL1 administrator must not obtain patient names through the SECURITY DEFINER scheduler RPC');
    const {rows:unverifiedAdminSettings}=await db.query(
      'select id from public.appointment_settings where id=true');
    assert.equal(unverifiedAdminSettings.length,0,
      'AAL1 administrator must not read scheduling administration records');
    await as(patientId,'aal1');
    const {rows:patientSettings}=await db.query(
      'select id from public.appointment_settings where id=true');
    assert.equal(patientSettings.length,1,
      'Patient availability reads must remain accessible without administrator MFA');
    await as(adminId,'aal2');
    const {rows:patientsForVerifiedAdmin}=await db.query('select id from public.scheduling_patients()');
    assert.ok(patientsForVerifiedAdmin.some(p=>p.id===patientId),
      'An AAL2 administrator must retain assigned scheduling patient directory access');
    const {rows:verifiedAdminSettings}=await db.query(
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

    // Release-parity case: a complete submitted website intake is immutable, and
    // its new version can be explicitly reviewed, saved and read back in the same
    // original central chart. The earlier draft snapshot must stay unchanged.
    await as(patientId);
    const {rows:[submitted]}=await db.query(
      "update public.patient_intakes set status='submitted' where patient_id=$1 returning version,status,updated_at,submitted_at",
      [patientId]);
    assert.equal(submitted.status,'submitted');
    assert.ok(submitted.version>source.version,'Submission must advance the DB-owned source version');
    const mutation=await db.query(
      "update public.patient_intakes set answers='{}'::jsonb where patient_id=$1 returning patient_id",
      [patientId]).catch(error=>{
      assert.match(error.message,/Submitted intake cannot be changed|permission denied|row-level security/i);
      return {rows:[]};
    });
    assert.equal(mutation.rows.length,0,'A submitted intake may not be modified by its patient');

    const submittedPayload={...payload,source_version:submitted.version,
      source_status:submitted.status,source_updated_at:new Date(submitted.updated_at).toISOString()};
    // Simulate a malformed historical submission receipt in the isolated
    // replay database only. The existing patient trigger normally ensures
    // submitted_at is populated; a direct privileged RPC must still reject a
    // migrated/imported submitted row whose receipt is missing. Restore the
    // synthetic row before running the normal submission acceptance.
    assert.ok(submitted.submitted_at,'A genuine submitted fixture must have a DB receipt');
    await db.exec('reset role');
    await db.exec('alter table public.patient_intakes disable trigger user');
    try {
      const {rows:[invalidReceipt]}=await db.query(
        'update public.patient_intakes set submitted_at=null where patient_id=$1 returning submitted_at',[patientId]);
      assert.equal(invalidReceipt.submitted_at,null,'Only the fictional source receipt is corrupted');
    } finally {
      await db.exec('alter table public.patient_intakes enable trigger user');
    }
    await as(adminId,'aal2');
    await assert.rejects(
      db.query('select public.save_emr_bps_intake_review($1) as id',[submittedPayload]),
      /verified intake submission receipt/,
      'A submitted intake without a receipt cannot be clinician-attested via privileged RPC');
    await db.exec('reset role');
    await db.exec('alter table public.patient_intakes disable trigger user');
    try {
      await db.query('update public.patient_intakes set submitted_at=$2 where patient_id=$1',
        [patientId,submitted.submitted_at]);
    } finally {
      await db.exec('alter table public.patient_intakes enable trigger user');
    }
    await as(adminId,'aal1');
    await assert.rejects(db.query('select public.save_emr_bps_intake_review($1) as id',[submittedPayload]),
      /MFA|Administrator sign-in/,'AAL1 must not approve a submitted patient intake');
    await as(adminId,'aal2');
    const {rows:[submittedSave]}=await db.query(
      'select public.save_emr_bps_intake_review($1) as id',[submittedPayload]);
    assert.ok(submittedSave?.id,'Verified clinician can save the immutable submitted source');
    const {rows:[submittedReview]}=await db.query(
      'select source_account_id,source_version,source_status,source_updated_at,reviewed,clinical_answers,clinician_notes from public.emr_bps_intake_reviews where id=$1',
      [submittedSave.id]);
    assert.equal(submittedReview.source_account_id,patientId);
    assert.equal(submittedReview.source_version,submitted.version);
    assert.equal(submittedReview.source_status,'submitted');
    assert.equal(submittedReview.reviewed,true);
    assert.equal(submittedReview.clinical_answers.counseling_reason,'Updated fictional report');
    for(const key of ['insurance_member','roi_authorize','medication_allergy_status','medication_allergy_notes']){
      assert.equal(submittedReview.clinical_answers[key],undefined,key+' is separate from BPS');
    }
    const {rows:[firstReview]}=await db.query(
      'select clinical_answers,source_status from public.emr_bps_intake_reviews where id=$1',[saved.id]);
    assert.equal(firstReview.source_status,'draft');
    assert.equal(firstReview.clinical_answers.counseling_reason,'Fictional reported concern',
      'Later submission must never rewrite the earlier frozen clinical snapshot');
    await assert.rejects(db.query(
      'select public.save_emr_bps_intake_review($1) as id',[submittedPayload]),
      /duplicate key/,'The submitted source version is append-only per clinician and chart');
    await as(outsiderId);
    assert.equal((await db.query('select id from public.emr_bps_intake_reviews')).rows.length,0,
      'Unrelated accounts cannot see either saved review');

    // The patient directory's reversible archive flag must not permit new BPS
    // clinical attestations even when an MFA-verified administrator bypasses the
    // UI and invokes the existing SECURITY DEFINER RPC directly. Exercise the
    // new trigger in this isolated full-migration database, not production.
    await db.exec('reset role');
    const {rows:archived}=await db.query(
      'update public.clinical_patients set directory_deleted_at=now() where id=$1 returning id',
      [chart.id]);
    assert.equal(archived.length,1,'Fictional chart must be archived for this regression');
    await as(adminId,'aal2');
    await assert.rejects(
      db.query('select public.save_emr_bps_intake_review($1) as id',[submittedPayload]),
      /active, explicitly linked central patient chart/,
      'Archived charts must be rejected by the database even for MFA-verified admins');
    await db.exec('reset role');
    const {rows:[historyCount]}=await db.query(
      'select count(*)::integer as total from public.emr_bps_intake_reviews where patient_id=$1',
      [chart.id]);
    assert.equal(historyCount.total,2,'Existing immutable clinician reviews survive directory archiving');
    await db.query('update public.clinical_patients set directory_deleted_at=null where id=$1',[chart.id]);
    await as(adminId,'aal2');
    await assert.rejects(
      db.query('select public.save_emr_bps_intake_review($1) as id',[submittedPayload]),
      /duplicate key/,
      'Restoring an archived chart retains prior unique immutable BPS reviews');

  } finally {
    await db.close();
  }
});
