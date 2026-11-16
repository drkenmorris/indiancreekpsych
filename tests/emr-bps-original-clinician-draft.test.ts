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
function harness(reply:(call:number)=>Promise<Response>){
 const dom=new JSDOM('<main id="content"></main>',{
  url:'https://www.indiancreekpsych.com/emr/workspace?module=assessment&bps_page=developmental_personal'
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
   '<form data-action="biopsychosocial_developmental_personal">'+
   '<textarea name="source_notes" maxlength="4000"></textarea></form>';}
 };
 runInNewContext(readFileSync('public/emr-assets/production.js','utf8'),ctx);
 ctx.render();
 const note=dom.window.document.querySelector('textarea[name="source_notes"]') as HTMLTextAreaElement;
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
