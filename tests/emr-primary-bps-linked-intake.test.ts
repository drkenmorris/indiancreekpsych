import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
// @ts-expect-error This repository runs jsdom in test fixtures without @types/jsdom.
import {JSDOM} from 'jsdom';
import {expect,test,vi} from 'vitest';
import {bpsVisibleSourceKeys} from '@/lib/emr/intake-bps';

const firstPatient='00000000-0000-4000-8000-000000000801';
const secondPatient='00000000-0000-4000-8000-000000000802';
function report(patientId:string){
 const sections=Array.from({length:21},(_,i)=>({
  title:i===0?'Presenting concerns and functional impact':i===1?'Medications':i===2?'Authorization to share health information':'Intake section '+(i+1),
  domain:i===0?'Presenting problems':i===1?'Medication reconciliation':i===2?'Legal authorization':'Clinical context',
  disposition:i===1?'separate-review':i===2?'reference':'clinical',
  answered:i<3?1:0,
  fields:i===0?[{key:'counseling_reason',label:'Concern',type:'text',reported:true,sourceOnly:false,value:'Fictional patient-reported concern'}]:
   i===1?[{key:'medication_entries',label:'Medication',type:'medications',reported:true,sourceOnly:true,value:'SECRET MEDICATION DATA'}]:
   i===2?[{key:'roi_authorize',label:'Authorization',type:'text',reported:true,sourceOnly:false,value:'SECRET LEGAL DATA'}]:[]
 }));
 return {patientId,source:{accountId:'00000000-0000-4000-8000-000000000803',status:'submitted',version:6,updatedAt:'2026-11-10T12:00:00Z',submittedAt:'2026-11-10T12:00:00Z'},
  sections,unmappedKeys:['unmapped_legacy_field'],reviews:[]};
}
function harness(fetchResponse:(url:string,options:any)=>Promise<Response>,id=firstPatient){
 const dom=new JSDOM('<main id="content"></main>',{url:'https://www.indiancreekpsych.com/emr/workspace?module=assessment&section=assessment%3Abiopsychosocial&bps_page=medications'});
 const ctx:any={
  window:dom.window,document:dom.window.document,location:dom.window.location,
  patientId:id,view:'assessment',URLSearchParams,encodeURIComponent,fetch:fetchResponse,
  settingsSection:()=>'',message:()=>{},configCard:()=>'',console,
  render:()=>{dom.window.document.querySelector('#content')!.innerHTML=
   '<p id="clinical-form">Original BPS clinical form remains available</p>'+
   (ctx.view==='assessment'?'<nav><a data-bps-intake-review href="#">Original review link</a></nav>':'');}
 };
 runInNewContext(readFileSync('public/emr-assets/production.js','utf8'),ctx);
 return {ctx,dom};
}

test('original seven-page BPS workspace displays linked 21-section context without auto-importing sensitive sources',async()=>{
 const calls:{url:string;method:string;credentials:string}[]=[];
 const {ctx,dom}=harness(async(url,options)=>{
  calls.push({url,method:options?.method||'GET',credentials:options?.credentials});
  return Response.json(report(firstPatient));
 });
 ctx.render();
 await vi.waitFor(()=>expect(dom.window.document.querySelectorAll('section[aria-label="Patient intake context in original biopsychosocial workspace"] > details > ol > li').length).toBe(21));
 const panel=dom.window.document.querySelector('section[aria-label="Patient intake context in original biopsychosocial workspace"]')!;
 expect(dom.window.document.querySelector('#clinical-form')?.textContent).toContain('Original BPS clinical form');
 expect(panel.textContent).toContain('source version 6');
 expect(panel.textContent).toContain('Fictional patient-reported concern');
 expect(panel.textContent).toContain('Presenting problems');
 expect(panel.textContent).not.toContain('SECRET MEDICATION DATA');
 expect(panel.textContent).not.toContain('SECRET LEGAL DATA');
 expect(panel.textContent).toContain('no clinical content transferred');
 const link=Array.from(panel.querySelectorAll('a')).find((a:any)=>a.textContent?.includes('Open protected clinician review and explicit BPS snapshot save')) as HTMLAnchorElement;
 const url=new URL(link.href);
 expect(url.pathname).toBe('/emr/bps-intake');
 expect(url.searchParams.get('patient')).toBe(firstPatient);
 expect(url.searchParams.get('bps_page')).toBe('medications');
 expect(panel.textContent).toContain('unmapped intake field');
 expect(calls).toEqual([{url:'/api/emr/bps-intake?patient='+firstPatient,method:'GET',credentials:'same-origin'}]);
 dom.window.close();
});

test('unselected BPS charts and unrelated modules never query patient intake',()=>{
 const calls:string[]=[];
 const {ctx,dom}=harness(async(url)=>{calls.push(url);return Response.json(report(firstPatient));},'');
 ctx.render();
 expect(calls).toEqual([]);
 expect(dom.window.document.querySelector('#clinical-form')).not.toBeNull();
 ctx.patientId=firstPatient;
 ctx.view='notes';
 ctx.render();
 expect(calls).toEqual([]);
 dom.window.close();
});

test('a late intake response from a previous selected chart cannot appear in the current patient workspace',async()=>{
 const resolves:Record<string,(value:Response)=>void>={};
 const calls:string[]=[];
 const {ctx,dom}=harness((url)=>{
  const id=new URL(url,'https://www.indiancreekpsych.com').searchParams.get('patient')!;
  calls.push(id);
  return new Promise(resolve=>{resolves[id]=resolve;});
 });
 ctx.render();
 ctx.patientId=secondPatient;
 ctx.render();
 resolves[secondPatient](Response.json(report(secondPatient)));
 await vi.waitFor(()=>expect(dom.window.document.querySelector('section[aria-label="Patient intake context in original biopsychosocial workspace"]')?.textContent).toContain('source version 6'));
 resolves[firstPatient](Response.json({...report(firstPatient),sections:report(firstPatient).sections.map(s=>({...s,title:'WRONG PATIENT DATA'}))}));
 await new Promise(resolve=>setTimeout(resolve,5));
 const panel=dom.window.document.querySelector('section[aria-label="Patient intake context in original biopsychosocial workspace"]')!;
 expect(panel.textContent).not.toContain('WRONG PATIENT DATA');
 expect(new URL((panel.querySelector('a') as HTMLAnchorElement).href).searchParams.get('patient')).toBe(secondPatient);
 expect(calls).toEqual([firstPatient,secondPatient]);
 dom.window.close();
});

test('BPS intake API or migration failure is visible, never represented as saved/verified clinical content',async()=>{
 const {ctx,dom}=harness(async()=>Response.json({error:'BPS review history unavailable; migration not applied.'},{status:503}));
 ctx.render();
 await vi.waitFor(()=>expect(dom.window.document.querySelector('[role="alert"]')?.textContent).toContain('migration not applied'));
 expect(dom.window.document.querySelector('#clinical-form')).not.toBeNull();
 expect(dom.window.document.querySelector('section[aria-label="Patient intake context in original biopsychosocial workspace"]')?.textContent).toContain('no intake data were imported');
 dom.window.close();
});


test('primary original BPS displays immutable snapshot provenance without leaking historical clinical or legal payloads',async()=>{
 const past={...report(firstPatient),reviews:[{
  id:'00000000-0000-4000-8000-000000000999',
  reviewed:true,source_version:5,source_status:'submitted',source_updated_at:'2026-11-09T12:00:00Z',
  created_at:'2026-11-09T12:30:00Z',
  clinical_answers:{counseling_reason:'DO NOT ECHO HISTORY',roi_authorize:'DO NOT ECHO LEGAL'},
  clinician_notes:{presenting:'DO NOT ECHO PRIVATE CLINICIAN NOTE'}
 }]};
 const {ctx,dom}=harness(async()=>Response.json(past));
 ctx.render();
 await vi.waitFor(()=>expect(dom.window.document.querySelector(
  'section[aria-label="Clinician-reviewed BPS intake snapshot history"]'
 )?.textContent).toContain('Unsigned review'));
 const history=dom.window.document.querySelector(
  'section[aria-label="Clinician-reviewed BPS intake snapshot history"]')!;
 expect(history.textContent).toContain('submitted intake version 5');
 expect(history.textContent).toContain('current intake version has changed');
 expect(history.textContent).not.toContain('DO NOT ECHO');
 const link=new URL((history.querySelector('a') as HTMLAnchorElement).href);
 expect(link.pathname).toBe('/emr/bps-intake');
 expect(link.searchParams.get('patient')).toBe(firstPatient);
 dom.window.close();
});

test('exactly matching clinician-reviewed BPS source version, status and timestamp is not marked stale',async()=>{
 const current={...report(firstPatient),reviews:[{
  id:'00000000-0000-4000-8000-000000000998',
  reviewed:true,source_version:6,source_status:'submitted',source_updated_at:'2026-11-10T12:00:00+00:00',
  created_at:'2026-11-10T12:10:00Z',
  clinical_answers:{},clinician_notes:{}
 }]};
 const {ctx,dom}=harness(async()=>Response.json(current));
 ctx.render();
 await vi.waitFor(()=>expect(dom.window.document.querySelector(
  'section[aria-label="Clinician-reviewed BPS intake snapshot history"]'
 )?.textContent).toContain('submitted intake version 6'));
 const history=dom.window.document.querySelector(
  'section[aria-label="Clinician-reviewed BPS intake snapshot history"]')!;
 expect(history.textContent).not.toContain('current intake version has changed');
 expect(history.textContent).not.toContain('not yet been saved');
 dom.window.close();
});

test('original BPS refreshes a changed linked intake without saving or resetting the clinical form',async()=>{
 let sourceVersion=6;
 const calls:{url:string;method:string}[]=[];
 const {ctx,dom}=harness(async(url,options)=>{
  calls.push({url,method:options?.method||'GET'});
  const current=report(firstPatient);
  return Response.json({...current,source:{...current.source,version:sourceVersion}});
 });
 ctx.render();
 const panel=()=>dom.window.document.querySelector(
  'section[aria-label="Patient intake context in original biopsychosocial workspace"]')!;
 await vi.waitFor(()=>expect(panel().textContent).toContain('source version 6'));
 const form=dom.window.document.querySelector('#clinical-form');
 expect(form).not.toBeNull();
 sourceVersion=7;
 const refresh=Array.from(panel().querySelectorAll('button')).find(
  (button:any)=>button.textContent?.includes('Refresh linked patient intake')) as HTMLButtonElement;
 expect(refresh).toBeDefined();
 expect(refresh.type).toBe('button');
 refresh.click();
 await vi.waitFor(()=>expect(panel().textContent).toContain('source version 7'));
 expect(dom.window.document.querySelector('#clinical-form')).toBe(form);
 expect(calls).toEqual([
  {url:'/api/emr/bps-intake?patient='+firstPatient,method:'GET'},
  {url:'/api/emr/bps-intake?patient='+firstPatient,method:'GET'}
 ]);
 expect(panel().textContent).toContain('current intake');
 dom.window.close();
});

test('a failed protected intake refresh cannot claim a saved or reviewed clinical BPS',async()=>{
 let requests=0;
 const {ctx,dom}=harness(async()=>{
  requests++;
  return requests===1?Response.json(report(firstPatient)):
   Response.json({error:'Protected intake temporarily unavailable'},{status:503});
 });
 ctx.render();
 const panel=()=>dom.window.document.querySelector(
  'section[aria-label="Patient intake context in original biopsychosocial workspace"]')!;
 await vi.waitFor(()=>expect(panel().textContent).toContain('source version 6'));
 const refresh=Array.from(panel().querySelectorAll('button')).find(
  (button:any)=>button.textContent?.includes('Refresh linked patient intake')) as HTMLButtonElement;
 refresh.click();
 await vi.waitFor(()=>expect(panel().querySelector('[role="alert"]')?.textContent).toContain('temporarily unavailable'));
 expect(panel().textContent).toContain('no intake data were imported');
 expect(dom.window.document.querySelector('#clinical-form')).not.toBeNull();
 expect(requests).toBe(2);
 dom.window.close();
});

test('original BPS redacts malformed structured, reference and missing-marker source answers even when upstream incorrectly exposes a value',async()=>{
 const unsafe:any=report(firstPatient);
 unsafe.sections[0].fields.push(
  {key:'medication_entries',label:'Medication',type:'medications',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_STRUCTURED_MEDICATION'},
  {key:'counseling_goals',label:'Goals',type:'text',reported:true,value:'DO_NOT_LEAK_MISSING_MARKER'}
 );
 unsafe.sections[2].fields[0].value='DO_NOT_LEAK_REFERENCE_LEGAL';
 unsafe.sections[0].fields.push(
  {key:'insurance_member',label:'Falsely typed insurance field',type:'text',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_SPOOFED_INSURANCE'},
  {key:'roi_authorize',label:'Falsely typed legal field',type:'text',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_SPOOFED_LEGAL'},
  {key:'prior_psychiatric_medications',label:'Retired medication spoof',type:'historical-patient-report',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_RETIRED_MEDICATION'},
  {key:'legal_history',label:'Retired legal history spoof',type:'historical-patient-report',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_RETIRED_LEGAL'}
 );
 const {ctx,dom}=harness(async()=>Response.json(unsafe));
 ctx.render();
 await vi.waitFor(()=>expect(dom.window.document.querySelector('section[aria-label="Patient intake context in original biopsychosocial workspace"]')?.textContent).toContain('source version 6'));
 const displayed=dom.window.document.querySelector('section[aria-label="Patient intake context in original biopsychosocial workspace"]')!.textContent||'';
 expect(displayed).toContain('Fictional patient-reported concern');
 for(const secret of ['DO_NOT_LEAK_STRUCTURED_MEDICATION','DO_NOT_LEAK_MISSING_MARKER','DO_NOT_LEAK_REFERENCE_LEGAL','DO_NOT_LEAK_SPOOFED_INSURANCE','DO_NOT_LEAK_SPOOFED_LEGAL','DO_NOT_LEAK_RETIRED_MEDICATION','DO_NOT_LEAK_RETIRED_LEGAL'])expect(displayed).not.toContain(secret);
 expect(displayed).toContain('Stored in the dedicated protected intake/reconciliation source.');
 dom.window.close();
});



test.each([
 ['missing section field list',(current:any)=>{current.sections[0].fields=null;}],
 ['nested instead of string patient response',(current:any)=>{
  current.sections[0].fields[0].value={secret:'PRIVATE_FICTIONAL_NESTED_SOURCE'};
 }],
 ['unapproved section routing',(current:any)=>{current.sections[0].disposition='legal-consent';}],
 ['impossible answered field count',(current:any)=>{current.sections[0].answered=99;}],
 ['non-boolean patient-reported marker',(current:any)=>{current.sections[0].fields[0].reported='yes';}],
 ['non-boolean source protection marker',(current:any)=>{current.sections[0].fields[0].sourceOnly='false';}]
])('original seven-page BPS withholds ALL linked patient statements for %s',async(_label,corrupt)=>{
 const current:any=report(firstPatient);
 current.sections[0].fields[0].value='PRIVATE_FICTIONAL_SOURCE_MUST_NOT_RENDER';
 corrupt(current);
 const {ctx,dom}=harness(async()=>Response.json(current));
 ctx.render();
 const panel=()=>dom.window.document.querySelector(
  'section[aria-label="Patient intake context in original biopsychosocial workspace"]')!;
 await vi.waitFor(()=>expect(panel()?.querySelector('[role="alert"]')?.textContent)
  .toContain('21-section intake mapping is malformed'));
 const body=panel().textContent||'';
 expect(body).not.toContain('PRIVATE_FICTIONAL_SOURCE_MUST_NOT_RENDER');
 expect(body).not.toContain('PRIVATE_FICTIONAL_NESTED_SOURCE');
 expect(body).not.toContain('Fictional patient-reported concern');
 expect(body).not.toContain('attested clinician review(s)');
 expect(body).toContain('no intake data were imported');
 expect(dom.window.document.querySelector('#clinical-form')?.textContent)
  .toContain('Original BPS clinical form remains available');
 dom.window.close();
});

test('original BPS browser allowlist is synchronized with the typed clinical source mapping',()=>{
 const source=readFileSync('public/emr-assets/production.js','utf8');
 const match=source.match(/const bpsVisibleSourceKeys=new Set\((\[[^\n]*\])\);/);
 expect(match).not.toBeNull();
 const keys=JSON.parse(match![1]) as string[];
 expect(new Set(keys).size).toBe(keys.length);
 expect(new Set(keys)).toEqual(bpsVisibleSourceKeys);
});


test('original BPS does not report a current source reviewed when the stored row lacks clinician attestation',async()=>{
 const unverified={...report(firstPatient),reviews:[{
  id:'00000000-0000-4000-8000-000000000998',reviewed:false,
  source_version:6,source_status:'submitted',source_updated_at:'2026-11-10T12:00:00Z',
  created_at:'2026-11-10T12:10:00Z',clinical_answers:{},clinician_notes:{}
 }]};
 const {ctx,dom}=harness(async()=>Response.json(unverified));
 ctx.render();
 await vi.waitFor(()=>expect(dom.window.document.querySelector(
  'section[aria-label="Clinician-reviewed BPS intake snapshot history"]'
 )?.textContent).toContain('Unverified review attestation'));
 const history=dom.window.document.querySelector(
  'section[aria-label="Clinician-reviewed BPS intake snapshot history"]')!;
 expect(history.textContent).toContain('current intake version has changed');
 expect(history.textContent).not.toContain('Unsigned review of submitted intake version 6');
 expect(dom.window.document.querySelector('section[aria-label="Patient intake context in original biopsychosocial workspace"]')?.textContent).toContain('0 attested clinician review(s)');
 dom.window.close();
});


test.each([
 ['absent clinician history array',{reviews:undefined}],
 ['absent source-audit array',{unmappedKeys:undefined}],
 ['malformed clinician attestation',{reviews:[{
  id:'00000000-0000-4000-8000-000000000998',
  reviewed:'true',source_version:6,source_status:'submitted',
  source_updated_at:'2026-11-10T12:00:00Z',created_at:'2026-11-10T12:10:00Z'
 }]}],
 ['unversioned historical review',{reviews:[{
  id:'00000000-0000-4000-8000-000000000998',
  reviewed:true,source_version:0,source_status:'submitted',
  source_updated_at:'2026-11-10T12:00:00Z',created_at:'2026-11-10T12:10:00Z'
 }]}],
 ['malformed historical timestamp',{reviews:[{
  id:'00000000-0000-4000-8000-000000000998',
  reviewed:true,source_version:6,source_status:'submitted',
  source_updated_at:'not-a-date',created_at:'2026-11-10T12:10:00Z'
 }]}],
 ['impossible historical source date',{reviews:[{
  id:'00000000-0000-4000-8000-000000000998',
  reviewed:true,source_version:6,source_status:'submitted',
  source_updated_at:'2026-02-30T12:00:00Z',created_at:'2026-11-10T12:10:00Z'
 }]}],
 ['ambiguous historical save date',{reviews:[{
  id:'00000000-0000-4000-8000-000000000998',
  reviewed:true,source_version:6,source_status:'submitted',
  source_updated_at:'2026-11-10T12:00:00Z',created_at:'1'
 }]}]
])('original BPS refuses %s instead of claiming empty or reviewed history',async(_case,change)=>{
 const unsafe:any={...report(firstPatient),...change};
 unsafe.sections[0].fields[0].value='PRIVATE_FICTIONAL_CLINICAL_REPORT';
 const {ctx,dom}=harness(async()=>Response.json(unsafe));
 ctx.render();
 const panel=()=>dom.window.document.querySelector(
  'section[aria-label="Patient intake context in original biopsychosocial workspace"]')!;
 await vi.waitFor(()=>expect(panel()?.querySelector('[role="alert"]')?.textContent)
  .toContain('review history provenance or unmapped-field audit could not be verified'));
 expect(panel().textContent).not.toContain('PRIVATE_FICTIONAL_CLINICAL_REPORT');
 expect(panel().textContent).not.toContain('attested clinician review(s)');
 expect(panel().textContent).toContain('no intake data were imported');
 expect(dom.window.document.querySelector('#clinical-form')?.textContent)
  .toContain('Original BPS clinical form remains available');
 dom.window.close();
});

test.each([
 ['missing linked account',{accountId:null}],
 ['invalid linked account',{accountId:'a different patient'}],
 ['unexpected intake status',{status:'revoked'}],
 ['invalid source version',{version:0}],
 ['unsafe integer source version',{version:Number.MAX_SAFE_INTEGER+1}],
 ['unparseable source timestamp',{updatedAt:'not-a-source-timestamp'}],
 ['impossible calendar source date',{updatedAt:'2026-02-30T12:00:00Z'}],
 ['ambiguous numeric source date',{updatedAt:'1'}],
 ['date-only source timestamp',{updatedAt:'2026-11-10'}],
 ['missing submitted intake receipt',{submittedAt:undefined}],
 ['malformed submitted intake receipt',{submittedAt:'not-a-date'}],
 ['impossible submitted intake date',{submittedAt:'2026-02-30T12:00:00Z'}],
 ['invalid draft receipt',{status:'draft',submittedAt:'not-a-date'}]
])('original seven-page BPS refuses %s before displaying patient-reported intake',async(_case,change)=>{
 const unsafe=report(firstPatient);
 unsafe.sections[0].fields[0].value='PRIVATE_REPORTED_BPS_SOURCE';
 const {ctx,dom}=harness(async()=>Response.json({
  ...unsafe,source:{...unsafe.source,...change}
 }));
 ctx.render();
 const panel=()=>dom.window.document.querySelector(
  'section[aria-label="Patient intake context in original biopsychosocial workspace"]')!;
 await vi.waitFor(()=>expect(panel()?.querySelector('[role="alert"]')?.textContent)
  .toContain('source identity, status, version or timestamp could not be verified'));
 expect(panel().textContent).not.toContain('PRIVATE_REPORTED_BPS_SOURCE');
 expect(panel().textContent).toContain('no intake data were imported');
 expect(dom.window.document.querySelector('#clinical-form')?.textContent)
  .toContain('Original BPS clinical form remains available');
 dom.window.close();
});


test.each([
 ['symptoms','Current symptom checklist','Fictional patient-reported concern'],
 ['treatment_history','Counseling and psychiatric history','FICTIONAL_TREATMENT_CONTEXT'],
 ['medications','Psychiatric medications',null],
 ['family_origin','Family of origin','FICTIONAL_FAMILY_CONTEXT'],
 ['medical_substance','Medical and substance-use history',null],
 ['developmental_personal','Developmental and personal history','FICTIONAL_FAMILY_CONTEXT'],
 ['trauma_history','Trauma history','FICTIONAL_FAMILY_CONTEXT']
])('original BPS page %s provides page-scoped read-only linked intake without changing clinical fields',async(page,label,expected)=>{
 const current=report(firstPatient);
 // Every page stays within the existing 21-section protected intake. New values
 // are fictional, and dedicated medication/medical/legal source values stay
 // unavailable to the BPS summary even when an API response is malformed.
 current.sections[3]={...current.sections[3],title:'Mental health treatment history',disposition:'clinical',
  fields:[{key:'prior_mental_health_treatment',label:'Prior treatment',type:'text',reported:true,sourceOnly:false,value:'FICTIONAL_TREATMENT_CONTEXT'}]};
 current.sections[4]={...current.sections[4],title:'Safety and risk screening',disposition:'clinical',
  fields:[{key:'suicidal_thoughts_current',label:'Risk report',type:'text',reported:true,sourceOnly:false,value:'FICTIONAL_SAFETY_CONTEXT'}]};
 current.sections[5]={...current.sections[5],title:'Emergency contact, guardian, and responsible party',disposition:'clinical',
  fields:[{key:'guardian_relationship',label:'Family relationship',type:'text',reported:true,sourceOnly:false,value:'FICTIONAL_GUARDIAN_CONTEXT'}]};
 current.sections[6]={...current.sections[6],title:'Medical & Substance Use History',disposition:'separate-review',
  fields:[{key:'medical_history',label:'Medical history',type:'medical-substance',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_MEDICAL'}]};
 current.sections[7]={...current.sections[7],title:'Trauma, family, social, educational, and occupational history',disposition:'clinical',
  fields:[
   {key:'family_household',label:'Family narrative',type:'historical-patient-report',reported:true,sourceOnly:false,value:'FICTIONAL_FAMILY_CONTEXT'},
   {key:'trauma_entries',label:'Structured trauma',type:'trauma-history',reported:true,sourceOnly:false,value:'DO_NOT_LEAK_TRAUMA'}
  ]};
 const {ctx,dom}=harness(async()=>Response.json(current));
 dom.window.history.replaceState({},'', '/emr/workspace?module=assessment&section=assessment%3Abiopsychosocial&bps_page='+page);
 ctx.render();
 const source=await vi.waitFor(()=>{
  const value=dom.window.document.querySelector('section[aria-label="Source context for selected original BPS page"]');
  expect(value).not.toBeNull();
  return value!;
 });
 expect(source.textContent).toContain('Patient-reported source context for '+label);
 expect(source.textContent).toContain('not a clinician finding or form entry');
 if(expected)expect(source.textContent).toContain(expected);
 if(page==='medications'||page==='medical_substance')expect(source.textContent).toContain('Dedicated protected reconciliation required');
 for(const secret of ['SECRET MEDICATION DATA','SECRET LEGAL DATA','DO_NOT_LEAK_MEDICAL','DO_NOT_LEAK_TRAUMA'])
  expect(source.textContent).not.toContain(secret);
 if(page!=='symptoms')expect(source.textContent).not.toContain('Fictional patient-reported concern');
 expect(dom.window.document.querySelector('#clinical-form')?.textContent).toContain('Original BPS clinical form remains available');
 expect(dom.window.document.querySelector('section[aria-label="Patient intake context in original biopsychosocial workspace"] > details')).not.toBeNull();
 dom.window.close();
});

test('unrecognized original BPS page never creates a misleading page-specific clinical mapping',async()=>{
 const {ctx,dom}=harness(async()=>Response.json(report(firstPatient)));
 dom.window.history.replaceState({},'', '/emr/workspace?module=assessment&section=assessment%3Abiopsychosocial&bps_page=unapproved_section');
 ctx.render();
 await vi.waitFor(()=>expect(dom.window.document.querySelector(
  'section[aria-label="Patient intake context in original biopsychosocial workspace"]')?.textContent).toContain('source version 6'));
 expect(dom.window.document.querySelector('section[aria-label="Source context for selected original BPS page"]')).toBeNull();
 expect(dom.window.document.querySelector('#clinical-form')).not.toBeNull();
 dom.window.close();
});
