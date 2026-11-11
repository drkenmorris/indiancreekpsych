import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
// @ts-expect-error This repository runs jsdom in test fixtures without @types/jsdom.
import {JSDOM} from 'jsdom';
import {expect,test,vi} from 'vitest';

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
 return {patientId,source:{status:'submitted',version:6,updatedAt:'2026-11-10T12:00:00Z'},
  sections,unmappedKeys:['unmapped_legacy_field'],reviews:[{id:'fictional'}]};
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
  source_version:5,source_status:'submitted',source_updated_at:'2026-11-09T12:00:00Z',
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
  source_version:6,source_status:'submitted',source_updated_at:'2026-11-10T12:00:00+00:00',
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
