// Hosted read-only authentication preflight. Never run against production,
// the obsolete validation branch, or a project belonging to another app.
// This is not the full clinical write/booking/assessment acceptance suite.
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
} else {
  const e=process.env,{origin,database}=config(e);
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
    console.log('Hosted read-only preflight passed: real browser password/TOTP, AAL1 denial, AAL2 chart read, exact submitted fixture identity/version/receipt, appointment administration and all seven original BPS forms rendered for the exact chart. No clinical writes, bookings, or invitations performed.');
  } catch {
    throw new Error('Hosted preflight failed at '+stage+'; browser error details suppressed to protect credentials and clinical content.');
  } finally {await browser.close();}
}
