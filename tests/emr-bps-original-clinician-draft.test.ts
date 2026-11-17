import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
// @ts-expect-error This repository runs jsdom without the optional @types/jsdom package.
import {JSDOM} from 'jsdom';
import {expect,test,vi} from 'vitest';
import {intakeSectionsForVersion} from '@/lib/patient/intake';
import {bpsSectionClassification} from '@/lib/emr/intake-bps';

// Fictional in-memory original-form integration. No production user, clinician,
// chart record, appointment, email or MFA state is written by these tests.
const patient='00000000-0000-4000-8000-000000000901';
const alternate='00000000-0000-4000-8000-000000000902';
const stamp='2026-11-14T12:00:00.123456Z';
function packet(version=7){
 const sections=intakeSectionsForVersion('').map(section=>{
  const fields=section.title==='Trauma, family, social, educational, and occupational history'?[
   {key:'social_supports',label:'Social supports',type:'text',value:'FICTIONAL FRIEND SUPPORT',reported:true,sourceOnly:false},
   {key:'trauma_history',label:'Structured trauma history',type:'trauma-history',value:'PRIVATE FICTIONAL TRAUMA',reported:true,sourceOnly:true}
  ]:section.title==='Medications'?[
   {key:'medication_entries',label:'Medications',type:'medications',value:'PRIVATE FICTIONAL MEDICATION',reported:true,sourceOnly:true}
  ]:[];
  const rule=bpsSectionClassification[section.title];
  return {title:section.title,domain:rule.domain,disposition:rule.disposition,
   answered:fields.length,fields};
 });
 return {patientId:patient,source:{
  accountId:'00000000-0000-4000-8000-000000000903',status:'submitted',
  version,updatedAt:stamp,submittedAt:stamp
 },sections,reviews:[],unmappedKeys:[]};
}
function harness(reply:(call:number)=>Promise<Response>,bpsPage:'symptoms'|'treatment_history'|'medications'|'family_origin'|'medical_substance'|'developmental_personal'|'trauma_history'='developmental_personal'){
 const dom=new JSDOM('<main id="content"></main>',{
  url:'https://www.indiancreekpsych.com/emr/workspace?module=assessment&bps_page='+bpsPage
 });
 let calls=0;
 const requests:{url:string;method:string}[]=[];
 const fetch=vi.fn(async(url:string,options?:RequestInit)=>{
  calls++;
  requests.push({url,method:options?.method||'GET'});
  return reply(calls);
 });
 const ctx:any={
  window:dom.window,document:dom.window.document,location:dom.window.location,
  patientId:patient,view:'assessment',URLSearchParams,encodeURIComponent,fetch,
  settingsSection:()=>'',message:()=>{},configCard:()=>'',console,
  render:()=>{dom.window.document.querySelector('#content')!.innerHTML=
   '<nav><a data-bps-intake-review href="#">Review linked intake</a></nav>'+
   '<form data-action="'+(bpsPage==='family_origin'?'biopsychosocial_family_origin':'biopsychosocial_developmental_personal')+'">'+
   '<textarea name="'+(bpsPage==='family_origin'?'other_notes':'source_notes')+'" maxlength="4000"></textarea></form>';}
 };
 runInNewContext(readFileSync('public/emr-assets/production.js','utf8'),ctx);
 ctx.render();
 const note=dom.window.document.querySelector('form textarea') as HTMLTextAreaElement;
 const button=()=>Array.from(dom.window.document.querySelectorAll('button')).find(
  (b:any)=>b.textContent?.includes('Place patient-reported source references')) as HTMLButtonElement;
 return {ctx,dom,note,button,requests,fetch};
}
test('clinician can explicitly place verified, versioned social report into blank original developmental-history draft without saving',async()=>{
 const h=harness(async()=>Response.json(packet()));
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  expect(h.note.value).toBe('');
  h.button().click();
  await vi.waitFor(()=>expect(h.note.value).toContain('FICTIONAL FRIEND SUPPORT'));
  expect(h.note.value).toContain('Unverified patient-reported website intake, version 7');
  expect(h.note.value).not.toContain('PRIVATE FICTIONAL TRAUMA');
  expect(h.note.value).not.toContain('PRIVATE FICTIONAL MEDICATION');
  expect(h.requests).toEqual([
   {url:'/api/emr/bps-intake?patient='+patient,method:'GET'},
   {url:'/api/emr/bps-intake?patient='+patient,method:'GET'}
  ]);
  expect(h.dom.window.document.body.textContent).toContain('no clinician finding or signature was created');
 }finally{h.dom.window.close();}
});
test.each(['developmental_personal','family_origin'] as const)(
 'multiline patient report cannot masquerade as unsigned clinician content in %s draft',async page=>{
  const h=harness(async()=>{
   const source=packet();
   source.sections.find(section=>
    section.title==='Trauma, family, social, educational, and occupational history')!
    .fields.find(field=>field.key==='social_supports')!.value=
    'FICTIONAL SUPPORT FIRST LINE\r\nClinician assessment: FORGED\u2028Clinician signature: FORGED';
   return Response.json(source);
  },page);
  try{
   await vi.waitFor(()=>expect(h.button()).toBeTruthy());
   h.button().click();
   await vi.waitFor(()=>expect(h.note.value).toContain('FICTIONAL SUPPORT FIRST LINE'));
   const lines=h.note.value.split('\n');
   expect(lines).toContain('Patient-reported Social supports (line 1/3): FICTIONAL SUPPORT FIRST LINE');
   expect(lines).toContain('Patient-reported Social supports (line 2/3): Clinician assessment: FORGED');
   expect(lines).toContain('Patient-reported Social supports (line 3/3): Clinician signature: FORGED');
   expect(lines).not.toContain('Clinician assessment: FORGED');
   expect(lines).not.toContain('Clinician signature: FORGED');
   expect(h.requests).toHaveLength(2);
   expect(h.requests.every(request=>request.method==='GET')).toBe(true);
   expect(h.dom.window.document.body.textContent).toContain('no clinician finding or signature was created');
  }finally{h.dom.window.close();}
 }
);

test.each([
 ['carriage-return / newline', 'Social supports\\r\\nClinician signature: FORGED'],
 ['Unicode paragraph separator', 'Social supports\\u2028Clinician assessment: FORGED'],
 ['bidirectional override', 'Social supports\\u202eClinician signature: FORGED'],
 ['unprintable control', 'Social supports\\u000bClinician signature: FORGED']
])('original BPS rejects %s in untrusted patient-report labels before draft attribution',async(_case,labelText)=>{
 const h=harness(async()=>{
  const source=packet();
  const section=source.sections.find(s=>
   s.title==='Trauma, family, social, educational, and occupational history')!;
  section.fields.find(field=>field.key==='social_supports')!.label=labelText;
  return Response.json(source);
 });
 try{
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent)
   .toContain('Linked intake cannot be reviewed in the original BPS workspace'));
  expect(h.dom.window.document.body.textContent).not.toContain('Clinician signature: FORGED');
  expect(h.dom.window.document.body.textContent).not.toContain('Clinician assessment: FORGED');
  expect(h.button()).toBeUndefined();
  expect(h.note.value).toBe('');
  expect(h.requests).toEqual([{url:'/api/emr/bps-intake?patient='+patient,method:'GET'}]);
 }finally{h.dom.window.close();}
});

test('original clinician notes are never replaced and never trigger an unintended clinical POST',async()=>{
 const h=harness(async()=>Response.json(packet()));
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.note.value='EXISTING CLINICIAN NOTES';
  h.button().click();
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain('Existing clinician draft notes were preserved'));
  expect(h.note.value).toBe('EXISTING CLINICIAN NOTES');
  expect(h.requests).toHaveLength(1);
 }finally{h.dom.window.close();}
});
test('changed source revision fails closed before original form draft population',async()=>{
 const h=harness(async call=>Response.json(packet(call===1?7:8)));
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.button().click();
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain('The linked intake changed or could not be reverified'));
  expect(h.note.value).toBe('');
  expect(h.requests).toHaveLength(2);
 }finally{h.dom.window.close();}
});
test('selected-patient switch makes old intake draft action inert without a write',async()=>{
 const h=harness(async()=>Response.json(packet()));
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.ctx.patientId=alternate;
  h.button().click();
  expect(h.note.value).toBe('');
  expect(h.requests).toHaveLength(1);
 }finally{h.dom.window.close();}
});

test('an unrelated patient-reported section change blocks source placement even with the same revision receipt',async()=>{
 const h=harness(async call=>{
  const source=packet();
  if(call===2)source.sections.find(s=>s.title==='Medications')!.fields[0].value='CHANGED PRIVATE FICTIONAL MEDICATION';
  return Response.json(source);
 });
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.button().click();
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain('The linked intake changed or could not be reverified'));
  expect(h.note.value).toBe('');
  expect(h.requests).toHaveLength(2);
  expect(h.requests.every(request=>request.method==='GET')).toBe(true);
 }finally{h.dom.window.close();}
});
test('questionnaire packet version changes cannot accompany original-form draft placement',async()=>{
 const h=harness(async call=>{
  const source=packet();
  return Response.json({...source,source:{...source.source,
   questionnairePacketVersion:call===1?'2026-10-11':'2026-11-02-directory-1'}});
 });
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.button().click();
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain('The linked intake changed or could not be reverified'));
  expect(h.note.value).toBe('');
  expect(h.requests).toHaveLength(2);
 }finally{h.dom.window.close();}
});
test('changed unmapped-field audit blocks original-form draft placement',async()=>{
 const h=harness(async call=>{
  const source=packet();
  return Response.json({...source,unmappedKeys:call===1?[]:['[unrecognized source field name withheld]']});
 });
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.button().click();
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain('The linked intake changed or could not be reverified'));
  expect(h.note.value).toBe('');
  expect(h.requests).toHaveLength(2);
 }finally{h.dom.window.close();}
});

test('intentional whitespace-only clinician source notes are never replaced by an intake attribution',async()=>{
 const h=harness(async()=>Response.json(packet()));
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  const clinicianText='  \n  ';
  h.note.value=clinicianText;
  h.button().click();
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain('Existing clinician draft notes were preserved'));
  expect(h.note.value).toBe(clinicianText);
  expect(h.requests).toHaveLength(1);
  expect(h.requests.every(request=>request.method==='GET')).toBe(true);
 }finally{h.dom.window.close();}
});

test('clinician whitespace entered while source is being reverified survives the async attribution',async()=>{
 let finishVerification:(response:Response)=>void=()=>{};
 const verification=new Promise<Response>(resolve=>{finishVerification=resolve;});
 const h=harness(async call=>call===1?Response.json(packet()):verification);
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.button().click();
  await vi.waitFor(()=>expect(h.requests).toHaveLength(2));
  // Simulate unsaved clinician input arriving after the second protected GET
  // begins, but before its source receipt is returned.
  const clinicianText='\n   ';
  h.note.value=clinicianText;
  finishVerification(Response.json(packet()));
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain('Clinician-entered draft notes were preserved'));
  expect(h.note.value).toBe(clinicianText);
  expect(h.requests.every(request=>request.method==='GET')).toBe(true);
 }finally{h.dom.window.close();}
});

test('unmapped patient intake fields block draft placement even when the submitted source itself is stable',async()=>{
 const h=harness(async()=>Response.json({...packet(),unmappedKeys:['[unrecognized source field name withheld]']}));
 try{
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain(
   'Unmapped intake fields require manual reconciliation before patient-reported source references'));
  expect(h.button()).toBeUndefined();
  expect(h.note.value).toBe('');
  // The non-sensitive patient report is still visible as explicitly read-only
  // clinical context, but cannot be transformed into a saved form field.
  expect(h.dom.window.document.body.textContent).toContain('FICTIONAL FRIEND SUPPORT');
  expect(h.dom.window.document.body.textContent).not.toContain('PRIVATE FICTIONAL TRAUMA');
  expect(h.dom.window.document.body.textContent).not.toContain('PRIVATE FICTIONAL MEDICATION');
  expect(h.requests).toEqual([{url:'/api/emr/bps-intake?patient='+patient,method:'GET'}]);
 }finally{h.dom.window.close();}
});

test('unrecognized questionnaire layout is withheld before any original-form source is displayed',async()=>{
 const h=harness(async()=>Response.json({...packet(),source:{
  ...packet().source,questionnairePacketVersion:'unsupported-version'
 }}));
 try{
  await vi.waitFor(()=>expect(h.dom.window.document.querySelector('[role="alert"]')?.textContent)
   .toContain('Linked intake source identity, status, version or timestamp could not be verified'));
  expect(h.button()).toBeUndefined();
  expect(h.note.value).toBe('');
  expect(h.dom.window.document.body.textContent).not.toContain('FICTIONAL FRIEND SUPPORT');
 }finally{h.dom.window.close();}
});

test('unapproved or wrong-domain questionnaire routing is withheld before clinician draft placement',async()=>{
 for(const corruption of ['unknown','wrong-domain']){
  const h=harness(async()=>{
   const source=packet();
   const section=source.sections.find(s=>s.title==='Medications')!;
   if(corruption==='unknown')section.title='Unapproved patient intake section';
   else section.domain='Presenting problems, functioning and goals';
   return Response.json(source);
  });
  try{
   await vi.waitFor(()=>expect(h.dom.window.document.querySelector('[role="alert"]')?.textContent)
    .toContain('Linked 21-section intake mapping is malformed'));
   expect(h.button()).toBeUndefined();
   expect(h.note.value).toBe('');
   expect(h.dom.window.document.body.textContent).not.toContain('PRIVATE FICTIONAL MEDICATION');
  }finally{h.dom.window.close();}
 }
});

test('unlabeled reported-answer counts cannot be treated as current clinical answers',async()=>{
 const h=harness(async()=>{
  const source=packet();
  const section=source.sections.find(s=>s.title==='Trauma, family, social, educational, and occupational history')!;
  for(const field of section.fields)delete (field as {reported?:boolean}).reported;
  return Response.json(source);
 });
 try{
  await vi.waitFor(()=>expect(h.dom.window.document.querySelector('[role="alert"]')?.textContent)
   .toContain('Linked 21-section intake mapping is malformed'));
  expect(h.button()).toBeUndefined();
  expect(h.note.value).toBe('');
  expect(h.requests).toHaveLength(1);
 }finally{h.dom.window.close();}
});

test('original BPS route classification matches the protected API clinical-domain rules',()=>{
 const source=readFileSync('public/emr-assets/production.js','utf8');
 const match=/const originalBpsSectionRules=Object\.freeze\((\{[\s\S]+?\})\);/.exec(source);
 expect(match).not.toBeNull();
 expect(JSON.parse(match![1])).toEqual(bpsSectionClassification);
});

test('original BPS rejects directory questionnaire metadata paired with legacy section titles',async()=>{
 const report=packet();
 const h=harness(async()=>Response.json({...report,source:{
  ...report.source,questionnairePacketVersion:'2026-11-02-directory-1'}}));
 try{
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain('layout does not match its questionnaire version'));
  expect(h.button()).toBeUndefined();
  expect(h.note.value).toBe('');
 }finally{h.dom.window.close();}
});

test('original BPS rejects legacy metadata with substituted directory source section',async()=>{
 const report=packet();
 const section=report.sections.find(s=>s.title==='Communication and confidential-contact preferences');
 if(!section)throw Error('Missing synthetic legacy communications section');
 section.title='Legal forms directory and questionnaire';
 section.domain=bpsSectionClassification[section.title].domain;
 section.disposition=bpsSectionClassification[section.title].disposition;
 const h=harness(async()=>Response.json({...report,source:{
  ...report.source,questionnairePacketVersion:'2026-10-11'}}));
 try{
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain('layout does not match its questionnaire version'));
  expect(h.button()).toBeUndefined();
  expect(h.note.value).toBe('');
 }finally{h.dom.window.close();}
});

test('matching directory section and packet version preserve safe original BPS draft action',async()=>{
 const report=packet();
 const section=report.sections.find(s=>s.title==='Communication and confidential-contact preferences');
 if(!section)throw Error('Missing synthetic legacy communications section');
 section.title='Legal forms directory and questionnaire';
 section.domain=bpsSectionClassification[section.title].domain;
 section.disposition=bpsSectionClassification[section.title].disposition;
 const h=harness(async()=>Response.json({...report,source:{
  ...report.source,questionnairePacketVersion:'2026-11-02-directory-1'}}));
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.button().click();
  await vi.waitFor(()=>expect(h.note.value).toContain('FICTIONAL FRIEND SUPPORT'));
  expect(h.requests.every(request=>request.method==='GET')).toBe(true);
 }finally{h.dom.window.close();}
});

test('original family-of-origin draft accepts only approved patient-reported social source after a fresh 21-section receipt, without saving',async()=>{
 const h=harness(async()=>Response.json(packet()),'family_origin');
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  expect(h.button().textContent).toContain('family-of-origin');
  expect(h.note.name).toBe('other_notes');
  h.button().click();
  await vi.waitFor(()=>expect(h.note.value).toContain('FICTIONAL FRIEND SUPPORT'));
  expect(h.note.value).toContain('Unverified patient-reported website intake, version 7');
  expect(h.note.value).not.toContain('PRIVATE FICTIONAL TRAUMA');
  expect(h.note.value).not.toContain('PRIVATE FICTIONAL MEDICATION');
  expect(h.requests).toEqual([
   {url:'/api/emr/bps-intake?patient='+patient,method:'GET'},
   {url:'/api/emr/bps-intake?patient='+patient,method:'GET'}
  ]);
  expect(h.dom.window.document.body.textContent).toContain('no clinician finding or signature was created');
 }finally{h.dom.window.close();}
});

test('family-of-origin source transfer preserves existing clinician other-notes and never sends a write',async()=>{
 const h=harness(async()=>Response.json(packet()),'family_origin');
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.note.value='  CLINICIAN FAMILY HISTORY NOTES  ';
  h.button().click();
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain('Existing clinician draft notes were preserved'));
  expect(h.note.value).toBe('  CLINICIAN FAMILY HISTORY NOTES  ');
  expect(h.requests).toHaveLength(1);
 }finally{h.dom.window.close();}
});

test('family-of-origin draft rejects cross-section intake changes at the same revision and discloses no protected text',async()=>{
 const h=harness(async call=>{
  const source=packet();
  if(call===2)source.sections.find(section=>section.title==='Medications')!.fields[0].value='CHANGED PRIVATE FICTIONAL MEDICATION';
  return Response.json(source);
 },'family_origin');
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.button().click();
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain('The linked intake changed or could not be reverified'));
  expect(h.note.value).toBe('');
  expect(h.requests).toHaveLength(2);
  expect(h.requests.every(request=>request.method==='GET')).toBe(true);
  expect(h.dom.window.document.body.textContent).not.toContain('PRIVATE FICTIONAL MEDICATION');
 }finally{h.dom.window.close();}
});

test('original BPS source draft is not populated if clinician navigates to another page while receipt recheck is pending',async()=>{
 let navigate=()=>{};
 const h=harness(async call=>{
  // Keep the old editable form mounted to reproduce a client-side route change
  // before the asynchronous clinical source verification resolves.
  if(call===2)navigate();
  return Response.json(packet());
 });
 navigate=()=>h.dom.window.history.pushState({},'','/emr/workspace?module=assessment&bps_page=family_origin');
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.button().click();
  await vi.waitFor(()=>expect(h.requests).toHaveLength(2));
  await vi.waitFor(()=>expect(h.button().disabled).toBe(false));
  expect(h.dom.window.location.search).toContain('bps_page=family_origin');
  expect(h.note.isConnected).toBe(true);
  expect(h.note.value).toBe('');
  expect(h.requests.every(request=>request.method==='GET')).toBe(true);
  expect(h.dom.window.document.body.textContent).not.toContain('no clinician finding or signature was created');
 }finally{h.dom.window.close();}
});


test('original BPS withholds 21-section source on corrupted clinician review history',async()=>{
 const original=packet();
 const older={
  id:'00000000-0000-4000-8000-000000000905',
  reviewed:true,source_version:7,source_status:'submitted',
  source_updated_at:stamp,created_at:'2026-11-14T12:00:01.123456Z',
  clinical_answers:{},clinician_notes:{},excluded_clinical_fields:0,excluded_clinician_notes:0
 };
 const newer={...older,
  id:'00000000-0000-4000-8000-000000000906',
  created_at:'2026-11-14T12:00:02.123456Z'
 };
 const cases=[
  {name:'missing clinician note object',reviews:[{...older,clinician_notes:null}]},
  {name:'malformed clinical snapshot array',reviews:[{...older,clinical_answers:[]}]},
  {name:'negative withheld-field counter',reviews:[{...older,excluded_clinical_fields:-1}]},
  {name:'out-of-order attestation',reviews:[older,newer]}
 ];
 for(const item of cases){
  const h=harness(async()=>Response.json({...original,reviews:item.reviews}));
  try{
   await vi.waitFor(()=>expect(h.dom.window.document.querySelector('[role="alert"]')?.textContent)
    .toContain('Linked intake review history provenance'));
   expect(h.button(),item.name).toBeUndefined();
   expect(h.note.value,item.name).toBe('');
   expect(h.dom.window.document.body.textContent,item.name).not.toContain('FICTIONAL FRIEND SUPPORT');
   expect(h.requests,item.name).toHaveLength(1);
   expect(h.requests.every(request=>request.method==='GET'),item.name).toBe(true);
  }finally{h.dom.window.close();}
 }
});
test('original BPS accepts correctly ordered clinician review receipts without copying or saving notes',async()=>{
 const original=packet();
 const latest={
  id:'00000000-0000-4000-8000-000000000906',
  reviewed:true,source_version:7,source_status:'submitted',
  source_updated_at:stamp,created_at:'2026-11-14T12:00:02.123456Z',
  clinical_answers:{},clinician_notes:{},excluded_clinical_fields:0,excluded_clinician_notes:0
 };
 const older={...latest,
  id:'00000000-0000-4000-8000-000000000905',
  created_at:'2026-11-14T12:00:01.123456Z'
 };
 const h=harness(async()=>Response.json({...original,reviews:[latest,older]}));
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  expect(h.dom.window.document.body.textContent).toContain('FICTIONAL FRIEND SUPPORT');
  expect(h.dom.window.document.body.textContent).toContain('2 attested clinician review(s)');
  expect(h.note.value).toBe('');
  expect(h.requests.every(request=>request.method==='GET')).toBe(true);
 }finally{h.dom.window.close();}
});


test.each([
 ['a second clinician saves a newer review',false,true],
 ['a previously visible clinician review disappears',true,false]
])('original BPS withholds unsaved attribution if %s during the protected recheck',async(_label,firstHasReview,secondHasReview)=>{
 const review={
  id:'00000000-0000-4000-8000-000000000916',reviewed:true,
  source_version:7,source_status:'submitted',source_updated_at:stamp,
  created_at:'2026-11-14T12:00:02.123456Z',clinical_answers:{},
  clinician_notes:{},excluded_clinical_fields:0,excluded_clinician_notes:0
 };
 const h=harness(async call=>{
  const current:any=packet();
  current.reviews=(call===1?firstHasReview:secondHasReview)?[review]:[];
  return Response.json(current);
 });
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.button().click();
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent)
   .toContain('The linked intake changed or could not be reverified'));
  expect(h.note.value).toBe('');
  expect(h.requests).toEqual([
   {url:'/api/emr/bps-intake?patient='+patient,method:'GET'},
   {url:'/api/emr/bps-intake?patient='+patient,method:'GET'}
  ]);
  expect(h.dom.window.document.body.textContent).not.toContain('no clinician finding or signature was created');
 }finally{h.dom.window.close();}
});

test('original BPS rejects missing clinician-review history during source-note recheck',async()=>{
 const h=harness(async call=>{
  const current:any=packet();
  if(call===2)delete current.reviews;
  return Response.json(current);
 });
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.button().click();
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent)
   .toContain('The linked intake changed or could not be reverified'));
  expect(h.note.value).toBe('');
  expect(h.requests.every(request=>request.method==='GET')).toBe(true);
 }finally{h.dom.window.close();}
});

test('unchanged valid clinician-review history permits explicit unsaved original-BPS note attribution',async()=>{
 const h=harness(async()=>{
  const current:any=packet();
  current.reviews=[{
   id:'00000000-0000-4000-8000-000000000917',reviewed:true,
   source_version:7,source_status:'submitted',source_updated_at:stamp,
   created_at:'2026-11-14T12:00:02.123456Z',clinical_answers:{},
   clinician_notes:{},excluded_clinical_fields:0,excluded_clinician_notes:0
  }];
  return Response.json(current);
 });
 try{
  await vi.waitFor(()=>expect(h.button()).toBeTruthy());
  h.button().click();
  await vi.waitFor(()=>expect(h.note.value).toContain('FICTIONAL FRIEND SUPPORT'));
  expect(h.requests.every(request=>request.method==='GET')).toBe(true);
 }finally{h.dom.window.close();}
});

test('original BPS withholds raw trauma even when upstream relabels it as ordinary text',async()=>{
 const h=harness(async()=>{
  const source=packet();
  const sensitive=source.sections.find(section=>section.title==='Trauma, family, social, educational, and occupational history')
   ?.fields.find(field=>field.key==='trauma_history');
  if(!sensitive)throw Error('Missing fictional trauma fixture');
  sensitive.type='text';sensitive.sourceOnly=false;
  return Response.json(source);
 });
 try{
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent).toContain('Linked patient intake — BPS source context'));
  expect(h.dom.window.document.body.textContent).toContain('FICTIONAL FRIEND SUPPORT');
  expect(h.dom.window.document.body.textContent).not.toContain('PRIVATE FICTIONAL TRAUMA');
  expect(h.requests.every(request=>request.method==='GET')).toBe(true);
 }finally{h.dom.window.close();}
});


test.each([
 ['symptoms','Current symptom checklist'],
 ['treatment_history','Counseling and psychiatric history'],
 ['medications','Psychiatric medications'],
 ['family_origin','Family of origin'],
 ['medical_substance','Medical and substance-use history'],
 ['developmental_personal','Developmental and personal history'],
 ['trauma_history','Trauma history']
] as const)('all seven original BPS pages independently show exact patient source receipts and keep separate-source data protected (%s)',async(page,label)=>{
 const h=harness(async()=>Response.json(packet()),page);
 try{
  await vi.waitFor(()=>expect(h.dom.window.document.querySelector(
   '[aria-label="Source context for selected original BPS page"]')).toBeTruthy());
  const content=h.dom.window.document.body.textContent||'';
  const pageContext=h.dom.window.document.querySelector(
   '[aria-label="Source context for selected original BPS page"]')!;
  expect(pageContext.textContent).toContain('Patient-reported source context for '+label);
  expect(content).toContain('source version 7');
  expect(content).toContain('exact revision receipt '+stamp);
  expect(content).toContain('patient submission receipt '+stamp);
  expect(content).toContain('patient attestation only; not a clinician signature');
  expect(pageContext.textContent).not.toContain('PRIVATE FICTIONAL TRAUMA');
  expect(pageContext.textContent).not.toContain('PRIVATE FICTIONAL MEDICATION');
  expect(h.note.value).toBe('');
  expect(h.requests).toEqual([{url:'/api/emr/bps-intake?patient='+patient,method:'GET'}]);
  if(page==='medications'||page==='medical_substance')
   expect(pageContext.textContent).toContain('Dedicated protected reconciliation required');
  if(page==='family_origin'||page==='developmental_personal')
   expect(pageContext.textContent).toContain('FICTIONAL FRIEND SUPPORT');
 }finally{h.dom.window.close();}
});

test('unsubmitted patient intake shows no submission attestation on every original BPS source view',async()=>{
 const h=harness(async()=>{
  const source=packet();
  return Response.json({...source,source:{...source.source,status:'draft',submittedAt:null}});
 },'symptoms');
 try{
  await vi.waitFor(()=>expect(h.dom.window.document.body.textContent)
   .toContain('no patient submission receipt (draft)'));
  const content=h.dom.window.document.body.textContent||'';
  expect(content).toContain('exact revision receipt '+stamp);
  expect(content).not.toContain('patient submission receipt '+stamp);
  expect(h.button()).toBeUndefined();
  expect(h.requests.every(request=>request.method==='GET')).toBe(true);
 }finally{h.dom.window.close();}
});
