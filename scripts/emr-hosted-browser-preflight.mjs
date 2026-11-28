// Hosted authentication preflight; optional fictional review write is separately gated.
// Never run against production,
// the obsolete validation branch, or a project belonging to another app.
// Optional original-form writes require a fresh isolated fictional chart.
// Optional fresh patient intake submission, original BPS writes, isolated recurring booking and existing fictional CSEQ recipient/report.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const excluded = new Set(['ufyopuunkprfpcprfngk','aibusnrivvutadigoisb','xqzhxzhslnysvoqlrrmf','tfhzuuwpesvqbcdybuvf','zuvquwulmijsnicqwzyd','arxwvvjrmluotskzmlgi']);
function config(e) {
  const origin = new URL(e.EMR_ACCEPTANCE_ORIGIN);
  assert.match(origin.hostname,/^indiancreekpsych-[a-z0-9]+-ken-morris-projects\.vercel\.app$/);
  assert.equal(origin.href,origin.origin+'/');
  assert.equal(origin.protocol,'https:');
  assert.equal(origin.port,'');
  const database = new URL(e.EMR_ACCEPTANCE_SUPABASE_URL);
  assert.equal(database.href,database.origin+'/');
  assert.equal(database.protocol,'https:');
  assert.equal(database.port,'');
  const ref = /^([a-z0-9]{20})\.supabase\.co$/.exec(database.hostname)?.[1];
  assert.ok(ref && !excluded.has(ref),'Dedicated new acceptance database required');
  assert.equal(ref,e.EMR_ACCEPTANCE_APPROVED_PROJECT_REF);
  assert.match(e.EMR_ACCEPTANCE_DEPLOYMENT_ID,/^dpl_[a-zA-Z0-9]+$/);
  assert.match(e.EMR_ACCEPTANCE_CLINICIAN_EMAIL,/^emr-acceptance-[a-z0-9-]+@example\.com$/);
  assert.ok(e.EMR_ACCEPTANCE_CLINICIAN_PASSWORD && e.EMR_ACCEPTANCE_TOTP_SECRET);
  assert.ok(/^[A-Z2-7]+=*$/i.test(e.EMR_ACCEPTANCE_TOTP_SECRET),'Invalid fixture TOTP secret');
  assert.ok(/^[a-f0-9]{40}$/.test(e.EMR_ACCEPTANCE_EXPECTED_SHA),'Expected immutable Git SHA required');
  assert.match(e.EMR_ACCEPTANCE_CHART_ID,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  assert.match(e.EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION,/^[1-9][0-9]*$/);
  assert.ok(Number.isSafeInteger(Number(e.EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION)),'Expected fixture source revision must be a safe integer');
  assert.ok(typeof e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION==='string' && e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION.length<=128 && e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION.trim()===e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION && e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION.length>0,'Exact fixture packet version required');
  assert.match(e.EMR_ACCEPTANCE_EXPECTED_REVIEWED,/^(true|false)$/,'Explicit fixture review state required');
  return {origin:origin.origin,database:database.origin};
}
// A 200 alone is insufficient: verify the exact fixture and submission receipt
// without retaining or logging clinical data. Use the metadata-only endpoint.
function verifySubmittedSummary(receipt, expectedChart, expectedVersion, expectedPacket, expectedReviewed) {
  assert.ok(receipt && typeof receipt==='object' && !Array.isArray(receipt),'Invalid summary envelope');
  assert.deepEqual(Object.keys(receipt).sort(),['currentVersionReviewed','patientId','source']);
  assert.equal(receipt.patientId,expectedChart.toLowerCase(),'Unexpected fixture chart');
  assert.ok(receipt.source && typeof receipt.source==='object' && !Array.isArray(receipt.source),'Source receipt missing');
  assert.deepEqual(Object.keys(receipt.source).sort(),['questionnairePacketVersion','status','submittedAt','updatedAt','version']);
  assert.equal(receipt.source.status,'submitted','Fixture must have a submitted intake');
  assert.equal(receipt.source.version,expectedVersion,'Unexpected intake revision');
  assert.ok(typeof receipt.source.submittedAt==='string' && typeof receipt.source.updatedAt==='string','Missing submission timestamps');
  const submitted=Date.parse(receipt.source.submittedAt), updated=Date.parse(receipt.source.updatedAt);
  assert.ok(Number.isFinite(submitted) && Number.isFinite(updated) && updated<=submitted,'Invalid submission chronology');
  assert.equal(receipt.source.questionnairePacketVersion,expectedPacket,'Unexpected questionnaire packet version');
  assert.equal(receipt.currentVersionReviewed,expectedReviewed,'Unexpected clinician review state');
}
const originalForms = new Map([
  ['symptoms','biopsychosocial_symptoms'],
  ['treatment_history','biopsychosocial_treatment_history'],
  ['medications','biopsychosocial_medication'],
  ['family_origin','biopsychosocial_family_origin'],
  ['medical_substance','biopsychosocial_medical_substance'],
  ['developmental_personal','biopsychosocial_developmental_personal'],
  ['trauma_history','biopsychosocial_trauma_history']
]);
function verifyOriginalFormLinks(hrefs,origin,chart) {
  assert.equal(hrefs.length,originalForms.size,'Exactly seven original form links required');
  const seen=new Set();
  return hrefs.map(href=>{
    assert.ok(typeof href==='string' && href.length>0,'Missing original form URL');
    const url=new URL(href,origin);
    assert.ok(url.origin===origin && url.pathname==='/emr/workspace' && !url.username && !url.password && !url.hash,'Unexpected original form destination');
    assert.deepEqual([...url.searchParams.keys()].sort(),['bps_page','module','patient','section']);
    assert.equal(url.searchParams.get('patient'),chart.toLowerCase(),'Original form targets incorrect chart');
    assert.equal(url.searchParams.get('module'),'assessment');
    assert.equal(url.searchParams.get('section'),'assessment:biopsychosocial');
    const key=url.searchParams.get('bps_page');
    assert.ok(originalForms.has(key)&&!seen.has(key),'Unexpected or repeated original form page');
    seen.add(key);
    return {url:url.href,key,action:originalForms.get(key)};
  });
}
// The optional write stage is deliberately disabled by default. The operator must
// independently verify the exact deployment's server-side database configuration,
// schema and fixture ownership before supplying the approval string. A public URL
// or READY deployment alone is not isolation evidence.
function verifyIsolationApproval(e) {
  assert.equal(e.EMR_ACCEPTANCE_ISOLATION_APPROVAL,
    e.EMR_ACCEPTANCE_DEPLOYMENT_ID+':'+e.EMR_ACCEPTANCE_EXPECTED_SHA+':'+e.EMR_ACCEPTANCE_APPROVED_PROJECT_REF,
    'Independent server/database isolation approval for the exact revision required');
}
// Optional patient-role denial test uses a separately authenticated fictional
// patient in a new browser context, never an anonymous denial or admin cookie.
function patientIsolationConfig(e) {
  if(e.EMR_ACCEPTANCE_PATIENT_ISOLATION===undefined||e.EMR_ACCEPTANCE_PATIENT_ISOLATION==='false') return null;
  assert.equal(e.EMR_ACCEPTANCE_PATIENT_ISOLATION,'true');
  verifyIsolationApproval(e);
  assert.match(e.EMR_ACCEPTANCE_PATIENT_EMAIL,/^emr-acceptance-patient-[a-z0-9-]+@example\.com$/);
  assert.notEqual(e.EMR_ACCEPTANCE_PATIENT_EMAIL,e.EMR_ACCEPTANCE_CLINICIAN_EMAIL,'Patient and clinician must be separate fixtures');
  assert.ok(typeof e.EMR_ACCEPTANCE_PATIENT_PASSWORD==='string'&&e.EMR_ACCEPTANCE_PATIENT_PASSWORD.length>0,'Fictional patient password required');
  const account=e.EMR_ACCEPTANCE_PATIENT_ACCOUNT_ID, source=e.EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID;
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  assert.match(account,uuid,'Exact second fictional Auth account required');
  assert.match(source,uuid,'Exact linked source Auth account required');
  assert.notEqual(account,source,'Patient role fixture must be different from linked intake owner');
  assert.notEqual(account,e.EMR_ACCEPTANCE_CHART_ID.toLowerCase(),'Auth account must not be the central chart ID');
  assert.notEqual(source,e.EMR_ACCEPTANCE_CHART_ID.toLowerCase(),'Linked source account must not be the central chart ID');
  return {email:e.EMR_ACCEPTANCE_PATIENT_EMAIL,password:e.EMR_ACCEPTANCE_PATIENT_PASSWORD,account,source};
}
function verifyPatientAuth(user,fixture) {
  assert.equal(user?.id,fixture.account,'Authenticated patient must match the exact separate fictional account');
  assert.equal(user?.email,fixture.email,'Authenticated patient email mismatch');
}
function verifyIsolationTarget(target,fixture,chart,version) {
  assert.equal(target?.linked,true,'Isolation target must be a linked chart');
  assert.equal(target.patientId,chart,'Isolation target chart identity mismatch');
  assert.equal(target.source?.accountId,fixture.source,'RLS target must be the actual linked intake owner');
  assert.equal(target.source?.status,'submitted','Isolation target must be an existing submitted intake');
  assert.equal(target.source?.version,version,'Isolation target version mismatch');
}
function verifyPatientRows(own,foreign,fixture) {
  assert.deepEqual(own,[{patient_id:fixture.account}],'Positive own-intake row required for meaningful RLS test');
  assert.deepEqual(foreign,[],'Another patient intake must be filtered by RLS');
}
function reviewWriteConfig(e) {
  if(e.EMR_ACCEPTANCE_REVIEW_WRITE===undefined||e.EMR_ACCEPTANCE_REVIEW_WRITE==='false') return null;
  assert.equal(e.EMR_ACCEPTANCE_REVIEW_WRITE,'true');
  assert.equal(e.EMR_ACCEPTANCE_EXPECTED_REVIEWED,'false','A fresh unreviewed fictional source is required');
  verifyIsolationApproval(e);
  assert.match(e.EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.notEqual(e.EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID,e.EMR_ACCEPTANCE_CHART_ID.toLowerCase());
  assert.match(e.EMR_ACCEPTANCE_FIXTURE_MARKER,/^FICTIONAL-EMR-ACCEPTANCE-[a-f0-9]{32}$/);
  return {account:e.EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID,marker:e.EMR_ACCEPTANCE_FIXTURE_MARKER};
}
function originalWriteConfig(e,reviewFixture) {
  if(e.EMR_ACCEPTANCE_ORIGINAL_WRITE===undefined||e.EMR_ACCEPTANCE_ORIGINAL_WRITE==='false') return false;
  assert.equal(e.EMR_ACCEPTANCE_ORIGINAL_WRITE,'true');
  assert.ok(reviewFixture,'Original form writes require the independently approved fictional review stage');
  return true;
}
function verifyOriginalChart(result,chart,expectedRevision,requireEmpty=false) {
  assert.equal(result?.value?.patient?.id,chart,'Original form chart identity mismatch');
  assert.ok(Number.isSafeInteger(result.revision)&&result.revision>=0,'Invalid original chart revision');
  assert.ok(Array.isArray(result.value.records),'Original chart records unavailable');
  assert.ok(result.value.records.every(r=>r&&typeof r.id==='string'&&r.id.length>0),'Invalid original record identity');
  assert.equal(new Set(result.value.records.map(r=>r.id)).size,result.value.records.length,'Duplicate original record identity');
  if(expectedRevision!==undefined)assert.equal(result.revision,expectedRevision,'Unexpected concurrent original chart revision');
  if(requireEmpty)assert.deepEqual(result.value.records,[],'Fresh fictional original chart must have no existing workflow records');
}
function verifyFreshReviewFixture(data,e,fixture) {
  assert.ok(data && data.linked===true && data.patientId===e.EMR_ACCEPTANCE_CHART_ID.toLowerCase(),'Incorrect linked chart');
  assert.equal(data.source?.accountId,fixture.account,'Incorrect fictional source account');
  assert.equal(data.source.status,'submitted');
  assert.equal(data.source.version,Number(e.EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION));
  assert.equal(data.source.questionnairePacketVersion,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION);
  assert.ok(Array.isArray(data.sections)&&data.sections.length===21,'Incomplete source audit');
  assert.deepEqual(data.unmappedKeys,[]);
  assert.deepEqual(data.reviews,[],'Fresh fictional chart must not already have review history');
  // Require the exact approved clinical field before any mutation; a marker
  // in an unrelated field, a substring or a protected-source placeholder
  // must not authorize a clinician write to this chart.
  assert.ok(data.sections.every(section=>section && typeof section.title==='string' && section.title.length>0 && Array.isArray(section.fields)),'Malformed source section');
  assert.equal(new Set(data.sections.map(section=>section.title)).size,21,'Duplicate source section');
  const matches=data.sections.flatMap(section=>section.fields.filter(field=>field?.key==='counseling_reason').map(field=>({section,field})));
  assert.equal(matches.length,1,'Exactly one counseling reason source field required');
  const {section,field}=matches[0];
  assert.equal(section.disposition,'clinical','Fictional marker must be in clinical source');
  assert.equal(field.sourceOnly,false,'Fictional marker cannot be a protected-source placeholder');
  assert.equal(field.reported,true,'Fictional marker must be a reported answer');
  assert.equal(field.value,fixture.marker,'Exact fictional counseling reason required');
}
function totp(secret,now=Date.now()) {
  let bits=0,value=0;const bytes=[];
  for(const char of secret.toUpperCase().replace(/=+$/,'')) {
    value=(value<<5)|'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);bits+=5;
    if(bits>=8){bits-=8;bytes.push((value>>bits)&255);}
  }
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(now/30000)));
  const digest=createHmac('sha1',Buffer.from(bytes)).update(counter).digest();
  return String((digest.readUInt32BE(digest[digest.length-1]&15)&0x7fffffff)%1000000).padStart(6,'0');
}
// Opt-in fresh source submission, never a seeded submitted intake.
function sourceSubmissionConfig(e,reviewFixture,patientFixture) {
  if(e.EMR_ACCEPTANCE_SOURCE_SUBMIT===undefined||e.EMR_ACCEPTANCE_SOURCE_SUBMIT==='false')return null;
  assert.equal(e.EMR_ACCEPTANCE_SOURCE_SUBMIT,'true');
  verifyIsolationApproval(e);
  assert.ok(reviewFixture,'Browser submission requires the separately approved fictional review fixture');
  assert.equal(e.EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION,'22','21 page saves plus final submission expected');
  const email=e.EMR_ACCEPTANCE_SOURCE_EMAIL,password=e.EMR_ACCEPTANCE_SOURCE_PASSWORD;
  assert.match(email,/^emr-acceptance-source-[a-z0-9-]+@example\.com$/);
  assert.notEqual(email,e.EMR_ACCEPTANCE_CLINICIAN_EMAIL);
  assert.notEqual(email,patientFixture?.email);
  assert.notEqual(reviewFixture.account,patientFixture?.account);
  assert.ok(typeof password==='string'&&password.length>0,'Fictional source password required');
  return {...reviewFixture,email,password};
}
// All mutations through actual website controls; readback uses the patient JWT.
async function submitHostedSource({patientPage,fixture,readPatient,verifyPage,verifyLinkedDraft}) {
  const fictionalName='Fictional Acceptance '+fixture.marker.slice(-12);
  const today=new Date().toISOString().slice(0,10);
  await verifyPage();
  const tabs=patientPage.getByRole('tablist',{name:'Intake sections'});
  await tabs.waitFor({state:'visible'});
  assert.equal(await tabs.getByRole('tab').count(),21);
  const patientForm=patientPage.locator('.intakeWizard');
  const savePage=patientPage.getByRole('button',{name:'Save page',exact:true});
  assert.equal(await readPatient(),null,'Second fictional patient has no pre-seeded intake');
  assert.ok(await savePage.isDisabled(),'Empty demographics cannot be saved');
  const fill=async(label,value)=>patientForm.getByLabel(label,{exact:true}).fill(value);
  // Native select options are descendants of the wrapping label. Match the
  // label's question text, then the single actual select (strict locator).
  const selectField=label=>patientForm.locator('fieldset.intakeSectionCard label').filter({hasText:label}).locator('select');
  const select=async(label,value)=>selectField(label).selectOption(value);
  const tab=number=>tabs.getByRole('tab',{name:String(number),exact:true});
  const pickRemaining=async()=>{
    for(const field of await patientForm.locator('fieldset.intakeSectionCard select').all()){
      if(!(await field.inputValue())&&await field.isEnabled()){
        const options=await field.locator('option').evaluateAll(items=>items.filter(o=>o.value&&!o.disabled).map(o=>o.value));
        assert.ok(options.length>0,'Rendered select must offer an answer');
        await field.selectOption(options[0]);
      }
    }
  };
  const saveAndReopen=async(number,expected)=>{
    const before=await readPatient();
    await verifyPage();
    await savePage.click({timeout:15000});
    await patientPage.getByRole('status').filter({hasText:'Draft saved securely.'}).waitFor();
    const after=await readPatient();
    assert.equal(after.patient_id,fixture.account);
    assert.equal(after.status,'draft');
    assert.equal(after.submitted_at,null);
    assert.equal(after.version,(before?.version??0)+1);
    assert.deepEqual([...after.completed_pages].sort((x,y)=>x-y),Array.from({length:number},(_,i)=>i+1));
    for(const [key,value] of Object.entries(expected))assert.equal(after.answers[key],value);
    for(const [key,value] of Object.entries(before?.answers??{}))assert.equal(after.answers[key],value,'Previously saved page answer preserved: '+key);
    await patientPage.reload();
    await tabs.waitFor({state:'visible'});
    await verifyPage();
    await tab(number===1?2:1).click();
    assert.equal(await tab(number).getAttribute('data-page-status'),'saved');
    await tab(number).click();
    console.log('Patient website page saved, independently read back and reopened: '+number);
  };
  await fill('Full legal name *',fictionalName);
  await fill('Date of birth *','1992-01-01');
  await fill('Street address *','2 Example St');
  await fill('City *','Example');
  await fill('State *','KS');
  await fill('ZIP code *','66000');
  await fill('Phone number *','5550102');
  await fill('Contact email *',fixture.email);
  await pickRemaining();
  await saveAndReopen(1,{full_name:fictionalName,email:fixture.email});
  await verifyLinkedDraft();
  assert.equal(await patientForm.getByLabel('Full legal name *',{exact:true}).inputValue(),fictionalName);
  await tab(2).click();
  await fill('Emergency contact name *','Fictional Browser Contact');
  await fill('Relationship to you *','Friend');
  await fill('Emergency contact phone *','5550103');
  await select('May we contact this person in an emergency? *','Yes');
  for(const key of ['comm_phone_calls','comm_voicemail','comm_text','comm_email','comm_portal','comm_mail']){
    await patientForm.locator('select[name="'+key+'"]').selectOption(key==='comm_portal'?'Yes':'No');
  }
  for(const checkbox of await patientForm.getByRole('checkbox',{name:/^Not applicable —/}).all())await checkbox.check();
  await saveAndReopen(2,{emergency_contact_name:'Fictional Browser Contact',comm_portal:'Yes',comm_email:'No'});
  assert.equal(await patientForm.getByLabel('Emergency contact name *',{exact:true}).inputValue(),'Fictional Browser Contact');
  await tab(3).click();
  await select('How will you pay for care? *','self-pay');
  await fill('Other insurance, coordination-of-benefits, or billing information','FICTIONAL-BROWSER-INSURANCE');
  await saveAndReopen(3,{insurance_coverage:'self-pay',insurance_notes:'FICTIONAL-BROWSER-INSURANCE'});
  assert.equal(await selectField('How will you pay for care? *').inputValue(),'self-pay');
  await tab(4).click();
  await fill('What brings you to counseling now? *',fixture.marker);
  await fill('What would you like to achieve through counseling? *','Fictional browser goal');
  await select('Overall, how much do these concerns interfere with daily life? *','Moderately');
  await pickRemaining();
  await saveAndReopen(4,{counseling_reason:fixture.marker,counseling_goals:'Fictional browser goal',functional_impact:'Moderately'});
  const reopenedNarrative=label=>patientForm.locator('.intakeNarrative label').filter({hasText:label}).locator('textarea');
  assert.equal(await tab(4).getAttribute('aria-selected'),'true');
  assert.equal(await reopenedNarrative('What brings you to counseling now? *').inputValue(),fixture.marker);
  assert.equal(await reopenedNarrative('What would you like to achieve through counseling? *').inputValue(),'Fictional browser goal');
  console.log('Patient browser page 4 narrative values reopened.');
  await tab(5).click();
  await patientForm.getByRole('checkbox',{name:'I have no treatment entries to report',exact:true}).check();
  await select('Have you received counseling, psychotherapy, psychiatric care, or psychological services before? *','No');
  for(const checkbox of await patientForm.getByRole('checkbox',{name:/^Not applicable —/}).all())await checkbox.check();
  await saveAndReopen(5,{treatment_history_entries:'[]',prior_mental_health_treatment:'No',prior_therapists:'Not applicable'});
  assert.ok(await patientForm.getByRole('checkbox',{name:'I have no treatment entries to report',exact:true}).isChecked());
  await tab(6).click();
  const patientMedicationLookup=patientForm.getByRole('button',{name:'Search medication catalog',exact:true});
  const patientMedication=patientForm.getByLabel('Medication',{exact:true});
  const patientMedicationAmount=patientForm.getByLabel('Amount taken each time',{exact:true});
  assert.equal(await patientMedicationLookup.getAttribute('aria-expanded'),'false');
  await patientMedicationLookup.click();
  await patientForm.getByText('Enter at least two letters of a brand or generic name to search.',{exact:true}).waitFor();
  assert.equal(await patientMedicationLookup.getAttribute('aria-expanded'),'true');
  await patientMedicationLookup.click();
  assert.equal(await patientMedicationLookup.getAttribute('aria-expanded'),'false');
  await patientMedicationAmount.fill('Fictional amount');
  await patientMedication.fill('Zoloft');
  await patientForm.getByRole('button',{name:'sertraline 100 MG Oral Tablet [Zoloft]',exact:true}).waitFor();
  await patientForm.getByRole('button',{name:'sertraline 50 MG Oral Tablet [Zoloft]',exact:true}).click();
  assert.equal(await patientMedication.inputValue(),'sertraline 50 MG Oral Tablet [Zoloft]');
  assert.equal(await patientMedicationAmount.inputValue(),'Fictional amount');
  assert.equal(await patientMedicationLookup.getAttribute('aria-expanded'),'false');
  // A populated medication must not coexist with the explicit no-medications state.
  // Clearing text alone leaves the entry's Current status intact. Use the real
  // removal control and its confirmation rather than bypassing the guard.
  const noCurrentMedications=patientForm.getByRole('checkbox',{name:'I do not currently take any medications',exact:true});
  assert.ok(await noCurrentMedications.isDisabled(),'Medication entry and explicit absence are mutually exclusive');
  const removeMedication=patientForm.getByRole('button',{name:'Remove medication 1',exact:true});
  const confirmRemoval=patientPage.waitForEvent('dialog').then(async dialog=>{
    const message=dialog.message();
    await dialog.accept();
    return message;
  });
  await removeMedication.click();
  assert.equal(await confirmRemoval,'Remove this medication from the draft? Save the draft to keep this change.');
  assert.ok(await noCurrentMedications.isEnabled());
  assert.ok(await noCurrentMedications.isChecked(),'Removing the final entry represents an explicit empty list');
  await noCurrentMedications.uncheck();
  await noCurrentMedications.check();
  console.log('Patient intake medication catalog: visible lookup, strengths, unchanged reported amount and explicit no-medications guard verified.');
  await select('Medication Allergy Status','Medication allergies reported');
  for(const checkbox of await patientForm.getByRole('checkbox',{name:/^Not applicable —/}).all())await checkbox.check();
  await reopenedNarrative('Medication Allergies / Reactions').fill('Fictional medication allergy boundary');
  await saveAndReopen(6,{medication_entries:'[]',medication_allergy_status:'Medication allergies reported',medication_allergy_notes:'Fictional medication allergy boundary'});
  assert.equal(await reopenedNarrative('Medication Allergies / Reactions').inputValue(),'Fictional medication allergy boundary');
  assert.ok(await patientForm.getByRole('checkbox',{name:'I do not currently take any medications',exact:true}).isChecked());
  // Keep the early submission guard, then continue through the actual
  // clinical, safety, routing and legal controls. No fixture writes.
  await tab(14).click();
  await patientPage.getByRole('button',{name:'Review and submit'}).click();
  await patientPage.getByRole('alert').filter({hasText:'Complete and save page 7 before submitting.'}).waitFor();
  assert.equal(await tab(7).getAttribute('aria-selected'),'true');
  assert.equal((await readPatient()).status,'draft');
  const {readFile}=await import('node:fs/promises');
  const medicalDefinition=JSON.parse(await readFile('lib/patient/medical-substance-definition.json','utf8'));
  const medicalExpected={definition_version:medicalDefinition.version,selections:{},notes:{}};
  for(const group of medicalDefinition.groups){
    const choice=group.key==='medical_conditions'?'High blood pressure':'None reported';
    assert.ok(group.choices.includes(choice));
    const control=patientForm.locator('input[name="medical_history_'+group.key+'"][value="'+choice+'"]');
    await control.check();
    medicalExpected.selections[group.key]=[choice];
  }
  await patientForm.getByText('Details / Dates, amounts, care contacts and other information',{exact:true}).click();
  for(const [key,label] of Object.entries(medicalDefinition.notes)){
    if(['primary_care_provider','pcp_phone'].includes(key)){medicalExpected.notes[key]='';continue;}
    if(key==='other_allergies'){
      medicalExpected.notes[key]='Fictional non-medication allergy boundary';
      await reopenedNarrative(label).fill(medicalExpected.notes[key]);
    }else{
      medicalExpected.notes[key]='Not applicable';
      await patientForm.getByRole('checkbox',{name:'Not applicable — '+label,exact:true}).check();
    }
  }
  await saveAndReopen(7,{medical_substance_history:JSON.stringify(medicalExpected)});
  assert.ok(await patientForm.locator('input[name="medical_history_medical_conditions"][value="High blood pressure"]').isChecked());
  await patientForm.getByText('Details / Dates, amounts, care contacts and other information',{exact:true}).click();
  assert.equal(await reopenedNarrative(medicalDefinition.notes.other_allergies).inputValue(),medicalExpected.notes.other_allergies);
  assert.equal((await readPatient()).answers.medication_allergy_notes,'Fictional medication allergy boundary');
  await tab(8).click();
  const riskKeys=['suicidal_thoughts_current','suicidal_plan_current','homicidal_thoughts_current','abuse_neglect_current','weapons_access'];
  for(const key of riskKeys)await patientForm.locator('input[name="'+key+'_no"]').check();
  await patientForm.getByRole('checkbox',{name:/^Not applicable — If yes to any safety question/}).check();
  await reopenedNarrative('People, responsibilities, beliefs, or supports that help keep you safe').fill('Fictional protective support');
  await saveAndReopen(8,{...Object.fromEntries(riskKeys.map(key=>[key,'No'])),violence_risk_details:'Not applicable',protective_factors:'Fictional protective support'});
  for(const key of riskKeys)assert.ok(await patientForm.locator('input[name="'+key+'_no"]').isChecked());
  assert.equal(await reopenedNarrative('People, responsibilities, beliefs, or supports that help keep you safe').inputValue(),'Fictional protective support');
  await tab(9).click();
  await reopenedNarrative('Significant trauma, abuse, loss, violence, or other adverse experiences you want your clinician to know about').fill('Fictional dedicated trauma boundary');
  await patientForm.getByRole('button',{name:'No checklist items to report',exact:true}).click();
  const traumaDefinition=JSON.parse(await readFile('lib/patient/trauma-history-definition.json','utf8'));
  const emptyTrauma={definition_version:traumaDefinition.version,selections:Object.fromEntries(traumaDefinition.groups.map(group=>[group.key,[]]))};
  await saveAndReopen(9,{trauma_history:'Fictional dedicated trauma boundary',trauma_history_checklist:JSON.stringify(emptyTrauma)});
  assert.equal(await reopenedNarrative('Significant trauma, abuse, loss, violence, or other adverse experiences you want your clinician to know about').inputValue(),'Fictional dedicated trauma boundary');
  assert.equal(await patientForm.locator('input[name^="trauma-checklist-"]:checked').count(),0);
  await tab(10).click();
  const legalDefinition=JSON.parse(await readFile('lib/patient/legal-routing-definition.json','utf8'));
  const routingAnswers=Object.fromEntries(legalDefinition.questions.map(q=>[q.id,'No']));
  assert.ok(await savePage.isDisabled(),'Unanswered legal directory cannot be saved');
  for(const key of Object.keys(routingAnswers))await patientForm.locator('input[name="routing-'+key+'"][value="No"]').check();
  await saveAndReopen(10,{legal_routing_answers:JSON.stringify({version:legalDefinition.version,answers:routingAnswers})});
  for(const key of Object.keys(routingAnswers))assert.ok(await patientForm.locator('input[name="routing-'+key+'"][value="No"]').isChecked());
  for(let number=15;number<=21;number++)assert.equal(await tab(number).getAttribute('data-page-status'),'optional');
  await tab(14).click();
  await patientPage.getByRole('button',{name:'Review and submit'}).click();
  await patientPage.getByRole('alert').filter({hasText:'Complete and save page 11 before submitting.'}).waitFor();
  assert.equal(await tab(11).getAttribute('aria-selected'),'true');
  const browserName=fictionalName;
  const markNarrativesNA=async()=>{for(const box of await patientForm.getByRole('checkbox',{name:/^Not applicable —/}).all())await box.check();};
  await select('Decision about outpatient counseling','Yes, I consent to outpatient counseling');
  await markNarrativesNA();
  await fill('Electronic signature for informed treatment consent (if Yes)',browserName);
  await fill('Date signed (if Yes)',today);
  await saveAndReopen(11,{treatment_consent:'Yes, I consent to outpatient counseling',treatment_signature:browserName,treatment_signature_date:today,treatment_questions:'Not applicable'});
  assert.equal(await patientForm.getByLabel('Electronic signature for informed treatment consent (if Yes)',{exact:true}).inputValue(),browserName);
  await tab(12).click();
  await select('Financial information review','I reviewed this information');
  await markNarrativesNA();
  await fill('Electronic signature acknowledging financial information (if reviewed)',browserName);
  await fill('Date signed (if reviewed)',today);
  await saveAndReopen(12,{financial_review:'I reviewed this information',financial_signature:browserName,financial_signature_date:today,financial_questions:'Not applicable'});
  assert.equal(await patientForm.getByLabel('Electronic signature acknowledging financial information (if reviewed)',{exact:true}).inputValue(),browserName);
  await tab(13).click();
  await select('Did you receive or review the Notice of Privacy Practices?','Decline acknowledgment');
  await markNarrativesNA();
  await saveAndReopen(13,{npp_received:'Decline acknowledgment',npp_signature:'',npp_signature_date:'',npp_questions:'Not applicable'});
  assert.equal(await selectField('Did you receive or review the Notice of Privacy Practices?').inputValue(),'Decline acknowledgment');
  await tab(14).click();
  await select('I certify that the information I provided is accurate and complete to the best of my knowledge.','Yes');
  await select('I agree that typing my name below constitutes my electronic signature for this intake questionnaire and acknowledgments.','Yes');
  await fill('Electronic signature — type your full legal name *',browserName);
  await fill('Date signed *',today);
  await saveAndReopen(14,{information_accuracy:'Yes',electronic_signature_consent:'Yes',patient_signature:browserName,patient_signature_date:today});
  assert.equal(await patientForm.getByLabel('Electronic signature — type your full legal name *',{exact:true}).inputValue(),browserName);
  // Explicit negative decisions exercise the distinct optional forms
  // without ever creating a disclosure authorization.
  const declines=[
    [15,'Telehealth preference','No, in-person care only','telehealth_choice','telehealth_signature','telehealth_signature_date'],
    [16,'Electronic documents and portal preference','I request paper intake','electronic_choice','electronic_signature','electronic_signature_date'],
    [17,'Who is signing this intake?','Patient signing for myself','representative_signer','representative_signature','representative_signature_date'],
    [18,'Do you want to authorize a disclosure to another person or organization?','No','roi_authorize','roi_signature','roi_signature_date'],
    [19,'Authorize a specific use or disclosure of Part 2 substance-use records?','No','part2_authorize','part2_signature','part2_signature_date'],
    [20,'Authorize disclosure of separate SUD counseling notes?','No','sud_notes_authorize','sud_notes_signature','sud_notes_signature_date'],
    [21,'Do you authorize disclosure of psychotherapy notes?','No','psych_notes_authorize','psych_notes_signature','psych_notes_signature_date']
  ];
  for(const [number,label,decision,key,signature,date] of declines){
    await tab(number).click();
    await select(label,decision);
    if(number<=16)await markNarrativesNA();
    await saveAndReopen(number,{[key]:decision,[signature]:'',[date]:''});
    assert.equal(await selectField(label).inputValue(),decision);
  }
  const beforeFinal=await readPatient();
  assert.equal(beforeFinal.status,'draft');
  await tab(14).click();
  await patientPage.getByRole('button',{name:'Review and submit'}).click();
  await verifyPage();
  await patientPage.getByRole('button',{name:'Confirm submission',exact:true}).click();
  await patientPage.getByRole('status').filter({hasText:'Your questionnaire has been submitted to the practice.'}).waitFor();
  const afterFinal=await readPatient();
  assert.equal(afterFinal.status,'submitted');
  assert.equal(afterFinal.version,beforeFinal.version+1);
  assert.equal(afterFinal.version,22);
  assert.equal(afterFinal.patient_id,fixture.account);
  assert.ok(Number.isFinite(Date.parse(afterFinal.submitted_at)));
  assert.deepEqual(afterFinal.answers,beforeFinal.answers);
  assert.deepEqual(afterFinal.completed_pages,beforeFinal.completed_pages);
  await patientPage.reload();
  await tabs.waitFor({state:'visible'});
  await verifyPage();
  await patientPage.getByText('Signed submissions are intentionally locked',{exact:false}).waitFor();
  assert.equal(await savePage.count(),0);
  assert.equal(await patientPage.getByRole('button',{name:'Review and submit'}).count(),0);
  assert.ok(await patientForm.getByLabel('Full legal name *',{exact:true}).isDisabled());
  console.log('Hosted source owner saved, independently read and reopened all 21 pages; final submission and locked reopen verified.');
}

// Separately opt-in isolated name-only recurring booking. This exercises the
// legacy scheduler path without creating a chart link or touching existing rows.
function recurringBookingConfig(e) {
  if(e.EMR_ACCEPTANCE_RECURRING_BOOKING===undefined||e.EMR_ACCEPTANCE_RECURRING_BOOKING==='false')return null;
  assert.equal(e.EMR_ACCEPTANCE_RECURRING_BOOKING,'true');
  verifyIsolationApproval(e);
  const marker=e.EMR_ACCEPTANCE_SCHEDULE_MARKER, date=e.EMR_ACCEPTANCE_SCHEDULE_FIRST_DATE, time=e.EMR_ACCEPTANCE_SCHEDULE_TIME;
  assert.match(marker,/^FICTIONAL-EMR-SCHEDULE-[a-f0-9]{32}$/);
  assert.match(date,/^\d{4}-\d{2}-\d{2}$/);
  const start=new Date(date+'T12:00:00Z');
  assert.ok(Number.isFinite(start.valueOf())&&start.toISOString().slice(0,10)===date,'Invalid fixture date');
  assert.match(time,/^(?:[01]\d|2[0-3]):00$/,'Use an exact hourly fixture slot');
  const through=new Date(start.valueOf()+7*86400000).toISOString().slice(0,10);
  assert.equal(through.slice(0,7),date.slice(0,7),'Two weekly fixture occurrences must fit in one calendar month');
  const editTime=e.EMR_ACCEPTANCE_SCHEDULE_EDIT_TIME;
  if(editTime!==undefined){
    assert.match(editTime,/^(?:[01]\d|2[0-3]):00$/,'Use an exact hourly replacement fixture slot');
    assert.notEqual(editTime,time,'Replacement slot must differ from the original');
  }
  const linkedTime=e.EMR_ACCEPTANCE_SCHEDULE_LINKED_TIME;
  let linked;
  if(linkedTime!==undefined){
    assert.ok(editTime,'Complete recurrence edit and cancellation before linked booking');
    assert.match(linkedTime,/^(?:[01]\d|2[0-3]):00$/);
    assert.notEqual(linkedTime,time);
    assert.notEqual(linkedTime,editTime);
    const account=e.EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID, chart=e.EMR_ACCEPTANCE_CHART_ID, name=e.EMR_ACCEPTANCE_SCHEDULE_LINKED_NAME;
    const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
    assert.match(account,uuid);
    assert.match(chart,uuid);
    assert.notEqual(account.toLowerCase(),chart.toLowerCase(),'Website account and central chart are separate fixture identities');
    assert.match(name,/^FICTIONAL-EMR-PATIENT-[a-f0-9]{32}$/);
    linked={account,chart,name,time:linkedTime};
  }
  return {marker,date,time,through,editTime,linked};
}
function verifyLinkedBooking(before,after,fixture,timezone,duration){
  assert.equal(before.length,4,'Complete recurring edit/cancel fixture required');
  assert.equal(after.length,before.length+1);
  assert.equal(new Set(after.map(r=>r.id)).size,after.length);
  for(const row of before)assert.deepEqual(after.find(r=>r.id===row.id),row,'Linked booking must preserve all previous appointments');
  const added=after.find(r=>!before.some(old=>old.id===r.id));
  assert.match(added.id,/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  assert.equal(added.patient_id,fixture.linked.account,'Scheduler links the website patient account, not the distinct EMR chart UUID');
  assert.equal(added.patient_name,null,'Linked booking must not store a free-text name');
  assert.equal(added.series_id,null);
  assert.equal(added.status,'booked');
  assert.deepEqual(scheduleLocal(added.starts_at,timezone),{date:fixture.date,time:fixture.linked.time});
  assert.equal(Date.parse(added.ends_at)-Date.parse(added.starts_at),duration*60000);
}
function scheduleLocal(instant,timezone) {
  const d=new Date(instant);
  assert.ok(Number.isFinite(d.valueOf()),'Invalid appointment instant');
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(p=>[p.type,p.value]));
  return {date:parts.year+'-'+parts.month+'-'+parts.day,time:parts.hour+':'+parts.minute};
}
function verifyRecurringRows(rows,fixture,timezone,duration) {
  assert.equal(rows.length,2,'Exactly two new fixture bookings required');
  const ordered=[...rows].sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at));
  const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  assert.match(ordered[0].series_id,uuid);
  assert.notEqual(ordered[0].id,ordered[1].id);
  for(let i=0;i<2;i++){
    const row=ordered[i];
    assert.match(row.id,uuid);
    assert.equal(row.series_id,ordered[0].series_id);
    assert.equal(row.patient_id,null,'Name-only scheduler fixture must never be represented as a linked chart');
    assert.equal(row.patient_name,fixture.marker);
    assert.equal(row.status,'booked');
    assert.deepEqual(scheduleLocal(row.starts_at,timezone),{date:i===0?fixture.date:fixture.through,time:fixture.time});
    assert.equal(Date.parse(row.ends_at)-Date.parse(row.starts_at),duration*60000);
  }
}
// The edit RPC preserves original row IDs as cancelled history and creates
// new booked rows. Compare by identity, not response ordering.
function verifyShiftedRows(before,after,fixture,timezone,duration){
  verifyRecurringRows(before,fixture,timezone,duration);
  assert.equal(after.length,4,'Exactly two originals and two replacements required');
  assert.equal(new Set(after.map(r=>r.id)).size,4,'Duplicate appointment identities');
  const ids=new Set(before.map(r=>r.id));
  for(const original of before)assert.deepEqual(after.find(r=>r.id===original.id),{...original,status:'cancelled'},'Original appointment history changed');
  const replacements=after.filter(r=>!ids.has(r.id));
  verifyRecurringRows(replacements,{...fixture,time:fixture.editTime},timezone,duration);
  for(const row of replacements)assert.equal(row.series_id,before[0].series_id,'Series identity changed');
  return replacements.sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at));
}
function verifySingleCancellation(before,after,target){
  assert.equal(before.length,4);
  assert.equal(after.length,4,'Cancellation must preserve all history');
  assert.equal(before.find(r=>r.id===target)?.status,'booked','Cancellation target must be active');
  assert.equal(new Set(after.map(r=>r.id)).size,4);
  for(const row of before)assert.deepEqual(after.find(r=>r.id===row.id),row.id===target?{...row,status:'cancelled'}:row,'Unexpected appointment change during single cancellation');
  assert.equal(after.filter(r=>r.status==='booked').length,1,'One active recurring occurrence must remain');
}
async function exerciseRecurringBooking({page,origin,database,e,fixture}) {
  // Take readback credentials from the real MFA-authenticated calendar request,
  // not from a service-role key or a separate session that could bypass RLS.
  const [calendarRead,opened]=await Promise.all([
    page.waitForResponse(r=>{const u=new URL(r.url());return u.origin===database&&u.pathname==='/rest/v1/appointments'&&r.request().method()==='GET';}),
    page.goto(origin+'/appointments')
  ]);
  assert.equal(opened.status(),200);
  assert.equal(page.url(),origin+'/appointments');
  assert.equal(await page.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
  assert.equal(calendarRead.status(),200);
  const headers=await calendarRead.request().allHeaders();
  assert.ok(headers.apikey&&/^Bearer \S+$/.test(headers.authorization||''),'Authenticated scheduler readback credentials required');
  const read=async(path,extra={})=>{
    const url=new URL(path,database);
    assert.equal(url.origin,database);
    const res=await fetch(url,{headers:{apikey:headers.apikey,Authorization:headers.authorization,...extra},cache:'no-store',redirect:'error'});
    assert.ok([200,206].includes(res.status),'Isolated scheduler readback failed');
    return res;
  };
  const user=await (await read('/auth/v1/user')).json();
  assert.equal(user.email,e.EMR_ACCEPTANCE_CLINICIAN_EMAIL);
  if(fixture.linked){
    const source=await page.evaluate(async chart=>{
      const r=await fetch('/api/emr/bps-intake?patient='+encodeURIComponent(chart),{cache:'no-store',redirect:'error'});
      return {status:r.status,body:await r.json()};
    },fixture.linked.chart);
    assert.equal(source.status,200);
    assert.equal(source.body.patientId,fixture.linked.chart.toLowerCase());
    assert.equal(source.body.linked,true);
    assert.equal(source.body.source?.accountId,fixture.linked.account);
    assert.equal(source.body.source?.status,'submitted');
  }
  const settings=await (await read('/rest/v1/appointment_settings?select=timezone,appointment_duration_minutes&id=eq.true')).json();
  assert.equal(settings.length,1);
  const {timezone,appointment_duration_minutes:duration}=settings[0];
  assert.ok(Number.isSafeInteger(duration)&&duration>=15&&duration<=240);
  const today=scheduleLocal(new Date().toISOString(),timezone).date;
  const nextMonth=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),1)).toISOString().slice(0,7);
  assert.ok(fixture.date>today,'Fixture booking must be in the future');
  assert.ok([today.slice(0,7),nextMonth].includes(fixture.date.slice(0,7)),'Fixture must be in current or next practice month');
  const allRows=async()=>{
    const response=await read('/rest/v1/appointments?select=id,patient_id,patient_name,starts_at,ends_at,status,series_id&order=starts_at&limit=5',{Prefer:'count=exact'});
    const rows=await response.json(), count=response.headers.get('content-range')?.split('/').pop();
    assert.ok(Array.isArray(rows)&&/^\d+$/.test(count||'')&&Number(count)===rows.length,'Complete appointment count required before and after isolated booking');
    return rows;
  };
  assert.deepEqual(await allRows(),[],'Dedicated scheduler fixture database must contain no appointments before booking');
  const calendar=page.getByRole('table',{name:'Monthly appointment calendar'});
  await page.locator('.monthCalendar[aria-busy="false"]').waitFor();
  assert.equal(await page.locator('.calendarError[role="alert"]').count(),0);
  await page.locator('.calendarHeading').getByRole('button',{name:'Place patient appointments',exact:true}).click();
  await page.getByLabel('Patient',{exact:true}).selectOption('');
  await page.getByLabel('Patient name',{exact:true}).fill(fixture.marker);
  await page.getByLabel('First appointment date',{exact:true}).fill(fixture.date);
  await page.getByLabel('Appointment start',{exact:true}).fill(fixture.time);
  await page.getByLabel('Repeat',{exact:true}).selectOption('1');
  await page.getByLabel('Repeat through (up to one year)',{exact:true}).fill(fixture.through);
  const [receipt]=await Promise.all([
    page.waitForResponse(r=>{const u=new URL(r.url());return u.origin===database&&u.pathname==='/rest/v1/rpc/book_patient_appointments'&&r.request().method()==='POST';}),
    page.getByRole('button',{name:'Book patient appointments',exact:true}).click()
  ]);
  assert.deepEqual(receipt.request().postDataJSON(),{p_patient_id:null,p_patient_name:fixture.marker,p_first_date:fixture.date,p_start_time:fixture.time,p_repeat_weeks:1,p_through:fixture.through});
  assert.equal(receipt.status(),200);
  assert.equal(await receipt.json(),2);
  await page.getByText('2 appointments booked. Adjacent openings updated.',{exact:true}).waitFor();
  verifyRecurringRows(await allRows(),fixture,timezone,duration);
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
  await calendar.waitFor();
  await page.locator('.monthCalendar[aria-busy="false"]').waitFor();
  if(fixture.date.slice(0,7)===nextMonth){
    await page.getByRole('button',{name:'Next month',exact:true}).click();
    await page.locator('.monthCalendar[aria-busy="false"]').waitFor();
  }
  const events=calendar.locator('.calendarEvent').filter({hasText:fixture.marker});
  await events.nth(1).waitFor();
  assert.equal(await events.count(),2);
  for(let i=0;i<2;i++){
    const date=i===0?fixture.date:fixture.through;
    const event=calendar.getByRole('button',{name:fixture.marker+', '+date+', '+fixture.time,exact:true});
    assert.equal(await event.count(),1);
    assert.ok((await event.innerText()).includes('↻'));
    await event.click();
    await page.getByRole('heading',{name:'Appointment details'}).waitFor();
    await page.getByText(/This is a name-only booking, not a central patient chart link/).waitFor();
    assert.equal(await page.getByLabel('Appointment date',{exact:true}).inputValue(),date);
    assert.equal(await page.getByLabel('Start time',{exact:true}).inputValue(),fixture.time);
    assert.equal(await page.getByLabel('Apply to',{exact:true}).inputValue(),'one');
    assert.equal(await page.getByLabel('Apply to',{exact:true}).locator('option[value="future"]').count(),1);
    await page.getByRole('button',{name:'Close appointment details',exact:true}).click();
  }
  verifyRecurringRows(await allRows(),fixture,timezone,duration);
  console.log('Hosted isolated fictional name-only recurring booking: two weekly occurrences, independent exact-count database readback, calendar reload and recurrence controls verified.');
  if(!fixture.editTime){console.log('Hosted recurring edit and cancellation not executed; explicit replacement slot required.');return;}
  const booked=await allRows();
  verifyRecurringRows(booked,fixture,timezone,duration);
  const event=(date,time)=>calendar.getByRole('button',{name:fixture.marker+', '+date+', '+time,exact:true});
  const first=[...booked].sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at))[0];
  const mutation=async({row,scope,action,time,date,trigger,expected})=>{
    const [receipt]=await Promise.all([
      page.waitForResponse(r=>{const u=new URL(r.url());return u.origin===database&&u.pathname==='/rest/v1/rpc/edit_calendar_appointments'&&r.request().method()==='POST';}),
      trigger()
    ]);
    const body=receipt.request().postDataJSON();
    assert.equal(body.p_id,row.id);
    assert.equal(Date.parse(body.p_expected_start),Date.parse(row.starts_at));
    assert.equal(body.p_date,date);
    assert.equal(body.p_time,time);
    assert.equal(body.p_patient_name,fixture.marker);
    assert.equal(body.p_scope,scope);
    assert.equal(body.p_action,action);
    assert.equal(receipt.status(),200);
    assert.equal(await receipt.json(),expected);
  };
  await event(fixture.date,fixture.time).click();
  await page.getByLabel('Apply to',{exact:true}).selectOption('future');
  await page.getByLabel('Start time',{exact:true}).fill(fixture.editTime);
  await mutation({row:first,scope:'future',action:'save',time:fixture.editTime,date:fixture.date,expected:2,trigger:()=>page.getByRole('button',{name:'Save changes',exact:true}).click()});
  await page.getByText('2 appointments updated. Adjacent openings have been recalculated.',{exact:true}).waitFor();
  const shifted=await allRows();
  const replacements=verifyShiftedRows(booked,shifted,fixture,timezone,duration);
  await page.locator('.monthCalendar[aria-busy="false"]').waitFor();
  await event(fixture.date,fixture.editTime).waitFor();
  assert.equal(await event(fixture.date,fixture.time).count(),0);
  await event(fixture.date,fixture.editTime).click();
  await page.getByLabel('Apply to',{exact:true}).selectOption('one');
  await page.getByRole('button',{name:'Cancel appointment',exact:true}).click();
  await page.getByRole('button',{name:'Keep appointment',exact:true}).click();
  verifyShiftedRows(booked,await allRows(),fixture,timezone,duration);
  await page.getByRole('button',{name:'Cancel appointment',exact:true}).click();
  await mutation({row:replacements[0],scope:'one',action:'cancel',time:fixture.editTime,date:fixture.date,expected:1,trigger:()=>page.getByRole('button',{name:'Confirm cancellation',exact:true}).click()});
  await page.getByText('1 appointment cancelled. Adjacent openings have been recalculated.',{exact:true}).waitFor();
  verifySingleCancellation(shifted,await allRows(),replacements[0].id);
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
  await calendar.waitFor();
  await page.locator('.monthCalendar[aria-busy="false"]').waitFor();
  if(fixture.date.slice(0,7)===nextMonth){
    await page.getByRole('button',{name:'Next month',exact:true}).click();
    await page.locator('.monthCalendar[aria-busy="false"]').waitFor();
  }
  await event(fixture.through,fixture.editTime).waitFor();
  assert.equal(await event(fixture.date,fixture.editTime).count(),0);
  assert.equal(await event(fixture.date,fixture.time).count(),0);
  assert.equal(await event(fixture.through,fixture.time).count(),0);
  assert.equal(await calendar.locator('.calendarEvent').filter({hasText:fixture.marker}).count(),1);
  verifySingleCancellation(shifted,await allRows(),replacements[0].id);
  console.log('Hosted fictional recurring future edit, preserved original history, single cancellation, exact receipt and reopened calendar verified. No invitations performed.');
  if(!fixture.linked)return;
  const linked=fixture.linked, beforeLinked=await allRows();
  await page.locator('.calendarHeading').getByRole('button',{name:'Place patient appointments',exact:true}).click();
  const select=page.getByLabel('Patient',{exact:true});
  const option=select.locator('option').filter({hasText:linked.name+' · '+linked.account.slice(0,8)});
  await option.waitFor({state:'attached'});
  assert.equal(await option.count(),1);
  assert.equal(await option.textContent(),linked.name+' · '+linked.account.slice(0,8));
  assert.equal(await option.getAttribute('value'),linked.account);
  await select.selectOption(linked.account);
  assert.equal(await page.getByLabel('Patient name',{exact:true}).count(),0);
  await page.getByLabel('First appointment date',{exact:true}).fill(fixture.date);
  await page.getByLabel('Appointment start',{exact:true}).fill(linked.time);
  await page.getByLabel('Repeat',{exact:true}).selectOption('0');
  const [linkedReceipt]=await Promise.all([
    page.waitForResponse(r=>{const u=new URL(r.url());return u.origin===database&&u.pathname==='/rest/v1/rpc/book_patient_appointments'&&r.request().method()==='POST';}),
    page.getByRole('button',{name:'Book patient appointments',exact:true}).click()
  ]);
  assert.deepEqual(linkedReceipt.request().postDataJSON(),{p_patient_id:linked.account,p_patient_name:null,p_first_date:fixture.date,p_start_time:linked.time,p_repeat_weeks:0,p_through:fixture.date});
  assert.equal(linkedReceipt.status(),200);
  assert.equal(await linkedReceipt.json(),1);
  await page.getByText('1 appointment booked. Adjacent openings updated.',{exact:true}).waitFor();
  verifyLinkedBooking(beforeLinked,await allRows(),fixture,timezone,duration);
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
  await calendar.waitFor();
  await page.locator('.monthCalendar[aria-busy="false"]').waitFor();
  if(fixture.date.slice(0,7)===nextMonth){
    await page.getByRole('button',{name:'Next month',exact:true}).click();
    await page.locator('.monthCalendar[aria-busy="false"]').waitFor();
  }
  const linkedEvent=calendar.getByRole('button',{name:linked.name+', '+fixture.date+', '+linked.time,exact:true});
  await linkedEvent.waitFor();
  assert.equal(await linkedEvent.count(),1);
  await linkedEvent.click();
  await page.getByRole('heading',{name:'Appointment details'}).waitFor();
  assert.equal(await page.getByText(/This is a name-only booking, not a central patient chart link/).count(),0);
  assert.equal(await page.getByLabel('Patient name',{exact:true}).count(),0);
  assert.equal(await page.getByLabel('Appointment date',{exact:true}).inputValue(),fixture.date);
  assert.equal(await page.getByLabel('Start time',{exact:true}).inputValue(),linked.time);
  assert.equal(await page.getByLabel('Apply to',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Close appointment details',exact:true}).click();
  verifyLinkedBooking(beforeLinked,await allRows(),fixture,timezone,duration);
  console.log('Hosted fictional linked appointment: exact source-account/chart association, single booking receipt, independent database readback, preserved history and reopened calendar verified.');
}


/** Existing, explicitly approved fictional sent CSEQ fixture only. No provider call,
 * send/resend action, or modification of invitation status is performed here. */
function cseqConfig(e,sourceFixture){
  if(e.EMR_ACCEPTANCE_CSEQ===undefined||e.EMR_ACCEPTANCE_CSEQ==='false')return null;
  assert.equal(e.EMR_ACCEPTANCE_CSEQ,'true');
  verifyIsolationApproval(e);
  assert.ok(sourceFixture,'CSEQ requires the verified fresh fictional linked intake owner');
  const id=e.EMR_ACCEPTANCE_CSEQ_ID, hash=e.EMR_ACCEPTANCE_CSEQ_HASH;
  assert.match(id,/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  assert.notEqual(id,sourceFixture.account);
  assert.notEqual(id,e.EMR_ACCEPTANCE_CHART_ID);
  assert.match(hash,/^[a-f0-9]{64}$/);
  return {id,hash,chart:e.EMR_ACCEPTANCE_CHART_ID.toLowerCase(),recipient:sourceFixture};
}
function verifyCseqAssignment(a,f,now=Date.now()){
  assert.equal(a?.id,f.id);
  assert.equal(a.patient_id,f.chart);
  assert.equal(a.recipient_email,f.recipient.email);
  assert.equal(a.test_key,'cseq');
  assert.equal(a.connected_source_hash,f.hash);
  assert.equal(a.status,'sent');
  assert.ok(Number.isFinite(Date.parse(a.sent_at))&&Date.parse(a.sent_at)<=now);
  assert.ok(Number.isFinite(Date.parse(a.expires_at))&&Date.parse(a.expires_at)>now);
  assert.equal(Date.parse(a.expires_at)-Date.parse(a.sent_at),14*86400000);
}
async function exerciseHostedCseq({page,context,newRoutedContext,origin,database,e,fixture:f}){
  const listPath='/api/admin/test-assignments?patient='+f.chart;
  const adminAssignment=async()=>{
    const result=await page.evaluate(async p=>{const r=await fetch(p,{cache:'no-store',redirect:'error'});return {status:r.status,body:await r.json()};},listPath);
    assert.equal(result.status,200);
    assert.ok(Array.isArray(result.body.assignments));
    const rows=result.body.assignments.filter(a=>a.id===f.id);
    assert.equal(rows.length,1);
    verifyCseqAssignment(rows[0],f);
    return rows[0];
  };
  assert.equal((await adminAssignment()).connected_progress,null,'Require a fresh fictional sent assignment with no response');
  const recipientContext=await newRoutedContext();
  try{
    const p=await recipientContext.newPage();p.setDefaultTimeout(30000);
    const path='/patient/assigned-tests/'+f.id;
    const api='/api/assigned-tests/connected?id='+f.id;
    const reportPath='/admin/assign-test/connected-responses/'+f.id;
    const verifyPage=async tab=>assert.equal(await tab.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
    await p.goto(origin+path);
    await p.waitForURL(u=>u.origin===origin&&u.pathname==='/login');
    await verifyPage(p);
    await p.getByLabel('Email',{exact:true}).fill(f.recipient.email);
    await p.getByLabel('Password',{exact:true}).fill(f.recipient.password);
    const [auth]=await Promise.all([
      p.waitForResponse(r=>{const u=new URL(r.url());return u.origin===database&&u.pathname==='/auth/v1/token'&&u.searchParams.get('grant_type')==='password'&&r.request().method()==='POST';}),
      p.getByRole('button',{name:'Sign in',exact:true}).click()
    ]);
    assert.equal(auth.status(),200);
    const session=await auth.json();verifyPatientAuth(session.user,f.recipient);
    const key=(await auth.request().allHeaders()).apikey;
    assert.ok(key&&session.access_token);
    await p.waitForURL(u=>u.origin===origin&&u.pathname===path);
    await verifyPage(p);
    const read=async (table,select,column,value)=>{
      const url=new URL('/rest/v1/'+table,database);
      url.searchParams.set('select',select);url.searchParams.set(column,'eq.'+value);
      const r=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+session.access_token},redirect:'error',cache:'no-store'});
      assert.equal(r.status,200);
      const rows=await r.json();assert.ok(Array.isArray(rows)&&rows.length<=1);
      return rows[0]??null;
    };
    const readResponse=()=>read('connected_assignment_responses','assignment_id,respondent_id,answers,page,revision,status,identity_confirmed,answered_count,submitted_at','assignment_id',f.id);
    assert.equal(await readResponse(),null);
    const initial=await p.evaluate(async path=>{const r=await fetch(path,{cache:'no-store',redirect:'error'});return {status:r.status,body:await r.json()};},api);
    assert.equal(initial.status,200);
    assert.equal(initial.body.assignment.id,f.id);
    assert.deepEqual(initial.body.response,{answers:{},page:0,revision:0,status:'draft',identity_confirmed:false});
    const definition=initial.body.definition;
    assert.equal(definition.testKey,'cseq');
    assert.ok(definition.items.length>7);
    assert.equal(new Set(definition.items.map(i=>i.id)).size,definition.items.length);
    await p.getByRole('heading',{name:definition.title,exact:true}).waitFor();
    const start=p.getByRole('button',{name:'Start questionnaire',exact:true});
    assert.ok(await start.isDisabled());
    await p.getByRole('checkbox').check();await start.click();
    const reportPage=await context.newPage();reportPage.setDefaultTimeout(30000);
    try{
      await reportPage.goto(origin+reportPath);await verifyPage(reportPage);
      await reportPage.getByText('no clinical scores are calculated from partial responses',{exact:false}).waitFor();
      assert.equal(await reportPage.locator('.connectedReport').count(),0);
      const answers={},pages=Math.ceil(definition.items.length/7);
      for(let n=0;n<pages;n++){
        const items=definition.items.slice(n*7,n*7+7), groups=p.locator('.asqQuestion'),final=n===pages-1;
        assert.equal(await groups.count(),items.length);
        const next=p.getByRole('button',{name:final?'Save and submit questionnaire':'Save and next',exact:true});
        if(n===0){await next.click();await p.getByRole('alert').filter({hasText:'Answer each question on this page'}).waitFor();assert.equal(await readResponse(),null);}
        for(let i=0;i<items.length;i++){
          const item=items[i],choice=(n+i)%item.options.length;
          await groups.nth(i).getByRole('radio').nth(choice).check();
          answers[item.id]=item.options[choice].value;
        }
        await next.click();
        if(final)await p.getByRole('heading',{name:'Questionnaire submitted',exact:true}).waitFor();
        else await p.getByRole('status').filter({hasText:'Your answers and place are saved.'}).waitFor();
        const row=await readResponse();
        assert.equal(row.assignment_id,f.id);assert.equal(row.respondent_id,f.recipient.account);
        assert.deepEqual(row.answers,answers);assert.equal(row.revision,n+1);
        assert.equal(row.page,final?n:n+1);assert.equal(row.status,final?'submitted':'draft');
        assert.equal(row.identity_confirmed,true);assert.equal(row.answered_count,Object.keys(answers).length);
        if(final)assert.ok(Number.isFinite(Date.parse(row.submitted_at)));else assert.equal(row.submitted_at,null);
        const progress=(await adminAssignment()).connected_progress;
        assert.equal(progress.assignment_id,f.id);assert.equal(progress.status,row.status);
        assert.equal(progress.revision,row.revision);assert.equal(progress.answered_count,row.answered_count);
        if(n===0&&!final){
          await p.reload();await verifyPage(p);
          await p.getByRole('button',{name:'Resume questionnaire',exact:true}).waitFor();
          assert.ok(await p.getByRole('checkbox').isChecked());
          await p.getByRole('button',{name:'Resume questionnaire',exact:true}).click();
          await p.getByRole('heading',{name:/Questions 8–/}).waitFor();
          await reportPage.reload();
          await reportPage.getByText('no clinical scores are calculated from partial responses',{exact:false}).waitFor();
          assert.equal(await reportPage.locator('.connectedReport').count(),0);
        }
      }
      const final=await readResponse();
      await p.reload();await verifyPage(p);
      await p.getByRole('heading',{name:'Questionnaire submitted',exact:true}).waitFor();
      assert.equal(await p.getByRole('button',{name:'Save and submit questionnaire'}).count(),0);
      const rejected=await p.evaluate(async ({id,record})=>{
        const r=await fetch('/api/assigned-tests/connected',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,expectedRevision:record.revision,page:record.page,submit:true,identityConfirmed:true,answers:record.answers}),redirect:'error'});
        return r.status;
      },{id:f.id,record:final});
      assert.ok(rejected>=400&&rejected<600);assert.deepEqual(await readResponse(),final);
      await reportPage.reload();await verifyPage(reportPage);
      const report=reportPage.locator('.connectedReport');
      await report.getByRole('heading',{name:/Clinical Results/}).waitFor();
      assert.equal(await report.locator('.reportAppendix .reportResponse').count(),definition.items.length);
      assert.ok(await report.locator('.reportScores meter').count()>0);
      for(const value of [f.hash,f.id,f.chart,definition.items.length+' / '+definition.items.length+' answers · revision '+final.revision])await report.getByText(value,{exact:true}).waitFor();
      for(let i=0;i<definition.items.length;i++){
        const item=definition.items[i],label=item.options.find(o=>o.value===answers[item.id]).label;
        assert.ok((await report.locator('.reportAppendix .reportResponse').nth(i).locator('p').innerText()).startsWith(label+' '));
      }
      const link=new URL(await reportPage.getByRole('link',{name:'Central patient record'}).getAttribute('href'),origin);
      assert.equal(link.origin,origin);assert.equal(link.searchParams.get('patient'),f.chart);
      await p.goto(origin+reportPath);
      assert.notEqual(p.url(),origin+reportPath);assert.equal(await p.locator('.connectedReport').count(),0);
      console.log('Hosted fictional pre-existing CSEQ: recipient authentication, page persistence, immutable submission, chart-bound report and patient denial verified; no invitation sent.');
    }finally{await reportPage.close();}
  }finally{await recipientContext.close();}
}

// Full release acceptance is an explicit mode, not an inference from an exit
// code of a read-only or partial run. Refuse a missing stage before any network
// request or authentication. Each stage still requires its own fixture approval.
function verifyFullHostedPlan({writeFixture,originalWrite,patientFixture,sourceFixture,recurringFixture,cseqFixture}) {
  assert.ok(writeFixture,'Full hosted run requires clinician review write approval');
  assert.equal(originalWrite,true,'Full hosted run requires all original-form writes');
  assert.ok(patientFixture,'Full hosted run requires separate patient isolation fixture');
  assert.ok(sourceFixture,'Full hosted run requires fresh patient source submission');
  assert.ok(recurringFixture?.editTime,'Full hosted run requires recurrence edit and cancellation');
  assert.ok(recurringFixture?.linked,'Full hosted run requires chart-linked booking');
  assert.ok(cseqFixture,'Full hosted run requires existing fictional CSEQ assignment');
  assert.ok(recurringFixture.linked.account===sourceFixture.account &&
    cseqFixture.recipient.account===sourceFixture.account &&
    recurringFixture.linked.chart===cseqFixture.chart,
    'Full hosted run requires a coherent linked fictional account and chart');
}

if(process.argv.includes('--self-test')) {
  const ref='abcdefghijklmnopqrst';
  const e={EMR_ACCEPTANCE_ORIGIN:'https://indiancreekpsych-fixture-ken-morris-projects.vercel.app',EMR_ACCEPTANCE_SUPABASE_URL:'https://'+ref+'.supabase.co',EMR_ACCEPTANCE_APPROVED_PROJECT_REF:ref,EMR_ACCEPTANCE_DEPLOYMENT_ID:'dpl_fixture',EMR_ACCEPTANCE_EXPECTED_SHA:'a'.repeat(40),EMR_ACCEPTANCE_CLINICIAN_EMAIL:'emr-acceptance-fictional@example.com',EMR_ACCEPTANCE_CLINICIAN_PASSWORD:'fixture',EMR_ACCEPTANCE_TOTP_SECRET:'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',EMR_ACCEPTANCE_CHART_ID:'00000000-0000-4000-8000-000000000001',EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION:'2',EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION:'fixture-v1',EMR_ACCEPTANCE_EXPECTED_REVIEWED:'false'};
  assert.doesNotThrow(()=>config(e));
  for(const ref of excluded) assert.throws(()=>config({...e,EMR_ACCEPTANCE_APPROVED_PROJECT_REF:ref,EMR_ACCEPTANCE_SUPABASE_URL:'https://'+ref+'.supabase.co'}));
  for(const target of ['https://www.indiancreekpsych.com','https://indiancreekpsych-fixture-ken-morris-projects.vercel.app/path','http://indiancreekpsych-fixture-ken-morris-projects.vercel.app','https://indiancreekpsych-fixture-ken-morris-projects.vercel.app.evil.test']) assert.throws(()=>config({...e,EMR_ACCEPTANCE_ORIGIN:target}));
  assert.throws(()=>config({...e,EMR_ACCEPTANCE_APPROVED_PROJECT_REF:'different'}));
  assert.throws(()=>config({...e,EMR_ACCEPTANCE_CLINICIAN_EMAIL:'real@example.com'}));
  assert.throws(()=>config({...e,EMR_ACCEPTANCE_TOTP_SECRET:'bad!'}));
  assert.equal(totp(e.EMR_ACCEPTANCE_TOTP_SECRET,59000),'287082');
  console.log('15 hosted preflight guard/TOTP checks passed; no hosted requests performed.');
  const summary={patientId:e.EMR_ACCEPTANCE_CHART_ID,source:{status:'submitted',version:2,submittedAt:'2026-01-01T00:01:00Z',updatedAt:'2026-01-01T00:00:00Z',questionnairePacketVersion:'fixture-v1'},currentVersionReviewed:false};
  assert.doesNotThrow(()=>verifySubmittedSummary(summary,e.EMR_ACCEPTANCE_CHART_ID,2,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,false));
  assert.throws(()=>verifySubmittedSummary({...summary,patientId:'wrong-chart'},e.EMR_ACCEPTANCE_CHART_ID,2,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,false));
  assert.throws(()=>verifySubmittedSummary(summary,e.EMR_ACCEPTANCE_CHART_ID,3,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,false));
  assert.throws(()=>verifySubmittedSummary({...summary,source:{...summary.source,status:'draft'}},e.EMR_ACCEPTANCE_CHART_ID,2,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,false));
  assert.throws(()=>verifySubmittedSummary({...summary,source:{...summary.source,submittedAt:null}},e.EMR_ACCEPTANCE_CHART_ID,2,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,false));
  assert.throws(()=>verifySubmittedSummary({...summary,source:{...summary.source,updatedAt:'2026-01-01T00:02:00Z'}},e.EMR_ACCEPTANCE_CHART_ID,2,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,false));
  assert.throws(()=>verifySubmittedSummary({...summary,clinical_answers:{}},e.EMR_ACCEPTANCE_CHART_ID,2,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,false));
  assert.throws(()=>verifySubmittedSummary({...summary,source:{...summary.source,questionnairePacketVersion:null}},e.EMR_ACCEPTANCE_CHART_ID,2,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,false));
  assert.throws(()=>config({...e,EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION:'0'}));
  assert.throws(()=>config({...e,EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION:'9007199254740992'}));
  assert.throws(()=>verifySubmittedSummary({...summary,source:{...summary.source,questionnairePacketVersion:'unexpected-v2'}},e.EMR_ACCEPTANCE_CHART_ID,2,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,false));
  assert.throws(()=>verifySubmittedSummary({...summary,currentVersionReviewed:true},e.EMR_ACCEPTANCE_CHART_ID,2,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,false));
  assert.throws(()=>verifySubmittedSummary({...summary,currentVersionReviewed:'false'},e.EMR_ACCEPTANCE_CHART_ID,2,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,false));
  assert.doesNotThrow(()=>verifySubmittedSummary({...summary,currentVersionReviewed:true},e.EMR_ACCEPTANCE_CHART_ID,2,e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,true));
  assert.throws(()=>config({...e,EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION:''}));
  assert.throws(()=>config({...e,EMR_ACCEPTANCE_EXPECTED_REVIEWED:'unknown'}));
  console.log('16 hosted fixture identity, version and metadata-boundary checks passed; no hosted requests performed.');
  const fixtureLinks=[...originalForms.keys()].map(key=>'/emr/workspace?'+new URLSearchParams({patient:e.EMR_ACCEPTANCE_CHART_ID,module:'assessment',section:'assessment:biopsychosocial',bps_page:key}));
  const verifyLinks=links=>verifyOriginalFormLinks(links,e.EMR_ACCEPTANCE_ORIGIN,e.EMR_ACCEPTANCE_CHART_ID);
  assert.equal(verifyLinks(fixtureLinks).length,7);
  assert.throws(()=>verifyLinks(fixtureLinks.slice(1)));
  assert.throws(()=>verifyLinks([fixtureLinks[1],...fixtureLinks.slice(1)]));
  assert.throws(()=>verifyLinks([fixtureLinks[0].replace(e.EMR_ACCEPTANCE_CHART_ID,'wrong-chart'),...fixtureLinks.slice(1)]));
  assert.throws(()=>verifyLinks(['https://example.com'+fixtureLinks[0],...fixtureLinks.slice(1)]));
  assert.throws(()=>verifyLinks([fixtureLinks[0]+'&patient=wrong-chart',...fixtureLinks.slice(1)]));
  assert.throws(()=>verifyLinks([fixtureLinks[0].replace('/emr/workspace','/emr'),...fixtureLinks.slice(1)]));
  assert.throws(()=>verifyLinks([fixtureLinks[0].replace('bps_page=symptoms','bps_page=unknown'),...fixtureLinks.slice(1)]));
  console.log('8 original BPS link safety checks passed; no hosted requests performed.');
  const write={...e,EMR_ACCEPTANCE_REVIEW_WRITE:'true',EMR_ACCEPTANCE_ISOLATION_APPROVAL:e.EMR_ACCEPTANCE_DEPLOYMENT_ID+':'+e.EMR_ACCEPTANCE_EXPECTED_SHA+':'+ref,EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID:'00000000-0000-4000-8000-000000000002',EMR_ACCEPTANCE_FIXTURE_MARKER:'FICTIONAL-EMR-ACCEPTANCE-'+'c'.repeat(32)};
  assert.equal(reviewWriteConfig(e),null);
  assert.throws(()=>reviewWriteConfig({...write,EMR_ACCEPTANCE_REVIEW_WRITE:'yes'}));
  assert.throws(()=>reviewWriteConfig({...write,EMR_ACCEPTANCE_ISOLATION_APPROVAL:'wrong'}));
  assert.throws(()=>reviewWriteConfig({...write,EMR_ACCEPTANCE_EXPECTED_REVIEWED:'true'}));
  assert.throws(()=>reviewWriteConfig({...write,EMR_ACCEPTANCE_FIXTURE_MARKER:'real patient'}));
  const fixture=reviewWriteConfig(write);
  const full={patientId:e.EMR_ACCEPTANCE_CHART_ID,linked:true,source:{accountId:fixture.account,status:'submitted',version:2,questionnairePacketVersion:'fixture-v1'},sections:Array.from({length:21},(_,i)=>({title:'fixture-section-'+i,disposition:'clinical',fields:i===0?[{key:'counseling_reason',value:fixture.marker,sourceOnly:false,reported:true}]:[]})),unmappedKeys:[],reviews:[]};
  assert.doesNotThrow(()=>verifyFreshReviewFixture(full,write,fixture));
  assert.throws(()=>verifyFreshReviewFixture({...full,reviews:[{}]},write,fixture));
  assert.throws(()=>verifyFreshReviewFixture({...full,source:{...full.source,accountId:'wrong'}},write,fixture));
  const withField=(patch,sectionPatch={})=>({...full,sections:full.sections.map((section,i)=>i===0?{...section,...sectionPatch,fields:[{...section.fields[0],...patch}]}:section)});
  assert.throws(()=>verifyFreshReviewFixture(withField({value:''}),write,fixture));
  assert.throws(()=>verifyFreshReviewFixture(withField({key:'unrelated_field'}),write,fixture));
  assert.throws(()=>verifyFreshReviewFixture(withField({value:fixture.marker+' extra'}),write,fixture));
  assert.throws(()=>verifyFreshReviewFixture(withField({sourceOnly:true}),write,fixture));
  assert.throws(()=>verifyFreshReviewFixture(withField({reported:false}),write,fixture));
  assert.throws(()=>verifyFreshReviewFixture(withField({},{disposition:'reference'}),write,fixture));
  assert.throws(()=>verifyFreshReviewFixture({...full,sections:full.sections.map((section,i)=>i===1?{...section,fields:full.sections[0].fields}:section)},write,fixture));
  assert.throws(()=>verifyFreshReviewFixture({...full,sections:full.sections.map((section,i)=>i===1?{...section,title:full.sections[0].title}:section)},write,fixture));
  console.log('16 opt-in fictional review write safety checks passed; no hosted requests performed.');
  assert.equal(originalWriteConfig(e,null),false);
  assert.equal(originalWriteConfig({...write,EMR_ACCEPTANCE_ORIGINAL_WRITE:'false'},fixture),false);
  assert.throws(()=>originalWriteConfig({...write,EMR_ACCEPTANCE_ORIGINAL_WRITE:'true'},null));
  assert.throws(()=>originalWriteConfig({...write,EMR_ACCEPTANCE_ORIGINAL_WRITE:'yes'},fixture));
  assert.equal(originalWriteConfig({...write,EMR_ACCEPTANCE_ORIGINAL_WRITE:'true'},fixture),true);
  const original={revision:3,value:{patient:{id:e.EMR_ACCEPTANCE_CHART_ID},records:[]}};
  assert.doesNotThrow(()=>verifyOriginalChart(original,e.EMR_ACCEPTANCE_CHART_ID,3,true));
  assert.throws(()=>verifyOriginalChart(original,'wrong',3,true));
  assert.throws(()=>verifyOriginalChart(original,e.EMR_ACCEPTANCE_CHART_ID,4,true));
  assert.throws(()=>verifyOriginalChart({...original,revision:-1},e.EMR_ACCEPTANCE_CHART_ID,undefined,true));
  assert.throws(()=>verifyOriginalChart({...original,value:{...original.value,records:[{id:'existing'}]}},e.EMR_ACCEPTANCE_CHART_ID,3,true));
  assert.throws(()=>verifyOriginalChart({...original,value:{...original.value,records:[{id:'duplicate'},{id:'duplicate'}]}},e.EMR_ACCEPTANCE_CHART_ID,3));
  console.log('11 original-form opt-in and fresh chart guards passed; no hosted requests performed.');
  // Password sign-in and TOTP also create authentication state. Even a read-only
  // chart preflight must not authenticate before exact deployment isolation approval.
  assert.throws(()=>verifyIsolationApproval(e));
  assert.doesNotThrow(()=>verifyIsolationApproval(write));
  for(const [key,value] of [['EMR_ACCEPTANCE_DEPLOYMENT_ID','dpl_other'],['EMR_ACCEPTANCE_EXPECTED_SHA','b'.repeat(40)],['EMR_ACCEPTANCE_APPROVED_PROJECT_REF','zyxwvutsrqponmlkjihg']]) {
    assert.throws(()=>verifyIsolationApproval({...write,[key]:value}));
  }
  console.log('5 mandatory hosted authentication isolation guards passed; no hosted requests performed.');
  const patient={...write,EMR_ACCEPTANCE_PATIENT_ISOLATION:'true',EMR_ACCEPTANCE_PATIENT_EMAIL:'emr-acceptance-patient-other@example.com',EMR_ACCEPTANCE_PATIENT_PASSWORD:'fixture-patient',EMR_ACCEPTANCE_PATIENT_ACCOUNT_ID:'00000000-0000-4000-8000-000000000003'};
  assert.equal(patientIsolationConfig(e),null);
  assert.equal(patientIsolationConfig({...patient,EMR_ACCEPTANCE_PATIENT_ISOLATION:'false'}),null);
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_PATIENT_ISOLATION:'yes'}));
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_ISOLATION_APPROVAL:undefined}));
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_PATIENT_EMAIL:'real@example.com'}));
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_CLINICIAN_EMAIL:patient.EMR_ACCEPTANCE_PATIENT_EMAIL}));
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_PATIENT_PASSWORD:''}));
  const second=patientIsolationConfig(patient);
  assert.deepEqual(second,{email:patient.EMR_ACCEPTANCE_PATIENT_EMAIL,password:patient.EMR_ACCEPTANCE_PATIENT_PASSWORD,account:patient.EMR_ACCEPTANCE_PATIENT_ACCOUNT_ID,source:patient.EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID});
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_PATIENT_ACCOUNT_ID:undefined}));
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID:undefined}));
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_PATIENT_ACCOUNT_ID:patient.EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID}));
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_PATIENT_ACCOUNT_ID:patient.EMR_ACCEPTANCE_CHART_ID}));
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID:patient.EMR_ACCEPTANCE_CHART_ID}));
  assert.doesNotThrow(()=>verifyPatientAuth({id:second.account,email:second.email},second));
  assert.throws(()=>verifyPatientAuth({id:second.source,email:second.email},second));
  assert.throws(()=>verifyPatientAuth({id:second.account,email:'different@example.com'},second));
  assert.doesNotThrow(()=>verifyPatientRows([{patient_id:second.account}],[],second));
  assert.throws(()=>verifyPatientRows([],[],second));
  assert.throws(()=>verifyPatientRows([{patient_id:second.source}],[],second));
  assert.throws(()=>verifyPatientRows([{patient_id:second.account}],[{patient_id:second.source}],second));
  const target={linked:true,patientId:e.EMR_ACCEPTANCE_CHART_ID,source:{accountId:second.source,status:'submitted',version:2}};
  const verifyTarget=t=>verifyIsolationTarget(t,second,e.EMR_ACCEPTANCE_CHART_ID,2);
  assert.doesNotThrow(()=>verifyTarget(target));
  assert.throws(()=>verifyTarget({...target,linked:false}));
  assert.throws(()=>verifyTarget({...target,patientId:second.account}));
  assert.throws(()=>verifyTarget({...target,source:{...target.source,accountId:second.account}}));
  assert.throws(()=>verifyTarget({...target,source:{...target.source,status:'draft'}}));
  assert.throws(()=>verifyTarget({...target,source:{...target.source,version:3}}));
  console.log('26 separate fictional patient identity, verified linked target and RLS guard checks passed; no hosted requests performed.');
  const sourceApproval={...e,EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION:'22',EMR_ACCEPTANCE_SOURCE_SUBMIT:'true',EMR_ACCEPTANCE_SOURCE_EMAIL:'emr-acceptance-source-fixture@example.com',EMR_ACCEPTANCE_SOURCE_PASSWORD:'fictional',EMR_ACCEPTANCE_ISOLATION_APPROVAL:e.EMR_ACCEPTANCE_DEPLOYMENT_ID+':'+e.EMR_ACCEPTANCE_EXPECTED_SHA+':'+ref};
  const sourceFixture={account:'00000000-0000-4000-8000-000000000009',marker:'FICTIONAL-EMR-ACCEPTANCE-'+'a'.repeat(32)};
  assert.equal(sourceSubmissionConfig(e,null,null),null);
  assert.equal(sourceSubmissionConfig({...sourceApproval,EMR_ACCEPTANCE_SOURCE_SUBMIT:'false'},null,null),null);
  assert.equal(sourceSubmissionConfig(sourceApproval,sourceFixture,null).account,sourceFixture.account);
  for(const [key,value] of [['EMR_ACCEPTANCE_SOURCE_SUBMIT','yes'],['EMR_ACCEPTANCE_SOURCE_EMAIL','real@example.com'],['EMR_ACCEPTANCE_SOURCE_PASSWORD',''],['EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION','21'],['EMR_ACCEPTANCE_ISOLATION_APPROVAL','wrong']])assert.throws(()=>sourceSubmissionConfig({...sourceApproval,[key]:value},sourceFixture,null));
  assert.throws(()=>sourceSubmissionConfig(sourceApproval,null,null));
  assert.throws(()=>sourceSubmissionConfig(sourceApproval,sourceFixture,{account:sourceFixture.account,email:'other@example.com'}));
  assert.throws(()=>sourceSubmissionConfig(sourceApproval,sourceFixture,{account:'different',email:sourceApproval.EMR_ACCEPTANCE_SOURCE_EMAIL}));
  console.log('11 hosted source submission opt-in, fixture and isolation checks passed; no hosted requests performed.');

  const recurringEnv={...write,EMR_ACCEPTANCE_RECURRING_BOOKING:'true',EMR_ACCEPTANCE_SCHEDULE_MARKER:'FICTIONAL-EMR-SCHEDULE-'+'b'.repeat(32),EMR_ACCEPTANCE_SCHEDULE_FIRST_DATE:'2027-01-05',EMR_ACCEPTANCE_SCHEDULE_TIME:'10:00'};
  assert.equal(recurringBookingConfig(e),null);
  assert.equal(recurringBookingConfig({...recurringEnv,EMR_ACCEPTANCE_RECURRING_BOOKING:'false'}),null);
  const booking=recurringBookingConfig(recurringEnv);
  assert.equal(booking.through,'2027-01-12');
  for(const [key,value] of [['EMR_ACCEPTANCE_RECURRING_BOOKING','yes'],['EMR_ACCEPTANCE_ISOLATION_APPROVAL','wrong'],['EMR_ACCEPTANCE_SCHEDULE_MARKER','Patient'],['EMR_ACCEPTANCE_SCHEDULE_FIRST_DATE','2027-02-30'],['EMR_ACCEPTANCE_SCHEDULE_FIRST_DATE','2027-01-28'],['EMR_ACCEPTANCE_SCHEDULE_TIME','25:00']])assert.throws(()=>recurringBookingConfig({...recurringEnv,[key]:value}));
  const rows=['2027-01-05','2027-01-12'].map((date,i)=>({id:'00000000-0000-4000-8000-00000000000'+(i+1),series_id:'00000000-0000-4000-8000-000000000003',patient_id:null,patient_name:booking.marker,status:'booked',starts_at:date+'T16:00:00Z',ends_at:date+'T16:50:00Z'}));
  assert.doesNotThrow(()=>verifyRecurringRows(rows,booking,'America/Chicago',50));
  assert.throws(()=>verifyRecurringRows(rows.slice(0,1),booking,'America/Chicago',50));
  for(const [key,value] of [['patient_id',rows[0].id],['patient_name','wrong'],['series_id',rows[0].id],['status','cancelled'],['starts_at','2027-01-12T17:00:00Z'],['ends_at','2027-01-12T16:45:00Z']])assert.throws(()=>verifyRecurringRows([rows[0],{...rows[1],[key]:value}],booking,'America/Chicago',50));
  console.log('17 isolated recurring booking configuration and database receipt guards passed; no hosted requests performed.');
  assert.throws(()=>recurringBookingConfig({...recurringEnv,EMR_ACCEPTANCE_SCHEDULE_EDIT_TIME:'10:00'}));
  assert.throws(()=>recurringBookingConfig({...recurringEnv,EMR_ACCEPTANCE_SCHEDULE_EDIT_TIME:'25:00'}));
  const editFixture=recurringBookingConfig({...recurringEnv,EMR_ACCEPTANCE_SCHEDULE_EDIT_TIME:'11:00'});
  assert.equal(editFixture.editTime,'11:00');
  const originals=rows.map(row=>({...row,status:'cancelled'}));
  const moved=rows.map((row,i)=>({...row,id:'00000000-0000-4000-8000-00000000000'+(i+4),starts_at:row.starts_at.replace('T16:','T17:'),ends_at:row.ends_at.replace('T16:','T17:')}));
  const shifted=[...originals,...moved];
  assert.deepEqual(verifyShiftedRows(rows,shifted,editFixture,'America/Chicago',50),moved);
  assert.throws(()=>verifyShiftedRows(rows,shifted.slice(1),editFixture,'America/Chicago',50));
  assert.throws(()=>verifyShiftedRows(rows,[{...originals[0],patient_name:'wrong'},originals[1],...moved],editFixture,'America/Chicago',50));
  assert.throws(()=>verifyShiftedRows(rows,[...originals,...moved.map(row=>({...row,series_id:'00000000-0000-4000-8000-000000000009'}))],editFixture,'America/Chicago',50));
  assert.throws(()=>verifyShiftedRows(rows,[...originals,{...moved[0],starts_at:rows[0].starts_at},moved[1]],editFixture,'America/Chicago',50));
  const cancelled=shifted.map(row=>row.id===moved[0].id?{...row,status:'cancelled'}:row);
  assert.doesNotThrow(()=>verifySingleCancellation(shifted,cancelled,moved[0].id));
  assert.throws(()=>verifySingleCancellation(shifted,cancelled,moved[1].id));
  assert.throws(()=>verifySingleCancellation(shifted,cancelled.slice(1),moved[0].id));
  assert.throws(()=>verifySingleCancellation(shifted,cancelled.map(row=>({...row,status:'cancelled'})),moved[0].id));
  console.log('12 hosted recurrence edit and cancellation history guards passed; no hosted requests performed.');
  const linkedEnv={...recurringEnv,EMR_ACCEPTANCE_SCHEDULE_EDIT_TIME:'11:00',EMR_ACCEPTANCE_SCHEDULE_LINKED_TIME:'14:00',EMR_ACCEPTANCE_SCHEDULE_LINKED_NAME:'FICTIONAL-EMR-PATIENT-'+'e'.repeat(32),EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID:write.EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID};
  const linkedBooking=recurringBookingConfig(linkedEnv);
  for(const [key,value] of [['EMR_ACCEPTANCE_SCHEDULE_EDIT_TIME',undefined],['EMR_ACCEPTANCE_SCHEDULE_LINKED_TIME','11:00'],['EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID',e.EMR_ACCEPTANCE_CHART_ID],['EMR_ACCEPTANCE_SCHEDULE_LINKED_NAME','actual patient']])assert.throws(()=>recurringBookingConfig({...linkedEnv,[key]:value}));
  const linkedRow={id:'00000000-0000-4000-8000-000000000010',patient_id:linkedBooking.linked.account,patient_name:null,series_id:null,status:'booked',starts_at:'2027-01-05T20:00:00Z',ends_at:'2027-01-05T20:50:00Z'};
  const linkedRows=[...cancelled,linkedRow];
  assert.doesNotThrow(()=>verifyLinkedBooking(cancelled,linkedRows,linkedBooking,'America/Chicago',50));
  for(const [key,value] of [['patient_id',linkedBooking.linked.chart],['patient_name',linkedBooking.linked.name],['series_id',rows[0].series_id],['status','cancelled'],['starts_at','2027-01-05T21:00:00Z'],['ends_at','2027-01-05T20:45:00Z']])assert.throws(()=>verifyLinkedBooking(cancelled,[...cancelled,{...linkedRow,[key]:value}],linkedBooking,'America/Chicago',50));
  assert.throws(()=>verifyLinkedBooking(cancelled,[...cancelled.slice(1),linkedRow],linkedBooking,'America/Chicago',50));
  assert.throws(()=>verifyLinkedBooking(cancelled,[{...cancelled[0],patient_name:'changed'},...cancelled.slice(1),linkedRow],linkedBooking,'America/Chicago',50));
  console.log('13 hosted linked-account appointment guards passed; no hosted requests performed.');
  const cseqEnv={...write,EMR_ACCEPTANCE_CSEQ:'true',EMR_ACCEPTANCE_CSEQ_ID:'00000000-0000-4000-8000-000000000011',EMR_ACCEPTANCE_CSEQ_HASH:'a'.repeat(64)};
  const cseqRecipient={account:write.EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID,email:'emr-acceptance-source-fixture@example.com',password:'fictional'};
  assert.equal(cseqConfig(e,null),null);
  assert.throws(()=>cseqConfig(cseqEnv,null));
  const cseq=cseqConfig(cseqEnv,cseqRecipient);
  for(const [key,value] of [['EMR_ACCEPTANCE_CSEQ','yes'],['EMR_ACCEPTANCE_CSEQ_ID',cseq.chart],['EMR_ACCEPTANCE_CSEQ_ID',cseq.recipient.account],['EMR_ACCEPTANCE_CSEQ_HASH','wrong'],['EMR_ACCEPTANCE_ISOLATION_APPROVAL','wrong']])assert.throws(()=>cseqConfig({...cseqEnv,[key]:value},cseqRecipient));
  const now=Date.parse('2026-11-27T12:00:00Z'),a={id:cseq.id,patient_id:cseq.chart,recipient_email:cseq.recipient.email,test_key:'cseq',connected_source_hash:cseq.hash,status:'sent',sent_at:'2026-11-26T12:00:00Z',expires_at:'2026-12-10T12:00:00Z'};
  assert.doesNotThrow(()=>verifyCseqAssignment(a,cseq,now));
  for(const [key,value] of [['id',cseq.chart],['patient_id',cseq.id],['recipient_email','wrong@example.com'],['test_key','asq'],['connected_source_hash','b'.repeat(64)],['status','draft'],['sent_at','invalid'],['expires_at','2026-11-27T11:00:00Z']])assert.throws(()=>verifyCseqAssignment({...a,[key]:value},cseq,now));
  console.log('16 hosted existing CSEQ fixture and invitation guards passed; no hosted requests performed.');
  const fullPlan={writeFixture:{},originalWrite:true,patientFixture:{},sourceFixture:cseqRecipient,recurringFixture:linkedBooking,cseqFixture:cseq};
  assert.doesNotThrow(()=>verifyFullHostedPlan(fullPlan));
  for(const key of ['writeFixture','originalWrite','patientFixture','sourceFixture','recurringFixture','cseqFixture'])
    assert.throws(()=>verifyFullHostedPlan({...fullPlan,[key]:null}));
  assert.throws(()=>verifyFullHostedPlan({...fullPlan,recurringFixture:{...linkedBooking,editTime:undefined}}));
  assert.throws(()=>verifyFullHostedPlan({...fullPlan,recurringFixture:{...linkedBooking,linked:undefined}}));
  assert.throws(()=>verifyFullHostedPlan({...fullPlan,sourceFixture:{...cseqRecipient,account:'different'}}));
  assert.throws(()=>verifyFullHostedPlan({...fullPlan,cseqFixture:{...cseq,chart:'different'}}));
  console.log('11 full hosted run completeness guards passed; no hosted requests performed.');

} else {
  const e=process.env,{origin,database}=config(e),writeFixture=reviewWriteConfig(e),originalWrite=originalWriteConfig(e,writeFixture);
  // Fail before external requests, including authentication/session creation,
  // unless server-side isolation was independently confirmed for this revision.
  verifyIsolationApproval(e);
  const patientFixture=patientIsolationConfig(e);
  const sourceFixture=sourceSubmissionConfig(e,writeFixture,patientFixture);
  const recurringFixture=recurringBookingConfig(e);
  const cseqFixture=cseqConfig(e,sourceFixture);
  const full=process.argv.includes('--full');
  if(full)verifyFullHostedPlan({writeFixture,originalWrite,patientFixture,sourceFixture,recurringFixture,cseqFixture});
  assert.ok(e.EMR_ACCEPTANCE_VERCEL_TOKEN,'Read-only Vercel API access required');
  const deploymentResponse=await fetch('https://api.vercel.com/v13/deployments/'+e.EMR_ACCEPTANCE_DEPLOYMENT_ID+'?slug=ken-morris-projects',{headers:{Authorization:'Bearer '+e.EMR_ACCEPTANCE_VERCEL_TOKEN},redirect:'error'});
  assert.equal(deploymentResponse.status,200,'Deployment metadata unavailable');
  const deployment=await deploymentResponse.json();
  assert.ok(deployment.id===e.EMR_ACCEPTANCE_DEPLOYMENT_ID && deployment.target===null && deployment.readyState==='READY' && deployment.url===new URL(origin).hostname && deployment.meta?.githubCommitRef==='integration/emr-prototype-production-reconcile-20261109' && deployment.meta?.githubCommitSha===e.EMR_ACCEPTANCE_EXPECTED_SHA,'Expected READY immutable integration preview required');
  // The operator must independently verify this exact deployment's public AND
  // server-side Supabase configuration and run the hosted schema preflights
  // before providing fixture credentials. No service-role key is required.
  const {chromium}=await import(pathToFileURL(e.EMR_BROWSER_MODULE).href);
  const browser=await chromium.launch({headless:true});
  let stage='browser setup';
  try {
    // Apply identical origin restrictions to every independent actor context.
    const newRoutedContext=async()=>{
      const context=await browser.newContext({serviceWorkers:'block'});
      await context.route('**/*',async route=>{
        const target=new URL(route.request().url());
        if(![origin,database].includes(target.origin)) return route.abort();
        const response=await route.fetch({maxRedirects:0});
        const location=response.headers().location;
        if(location&&!([origin,database].includes(new URL(location,target).origin))) return route.abort();
        return route.fulfill({response});
      });
      return context;
    };
    const context=await newRoutedContext();
    const page=await context.newPage();page.setDefaultTimeout(30000);
    stage='immutable preview sign-in and anonymous denial';
    const login=await page.goto(origin+'/login?next=%2Fappointments');
    assert.equal(login.status(),200);
    assert.equal(new URL(page.url()).origin,origin);
    assert.equal(await page.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID,'Wrong preview deployment');
    // APIRequestContext bypasses browser routes; use in-page same-origin GETs.
    const bps='/api/emr/bps-intake?patient='+e.EMR_ACCEPTANCE_CHART_ID;
    const readStatus=()=>page.evaluate(async path=>(await fetch(path,{cache:'no-store',redirect:'error'})).status,bps);
    assert.equal(await readStatus(),403,'Anonymous BPS access must be denied');
    stage='fictional password sign-in and AAL1 denial';
    await page.getByLabel('Email',{exact:true}).fill(e.EMR_ACCEPTANCE_CLINICIAN_EMAIL);
    await page.getByLabel('Password',{exact:true}).fill(e.EMR_ACCEPTANCE_CLINICIAN_PASSWORD);
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.waitForURL(u=>u.origin===origin&&u.pathname==='/account/security');
    assert.equal(await readStatus(),403,'AAL1 clinical access must be denied');
    stage='fictional TOTP and scheduler entry';
    await page.getByRole('button',{name:'Verify with '+(e.EMR_ACCEPTANCE_TOTP_FACTOR_NAME||'Fictional acceptance TOTP'),exact:true}).click();
    await page.getByLabel('Six-digit authenticator code').fill(totp(e.EMR_ACCEPTANCE_TOTP_SECRET));
    await page.getByRole('button',{name:'Verify and continue'}).click();
    await page.waitForURL(u=>u.origin===origin&&u.pathname==='/appointments');
    await page.getByRole('heading',{name:'Appointment administration'}).waitFor();
    if(sourceFixture){
      stage='fresh linked fictional source precondition';
      const absent=await page.evaluate(async path=>{const r=await fetch(path,{cache:'no-store',redirect:'error'});return {status:r.status,body:await r.json()};},bps);
      assert.equal(absent.status,404,'Source submission requires a fresh linked chart without intake');
      assert.deepEqual(absent.body,{error:'No linked patient intake found.'});
      const sourceContext=await newRoutedContext();
      try{
        stage='fresh fictional source owner authentication';
        const patientPage=await sourceContext.newPage();patientPage.setDefaultTimeout(30000);
        await patientPage.goto(origin+'/patient/intake');
        await patientPage.waitForURL(u=>u.origin===origin&&u.pathname==='/login');
        assert.equal(await patientPage.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
        await patientPage.getByLabel('Email',{exact:true}).fill(sourceFixture.email);
        await patientPage.getByLabel('Password',{exact:true}).fill(sourceFixture.password);
        const [auth]=await Promise.all([
          patientPage.waitForResponse(r=>{const u=new URL(r.url());return u.origin===database&&u.pathname==='/auth/v1/token'&&u.searchParams.get('grant_type')==='password'&&r.request().method()==='POST';}),
          patientPage.getByRole('button',{name:'Sign in',exact:true}).click()
        ]);
        assert.equal(auth.status(),200);
        const session=await auth.json();
        verifyPatientAuth(session.user,sourceFixture);
        const key=(await auth.request().allHeaders()).apikey;
        assert.ok(typeof key==='string'&&key.length>0&&typeof session.access_token==='string'&&session.access_token.length>0);
        await patientPage.waitForURL(u=>u.origin===origin&&u.pathname==='/patient/intake');
        const verifyPage=async()=>{
          assert.equal(new URL(patientPage.url()).origin,origin);
          assert.equal(new URL(patientPage.url()).pathname,'/patient/intake');
          assert.equal(await patientPage.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
        };
        const readPatient=async()=>{
          const url=new URL('/rest/v1/patient_intakes',database);
          url.searchParams.set('select','patient_id,version,status,answers,completed_pages,submitted_at');
          url.searchParams.set('patient_id','eq.'+sourceFixture.account);
          const r=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+session.access_token},redirect:'error',cache:'no-store'});
          assert.equal(r.status,200);
          const rows=await r.json();
          assert.ok(Array.isArray(rows)&&rows.length<=1,'Fictional source scope must return at most one row');
          if(rows.length)assert.equal(rows[0].patient_id,sourceFixture.account);
          return rows[0]??null;
        };
        const verifyLinkedDraft=async()=>{
          const result=await page.evaluate(async path=>{const r=await fetch(path,{cache:'no-store',redirect:'error'});return {status:r.status,body:await r.json()};},bps);
          assert.equal(result.status,200);
          assert.equal(result.body.linked,true);
          assert.equal(result.body.patientId,e.EMR_ACCEPTANCE_CHART_ID.toLowerCase());
          assert.equal(result.body.source?.accountId,sourceFixture.account);
          assert.equal(result.body.source?.status,'draft');
          assert.equal(result.body.source?.version,1);
          assert.deepEqual(result.body.reviews,[]);
        };
        stage='fresh fictional source 21-page browser submission and readback';
        await submitHostedSource({patientPage,fixture:sourceFixture,readPatient,verifyPage,verifyLinkedDraft});
      }finally{await sourceContext.close();}
    }
    assert.equal(await readStatus(),200,'AAL2 fixture chart read must succeed');
    stage='metadata-only fixture identity and submission receipt';
    const receipt=await page.evaluate(async path=>{
      const response=await fetch(path+'&summary=1',{cache:'no-store',redirect:'error'});
      return {status:response.status,cacheControl:response.headers.get('cache-control'),body:await response.json()};
    },bps);
    assert.equal(receipt.status,200,'Protected fixture summary unavailable');
    assert.match(receipt.cacheControl??'',/\bprivate\b/i);
    assert.match(receipt.cacheControl??'',/\bno-store\b/i);
    verifySubmittedSummary(receipt.body,e.EMR_ACCEPTANCE_CHART_ID,Number(e.EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION),e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,e.EMR_ACCEPTANCE_EXPECTED_REVIEWED==='true');
    stage='read-only linked BPS rendering';
    const review=await page.goto(origin+'/emr/bps-intake?patient='+e.EMR_ACCEPTANCE_CHART_ID);
    assert.equal(review.status(),200);
    await page.getByText('Sections audited: 21/21',{exact:false}).waitFor();
    const links=page.getByRole('navigation',{name:'Original seven-page biopsychosocial forms'}).getByRole('link');
    const forms=verifyOriginalFormLinks(await links.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href'))),origin,e.EMR_ACCEPTANCE_CHART_ID);
    for(const {url,key,action} of forms){
      stage='read-only original BPS form '+key;
      const response=await page.goto(url);
      assert.equal(response.status(),200);
      assert.equal(new URL(page.url()).origin,origin);
      assert.equal(new URL(page.url()).pathname,'/emr/workspace');
      assert.equal(new URL(page.url()).searchParams.get('patient'),e.EMR_ACCEPTANCE_CHART_ID.toLowerCase());
      assert.equal(new URL(page.url()).searchParams.get('bps_page'),key);
      await page.locator('form[data-action="'+action+'"]').waitFor({state:'visible'});
      await page.locator('[data-bps-page="'+key+'"][aria-current="page"]').waitFor();
      assert.equal(await page.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
    }
    console.log('Hosted read-only preflight passed: real browser password/TOTP, AAL1 denial, AAL2 chart read, exact submitted fixture identity/version/receipt, appointment administration and all seven original BPS forms rendered for the exact chart.');
    const runPatientIsolation=async(label)=>{
      stage=label+': verify existing linked target using the separate clinician session';
      // A denial against a nonexistent or unrelated account is not isolation
      // evidence. Prove the target exists and is the same submitted linked source.
      const target=await page.evaluate(async path=>{
        const response=await fetch(path,{cache:'no-store',redirect:'error'});
        if(response.status!==200)return null;
        const body=await response.json();
        return {linked:body.linked,patientId:body.patientId,source:{accountId:body.source?.accountId,status:body.source?.status,version:body.source?.version}};
      },bps);
      verifyIsolationTarget(target,patientFixture,e.EMR_ACCEPTANCE_CHART_ID.toLowerCase(),Number(e.EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION));
      stage=label+': separate fictional patient sign-in and positive own intake access';
      const otherContext=await newRoutedContext();
      try{
        const other=await otherContext.newPage();other.setDefaultTimeout(30000);
        await other.goto(origin+'/patient/intake');
        await other.waitForURL(u=>u.origin===origin&&u.pathname==='/login');
        assert.equal(await other.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
        await other.getByLabel('Email',{exact:true}).fill(patientFixture.email);
        await other.getByLabel('Password',{exact:true}).fill(patientFixture.password);
        const [auth]=await Promise.all([
          other.waitForResponse(r=>{
            const u=new URL(r.url());
            return u.origin===database&&u.pathname==='/auth/v1/token'&&u.searchParams.get('grant_type')==='password'&&r.request().method()==='POST';
          }),
          other.getByRole('button',{name:'Sign in',exact:true}).click()
        ]);
        assert.equal(auth.status(),200,'Fictional patient authentication must succeed');
        const session=await auth.json();
        verifyPatientAuth(session.user,patientFixture);
        const key=(await auth.request().allHeaders()).apikey;
        assert.ok(typeof key==='string'&&key.length>0&&typeof session.access_token==='string'&&session.access_token.length>0,'Actual fictional patient session required');
        await other.waitForURL(u=>u.origin===origin&&u.pathname==='/patient/intake');
        await other.getByRole('tablist',{name:'Intake sections'}).waitFor({state:'visible'});
        assert.equal(await other.getByRole('tablist',{name:'Intake sections'}).getByRole('tab').count(),21);
        assert.equal(await other.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
        stage=label+': patient-authenticated database row-level isolation';
        // Independent read-only PostgREST probe using the actual patient JWT,
        // never a service-role credential. Select identity metadata only.
        const readPatientRows=async account=>{
          const url=new URL('/rest/v1/patient_intakes',database);
          url.searchParams.set('select','patient_id');
          url.searchParams.set('patient_id','eq.'+account);
          const response=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+session.access_token},redirect:'error',cache:'no-store'});
          assert.equal(response.status,200,'Patient-authenticated RLS probe must return a valid result');
          return response.json();
        };
        verifyPatientRows(await readPatientRows(patientFixture.account),await readPatientRows(patientFixture.source),patientFixture);
        stage=label+': authenticated patient denial of clinician chart and metadata';
        const denied=await other.evaluate(async path=>{
          const status=async p=>{
            const r=await fetch(p,{cache:'no-store',redirect:'error'});
            return {status:r.status,cache:r.headers.get('cache-control')};
          };
          return [await status(path),await status(path+'&summary=1')];
        },bps);
        for(const r of denied){
          assert.equal(r.status,403,'Authenticated patient must not access clinician source or receipt');
          assert.match(r.cache??'',/\bprivate\b/i);
          assert.match(r.cache??'',/\bno-store\b/i);
        }
        const blocked=await other.goto(origin+'/emr/bps-intake?patient='+e.EMR_ACCEPTANCE_CHART_ID);
        assert.equal(blocked.status(),200,'Patient denial must render the actual account page, not an error');
        assert.equal(new URL(other.url()).origin,origin);
        assert.equal(new URL(other.url()).pathname,'/account','Patient role must redirect to the account page');
        assert.equal(await other.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
        assert.equal(await other.locator('article[aria-label="Intake biopsychosocial reconciliation"]').count(),0);
        await other.goto(origin+'/patient/intake');
        await other.getByRole('tablist',{name:'Intake sections'}).waitFor({state:'visible'});
        assert.equal(await other.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
        assert.equal(await readStatus(),200,'Independent clinician session must remain authorized');
        console.log(label+': hosted patient isolation verified exact separate Auth identity, positive own intake row, cross-account RLS filtering, denied clinician chart and metadata, separate clinician session preserved.');
      }finally{await otherContext.close();}
    };
    if(patientFixture)await runPatientIsolation('Before clinical writes');
    else console.log('Separate hosted patient-role isolation not executed; fixture opt-in required.');
    if(writeFixture){
      stage='fictional linked review source and fresh-chart guard';
      await page.goto(origin+'/emr/bps-intake?patient='+e.EMR_ACCEPTANCE_CHART_ID);
      assert.equal(await page.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
      const read=async path=>page.evaluate(async p=>{
        const r=await fetch(p,{cache:'no-store',redirect:'error'});
        return {status:r.status,cache:r.headers.get('cache-control'),body:await r.json()};
      },path);
      const before=await read(bps);
      assert.equal(before.status,200);
      assert.match(before.cache??'',/\bprivate\b/i);
      assert.match(before.cache??'',/\bno-store\b/i);
      verifyFreshReviewFixture(before.body,e,writeFixture);
      await page.getByText('Submitted intake (immutable source)',{exact:true}).waitFor();
      await page.getByText(writeFixture.marker,{exact:true}).waitFor({state:'attached'});
      const chart={id:e.EMR_ACCEPTANCE_CHART_ID.toLowerCase()};
      const workflowUrl=origin+'/api/emr/workflow';
      // This POST envelope is the authenticated workflow transport for a logical GET.
      // Keep all requests inside the routed browser session, never an APIRequestContext.
      const readChart=async()=>{
        const response=await page.evaluate(async ({chartId})=>{
          const r=await fetch('/api/emr/workflow',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',redirect:'error',body:JSON.stringify({path:'/api/chart?patient='+chartId,method:'GET',body:null,patientId:chartId,expectedRevision:0})});
          return {status:r.status,cache:r.headers.get('cache-control'),body:await r.json()};
        },{chartId:chart.id});
        assert.equal(response.status,200,'Independent original chart read');
        assert.match(response.cache??'',/\bprivate\b/i);
        assert.match(response.cache??'',/\bno-store\b/i);
        verifyOriginalChart(response.body,chart.id);
        return response.body;
      };
      let originalRevision;
      if(originalWrite){
        stage='fresh isolated original-form chart precondition';
        const fresh=await readChart();
        verifyOriginalChart(fresh,chart.id,undefined,true);
        originalRevision=fresh.revision;
      }
      stage='fictional clinician review through rendered UI';
      const note='Fictional isolated acceptance observation '+writeFixture.marker;
      const prepare=page.getByRole('button',{name:'Prepare clinician-reviewed BPS intake draft'});
      await prepare.click();
      const save=page.getByRole('button',{name:'Save reviewed BPS history snapshot'});
      assert.ok(await save.isDisabled());
      const fields=page.locator('article[aria-label="Intake biopsychosocial reconciliation"] form textarea');
      assert.equal(await fields.count(),7);
      await fields.first().fill(note);
      await page.getByRole('checkbox',{name:/I reviewed this intake/i}).check();
      assert.ok(await save.isEnabled());
      const [response]=await Promise.all([page.waitForResponse(r=>r.url()===origin+'/api/emr/bps-intake'&&r.request().method()==='POST'),save.click()]);
      assert.equal(response.status(),201);
      const saved=await response.json();
      assert.equal(saved.saved,true);assert.equal(saved.unsigned,true);assert.equal(saved.diagnosisCreated,false);
      assert.match(saved.id,/^[a-f0-9-]{36}$/);
      await page.getByText('snapshot saved AND independently verified',{exact:false}).waitFor();
      stage='fictional review independent protected GET and browser reopen';
      const after=await read(bps);
      assert.equal(after.status,200);
      assert.equal(after.body.patientId,e.EMR_ACCEPTANCE_CHART_ID.toLowerCase());
      assert.deepEqual(after.body.source,before.body.source,'Immutable source changed during review');
      assert.equal(after.body.reviews.length,1);
      const review=after.body.reviews[0];
      assert.equal(review.id,saved.id);
      assert.equal(review.source_version,Number(e.EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION));
      assert.equal(review.source_status,'submitted');
      assert.equal(review.clinician_note_domains_complete,true);
      assert.equal(review.current_source_snapshot_verified,true);
      assert.deepEqual(review.clinician_notes,{presenting:note,treatment:'',medical:'',safety:'',family:'',goals:'',limitations:''});
      assert.equal(review.clinical_answers.counseling_reason,writeFixture.marker);
      const summary=await read(bps+'&summary=1');
      assert.equal(summary.status,200);
      verifySubmittedSummary(summary.body,e.EMR_ACCEPTANCE_CHART_ID,Number(e.EMR_ACCEPTANCE_EXPECTED_SOURCE_VERSION),e.EMR_ACCEPTANCE_EXPECTED_PACKET_VERSION,true);
      await page.reload();
      await page.getByText('Sections audited: 21/21',{exact:false}).waitFor();
      await page.locator('summary').filter({hasText:'Previously saved immutable clinician reviews (1)'}).click();
      await page.getByText(note,{exact:true}).waitFor();
      assert.equal(await prepare.count(),0);
      console.log('Hosted fictional unsigned clinician review saved through UI, independently read back and reopened.');
      if(originalWrite){
        for(const {url,key:subpage,action} of forms){
          stage='fictional original BPS write '+subpage;
          const opened=await page.goto(url);
          assert.equal(opened.status(),200);
          assert.equal(page.url(),url);
          assert.equal(await page.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
          await page.locator('form[data-action="'+action+'"]').waitFor({state:'visible'});
          await page.locator('[data-bps-page="'+subpage+'"][aria-current="page"]').waitFor();
          const before=await readChart();
          verifyOriginalChart(before,chart.id,originalRevision);
          const form=page.locator('form[data-action="'+action+'"]');
          const marker=subpage==='medications'?'sertraline 50 MG Oral Tablet [Zoloft]':writeFixture.marker+' original '+subpage;
          let verifyRecord, verifyReopened;
          if(subpage==='symptoms'){
            const choice=form.locator('input[type="checkbox"]').first();
            const key=await choice.getAttribute('name'), value=await choice.getAttribute('value');
            assert.ok(key&&value);
            await choice.check();
            verifyRecord=record=>assert.equal(record.ratings[key],value);
            verifyReopened=async()=>assert.ok(await page.locator('form[data-action="'+action+'"] input[type="checkbox"]').first().isChecked());
          }else if(subpage==='treatment_history'){
            await form.locator('select[name="setting"]').selectOption('Outpatient');
            await form.locator('textarea[name="reason"]').fill(marker);
            verifyRecord=record=>{assert.equal(record.setting,'Outpatient');assert.equal(record.reason,marker);};
            verifyReopened=async()=>{
              const entry=page.locator('article.record').filter({hasText:marker}).filter({has:page.locator('[data-edit-treatment-history]')});
              await entry.waitFor({state:'visible'});
              await entry.locator('[data-edit-treatment-history]').click();
              assert.equal(await page.locator('form[data-action="'+action+'"] textarea[name="reason"]').inputValue(),marker);
            };
          }else if(subpage==='medications'){
            const lookup=form.getByRole('button',{name:'Search medication catalog',exact:true});
            const medication=form.locator('input[name="medication"]');
            const dosage=form.locator('input[name="dosage"]');
            assert.equal(await lookup.getAttribute('aria-expanded'),'false');
            await lookup.click();
            await form.getByText('Enter at least two letters of a brand or generic name to search.',{exact:true}).waitFor();
            assert.equal(await lookup.getAttribute('aria-expanded'),'true');
            await lookup.click();
            assert.equal(await lookup.getAttribute('aria-expanded'),'false');
            await dosage.fill(writeFixture.marker+' amount');
            await medication.fill('Zoloft');
            await form.getByRole('button',{name:'sertraline 100 MG Oral Tablet [Zoloft]',exact:true}).waitFor();
            await form.getByRole('button',{name:marker,exact:true}).click();
            assert.equal(await medication.inputValue(),marker);
            assert.equal(await dosage.inputValue(),writeFixture.marker+' amount');
            assert.equal(await lookup.getAttribute('aria-expanded'),'false');
            console.log('Original BPS medication catalog: visible lookup, multiple strengths and unchanged reported amount verified.');
            verifyRecord=record=>{assert.equal(record.medication,marker);assert.equal(record.dosage,writeFixture.marker+' amount');};
            verifyReopened=async()=>{
              const entry=page.locator('article.record').filter({hasText:marker}).filter({has:page.locator('[data-edit-medication]')});
              await entry.waitFor({state:'visible'});
              await entry.locator('[data-edit-medication]').click();
              assert.equal(await page.locator('form[data-action="'+action+'"] input[name="medication"]').inputValue(),marker);
              assert.equal(await page.locator('form[data-action="'+action+'"] input[name="dosage"]').inputValue(),writeFixture.marker+' amount');
            };
          }else{
            const details=form.locator('details').filter({has:page.locator('textarea')}).first();
            if(!(await details.getAttribute('open')!==null))await details.locator('summary').click();
            const field=details.locator('textarea').first();
            const key=await field.getAttribute('name');
            assert.ok(key,'Original clinical note must have a persisted field name');
            await field.fill(marker);
            verifyRecord=record=>assert.equal(record.notes[key],marker);
            verifyReopened=async()=>{
              const reopenedForm=page.locator('form[data-action="'+action+'"]');
              const reopenedField=reopenedForm.locator('textarea[name="'+key+'"]');
              await reopenedField.waitFor({state:'attached'});
              assert.equal(await reopenedField.inputValue(),marker);
            };
          }
          const [formSave]=await Promise.all([
            page.waitForResponse(r=>{
              if(r.url()!==workflowUrl||r.request().method()!=='POST')return false;
              try{const p=r.request().postDataJSON();return p.path==='/api/save'&&p.body?.action===action;}catch{return false;}
            }),
            form.locator('button[type="submit"]').click()
          ]);
          assert.equal(formSave.status(),200,'Original form save: '+subpage);
          const receipt=await formSave.json();
          assert.equal(receipt.revision,before.revision+1,'Exactly one original-form revision advanced');
          // Wait for the actual save handler to finish its chart reload.
          // production.js translates the prototype's local-save text to the central-record acknowledgement.
          await page.locator('#status').filter({hasText:'Saved '+action+' to the central patient record. The immutable snapshot is available in record history.'}).waitFor();
          const after=await readChart();
          verifyOriginalChart(after,chart.id,receipt.revision);
          originalRevision=after.revision;
          const previousIds=new Set(before.value.records.map(r=>r.id));
          const newRecords=after.value.records.filter(r=>!previousIds.has(r.id));
          assert.equal(newRecords.length,1,'Exactly one new original-form record');
          assert.equal(newRecords[0].kind,action);
          verifyRecord(newRecords[0]);
          for(const old of before.value.records)assert.deepEqual(after.value.records.find(r=>r.id===old.id),old,'Previous records remain immutable');
          await page.reload();
          await page.locator('form[data-action="'+action+'"]').waitFor({state:'visible'});
          assert.equal(new URL(page.url()).searchParams.get('patient'),chart.id);
          assert.equal(await page.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
          await verifyReopened();
          console.log('Hosted original BPS form saved, independently read back and reopened: '+subpage);
        }
      
        stage='original forms immutable linked source recheck';
        const finalSource=await read(bps);
        assert.equal(finalSource.status,200);
        assert.deepEqual(finalSource.body.source,after.body.source);
        assert.deepEqual(finalSource.body.reviews,after.body.reviews);
        console.log('Hosted seven original forms saved and reopened; linked questionnaire and clinician snapshot unchanged. No bookings or invitations performed.');
      }else console.log('No original-form writes, bookings or invitations performed.');
    }else console.log('No clinical writes, bookings or invitations performed.');
    if(patientFixture&&writeFixture)await runPatientIsolation('After clinical writes and readback');
    if(recurringFixture){
      stage='isolated recurring booking and calendar readback';
      await exerciseRecurringBooking({page,origin,database,e,fixture:recurringFixture});
    }
    if(cseqFixture){
      stage='isolated existing fictional CSEQ recipient and clinical report';
      await exerciseHostedCseq({page,context,newRoutedContext,origin,database,e,fixture:cseqFixture});
    }
  } catch {
    throw new Error('Hosted preflight failed at '+stage+'; browser error details suppressed to protect credentials and clinical content.');
  } finally {await browser.close();}
  // This only attests to the hosted browser stages; independent hosted schema
  // evidence and subsequent production verification remain separate release gates.
  if(full)console.log('FULL HOSTED BROWSER ACCEPTANCE PASSED '+e.EMR_ACCEPTANCE_EXPECTED_SHA+' '+e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
  else console.log('PARTIAL HOSTED PREFLIGHT ONLY: not full browser acceptance or production release authorization.');
}
