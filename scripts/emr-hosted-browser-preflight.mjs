// Hosted authentication preflight; optional fictional review write is separately gated.
// Never run against production,
// the obsolete validation branch, or a project belonging to another app.
// Optional original-form writes require a fresh isolated fictional chart.
// This is not the full patient intake/booking/assessment suite.
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
  return {email:e.EMR_ACCEPTANCE_PATIENT_EMAIL,password:e.EMR_ACCEPTANCE_PATIENT_PASSWORD};
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
  const patient={...write,EMR_ACCEPTANCE_PATIENT_ISOLATION:'true',EMR_ACCEPTANCE_PATIENT_EMAIL:'emr-acceptance-patient-other@example.com',EMR_ACCEPTANCE_PATIENT_PASSWORD:'fixture-patient'};
  assert.equal(patientIsolationConfig(e),null);
  assert.equal(patientIsolationConfig({...patient,EMR_ACCEPTANCE_PATIENT_ISOLATION:'false'}),null);
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_PATIENT_ISOLATION:'yes'}));
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_ISOLATION_APPROVAL:undefined}));
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_PATIENT_EMAIL:'real@example.com'}));
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_CLINICIAN_EMAIL:patient.EMR_ACCEPTANCE_PATIENT_EMAIL}));
  assert.throws(()=>patientIsolationConfig({...patient,EMR_ACCEPTANCE_PATIENT_PASSWORD:''}));
  assert.deepEqual(patientIsolationConfig(patient),{email:patient.EMR_ACCEPTANCE_PATIENT_EMAIL,password:patient.EMR_ACCEPTANCE_PATIENT_PASSWORD});
  console.log('8 separate fictional patient isolation configuration checks passed; no hosted requests performed.');
} else {
  const e=process.env,{origin,database}=config(e),writeFixture=reviewWriteConfig(e),originalWrite=originalWriteConfig(e,writeFixture);
  // Fail before external requests, including authentication/session creation,
  // unless server-side isolation was independently confirmed for this revision.
  verifyIsolationApproval(e);
  const patientFixture=patientIsolationConfig(e);
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
    if(patientFixture){
      stage='separate fictional patient sign-in and positive own intake access';
      const otherContext=await newRoutedContext();
      try{
        const other=await otherContext.newPage();other.setDefaultTimeout(30000);
        await other.goto(origin+'/patient/intake');
        await other.waitForURL(u=>u.origin===origin&&u.pathname==='/login');
        assert.equal(await other.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
        await other.getByLabel('Email',{exact:true}).fill(patientFixture.email);
        await other.getByLabel('Password',{exact:true}).fill(patientFixture.password);
        await other.getByRole('button',{name:'Sign in',exact:true}).click();
        await other.waitForURL(u=>u.origin===origin&&u.pathname==='/patient/intake');
        await other.getByRole('tablist',{name:'Intake sections'}).waitFor({state:'visible'});
        assert.equal(await other.getByRole('tablist',{name:'Intake sections'}).getByRole('tab').count(),21);
        assert.equal(await other.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
        stage='authenticated patient denial of clinician chart and metadata';
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
        await other.goto(origin+'/emr/bps-intake?patient='+e.EMR_ACCEPTANCE_CHART_ID);
        assert.equal(await other.locator('article[aria-label="Intake biopsychosocial reconciliation"]').count(),0);
        await other.goto(origin+'/patient/intake');
        await other.getByRole('tablist',{name:'Intake sections'}).waitFor({state:'visible'});
        assert.equal(await other.locator('html').getAttribute('data-dpl-id'),e.EMR_ACCEPTANCE_DEPLOYMENT_ID);
        assert.equal(await readStatus(),200,'Independent clinician session must remain authorized');
        console.log('Hosted fictional patient role isolation: positive own intake access before and after denied clinician chart and metadata, separate clinician session preserved.');
      }finally{await otherContext.close();}
    }else console.log('Separate hosted patient-role isolation not executed; fixture opt-in required.');
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
  } catch {
    throw new Error('Hosted preflight failed at '+stage+'; browser error details suppressed to protect credentials and clinical content.');
  } finally {await browser.close();}
}
