// Hosted authentication preflight; optional fictional review write is separately gated.
// Never run against production,
// the obsolete validation branch, or a project belonging to another app.
// This is not the full patient intake/original-form write/booking/assessment suite.
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
function reviewWriteConfig(e) {
  if(e.EMR_ACCEPTANCE_REVIEW_WRITE===undefined||e.EMR_ACCEPTANCE_REVIEW_WRITE==='false') return null;
  assert.equal(e.EMR_ACCEPTANCE_REVIEW_WRITE,'true');
  assert.equal(e.EMR_ACCEPTANCE_EXPECTED_REVIEWED,'false','A fresh unreviewed fictional source is required');
  assert.equal(e.EMR_ACCEPTANCE_ISOLATION_APPROVAL,
    e.EMR_ACCEPTANCE_DEPLOYMENT_ID+':'+e.EMR_ACCEPTANCE_EXPECTED_SHA+':'+e.EMR_ACCEPTANCE_APPROVED_PROJECT_REF,
    'Independent server/database isolation approval for the exact revision required');
  assert.match(e.EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.notEqual(e.EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID,e.EMR_ACCEPTANCE_CHART_ID.toLowerCase());
  assert.match(e.EMR_ACCEPTANCE_FIXTURE_MARKER,/^FICTIONAL-EMR-ACCEPTANCE-[a-f0-9]{32}$/);
  return {account:e.EMR_ACCEPTANCE_SOURCE_ACCOUNT_ID,marker:e.EMR_ACCEPTANCE_FIXTURE_MARKER};
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
  assert.ok(JSON.stringify(data.sections).includes(fixture.marker),'Fictional marker missing from linked source');
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
  const full={patientId:e.EMR_ACCEPTANCE_CHART_ID,linked:true,source:{accountId:fixture.account,status:'submitted',version:2,questionnairePacketVersion:'fixture-v1'},sections:Array.from({length:21},(_,i)=>({value:i===0?fixture.marker:''})),unmappedKeys:[],reviews:[]};
  assert.doesNotThrow(()=>verifyFreshReviewFixture(full,write,fixture));
  assert.throws(()=>verifyFreshReviewFixture({...full,reviews:[{}]},write,fixture));
  assert.throws(()=>verifyFreshReviewFixture({...full,source:{...full.source,accountId:'wrong'}},write,fixture));
  assert.throws(()=>verifyFreshReviewFixture({...full,sections:full.sections.map(()=>({value:''}))},write,fixture));
  console.log('9 opt-in fictional review write safety checks passed; no hosted requests performed.');
} else {
  const e=process.env,{origin,database}=config(e),writeFixture=reviewWriteConfig(e);
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
    const context=await browser.newContext({serviceWorkers:'block'});
    // Reject non-allowlisted requests and redirects; do not send a Vercel token
    // or protection-bypass credential through the browser.
    await context.route('**/*',async route=>{
      const target=new URL(route.request().url());
      if(![origin,database].includes(target.origin)) return route.abort();
      const response=await route.fetch({maxRedirects:0});
      const location=response.headers().location;
      if(location&&!([origin,database].includes(new URL(location,target).origin))) return route.abort();
      return route.fulfill({response});
    });
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
      console.log('Hosted fictional unsigned clinician review saved through UI, independently read back and reopened. No original-form writes, bookings or invitations performed.');
    }else console.log('No clinical writes, bookings or invitations performed.');
  } catch {
    throw new Error('Hosted preflight failed at '+stage+'; browser error details suppressed to protect credentials and clinical content.');
  } finally {await browser.close();}
}
