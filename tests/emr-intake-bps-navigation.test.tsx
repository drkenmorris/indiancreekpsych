import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,render,screen,waitFor,fireEvent} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import PatientBpsIntakeReview from '@/app/emr/PatientBpsIntakeReview';

afterEach(()=>{cleanup();vi.unstubAllGlobals();});

test('all 21 linked BPS sections provide patient-scoped access to existing clinical reconciliation, never a second medication editor',async()=>{
 const patient='00000000-0000-0000-0000-000000000601';
 const sections=Array.from({length:21},(_,i)=>({
  title:i===3?'Mental health treatment history':i===0?'Medications':i===1?'Medical & Substance Use History':i===2?'Trauma, family, social, educational, and occupational history':'Section '+i,
  domain:'Clinician reviewed history',disposition:i===0||i===1?'separate-review':'clinical',
  fields:[{key:'answer_'+i,label:'Patient report',type:'text',value:'Fictional report'}],answered:1
 }));
 const calls:{url:string;method:string}[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  calls.push({url,method:init?.method||'GET'});
  return {ok:true,json:async()=>({
   patientId:patient,source:{accountId:patient,status:'submitted',version:4,updatedAt:'2026-11-10T11:00:00Z',submittedAt:'2026-11-10T11:00:00Z'},
   sections,unmappedKeys:[],reviews:[]
  })};
 }));
 const {container}=render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Sections audited: 21\/21/);
 const targets=[
  ['emr-intake-medication-review','Review reported medications'],
  ['emr-intake-allergy-review','Review reported medication allergies'],
  ['emr-intake-medical-review','Review medical and substance-use'],
  ['emr-intake-trauma-review','Review structured trauma history'],
  ['emr-intake-treatment-history-review','Review reported counseling and psychiatric treatment history']
 ];
 const shortcuts=screen.getByRole('navigation',{name:'Patient-scoped clinical reconciliation shortcuts'});
 const links=Array.from(shortcuts.querySelectorAll('a'));
 expect(links).toHaveLength(5);
 for(const [anchor,label] of targets){
  const link=links.find(node=>{
   const url=new URL(node.getAttribute('href')||'', 'https://clinic.example');
   return url.pathname==='/emr/patients'&&url.searchParams.get('patient')===patient&&
    url.searchParams.get('review')===anchor&&url.hash==='#'+anchor;
  });
  expect(link, 'missing patient-scoped review link for '+anchor).toBeDefined();
  expect(link?.textContent).toContain(label);
 }
 expect(container.textContent).toContain('Opening a link never copies, approves or saves patient statements.');
 expect(calls).toEqual([{url:'/api/emr/bps-intake?patient='+patient,method:'GET'}]);
 expect(container.querySelector('form')).toBeNull();
});

test('original central chart exposes matching destinations even when patient reports are absent',()=>{
 const source=readFileSync('app/emr/PatientRepository.tsx','utf8');
 for(const anchor of ['emr-intake-medication-review','emr-intake-allergy-review','emr-intake-medical-review','emr-intake-trauma-review','emr-intake-treatment-history-review']){
  expect(source).toContain('id="'+anchor+'"');
 }
 expect(source).toContain('No linked patient-reported medication entries are available');
 expect(source).toContain('No linked patient-reported medical and substance-use history is available');
 expect(source).toContain('No linked patient-reported medication allergy entries are available');
 expect(source).toContain('No linked structured trauma checklist is available');
 expect(source).toContain('No linked structured counseling/psychiatric treatment history is available');
 expect(source).toContain('value={intake.answers[TREATMENT_HISTORY_KEY]} readOnly');
 expect(source).toContain("'medication_allergy_notes','treatment_history_entries'");
 const entry=readFileSync('app/emr/patients/page.tsx','utf8');
 expect(entry).toContain("'emr-intake-treatment-history-review'");
});

test('reopening an immutable BPS review shows stored patient reports separately from unsigned clinician notes, without a new save',async()=>{
 const patient='00000000-0000-0000-0000-000000000602';
 const sections=Array.from({length:21},(_,i)=>({title:'Section '+i,domain:'History',disposition:'clinical',fields:[],answered:0}));
 const calls:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{calls.push(url);return {ok:true,json:async()=>({
  patientId:patient,source:{accountId:patient,status:'draft',version:5,updatedAt:'2026-11-10T12:00:00Z'},
  sections,unmappedKeys:[],reviews:[{id:'00000000-0000-0000-0000-000000000610',reviewed:true,
   source_version:4,source_status:'submitted',source_updated_at:'2026-11-10T10:00:00Z',
   created_at:'2026-11-10T10:05:00Z',
   clinical_answers:{counseling_reason:'Historical patient report',suicidal_thoughts_current:'Yes',
    roi_authorize:'Sensitive legal authorization',medication_entries:'Medication stored separately'},
   clinician_notes:{presenting:'Clinician noted need for follow-up',safety:'Independent risk assessment pending'}}]
 })};}));
 const {container}=render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Previously saved immutable clinician reviews/);
 expect(container.textContent).toContain('source v4 (submitted)');
 expect(container.textContent).toContain('Historical patient report');
 expect(container.textContent).toContain('Clinician noted need for follow-up');
 expect(container.textContent).toContain('Independent risk assessment pending');
 expect(container.textContent).toContain('patient reported');
 expect(container.textContent).not.toContain('Sensitive legal authorization');
 expect(container.textContent).not.toContain('Medication stored separately');
 expect(container.textContent).toContain('not a new import, verified clinical finding');
 expect(container.querySelector('form')).toBeNull();
 expect(calls).toEqual(['/api/emr/bps-intake?patient='+patient]);
});

test('acknowledged BPS save is never reported as unsaved when subsequent history refresh fails',async()=>{
 const patient='00000000-0000-0000-0000-000000000701';
 const sections=Array.from({length:21},(_,i)=>({title:'Section '+i,domain:'Clinical history',
  disposition:'clinical',fields:[],answered:0}));
 let reads=0,saves=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init?:RequestInit)=>{
  if(init?.method==='POST'){saves++;return {ok:true,json:async()=>({saved:true,id:'00000000-0000-0000-0000-000000000702'})};}
  reads++;
  if(reads>1)return {ok:false,json:async()=>({error:'History refresh temporarily unavailable'})};
  return {ok:true,json:async()=>({patientId:patient,
   source:{accountId:patient,status:'submitted',version:2,updatedAt:'2026-11-10T12:00:00Z',submittedAt:'2026-11-10T12:00:00Z'},
   sections,unmappedKeys:[],reviews:[]})};
 }));
 render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Sections audited: 21\/21/);
 fireEvent.click(screen.getByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i}));
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this intake/i}));
 fireEvent.click(screen.getByRole('button',{name:/Save reviewed BPS history snapshot/i}));
 await screen.findByText(/save was acknowledged by the database, but the exact clinician review was NOT verified/i);
 expect(screen.getByText(/do not submit it again/i)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 expect(saves).toBe(1);
 expect(reads).toBe(2);
});



// This intentionally bypasses the real API's history-order validation to verify
// that a stale, incorrectly cached, or malformed response also fails closed in
// the independent clinician UI. No production record is created.
test.each(['duplicate ID','reversed timestamps','incorrect UUID tie-break'])(
 'clinician BPS withholds all history and save controls for %s',async(variant)=>{
  const patient='00000000-0000-4000-8000-000000000970';
  const idA='00000000-0000-4000-8000-000000000971';
  const idB='00000000-0000-4000-8000-000000000972';
  const sectionNames=Array.from({length:21},(_,i)=>({
   title:'Clinical intake section '+i,domain:'Source audit',disposition:'clinical' as const,fields:[],answered:0
  }));
  const historical=(id:string,created_at:string)=>({
   id,reviewed:true,source_version:2,source_status:'submitted',
   source_updated_at:'2026-11-10T08:00:00Z',created_at,
   clinical_answers:{counseling_reason:'PRIVATE_FICTIONAL_HISTORICAL_REPORT'},
   clinician_notes:{presenting:'PRIVATE_FICTIONAL_CLINICIAN_CONTEXT'}
  });
  const newest=historical(idA,'2026-11-10T11:00:00Z');
  const older=historical(idB,'2026-11-10T10:00:00Z');
  const reviews=variant==='duplicate ID'?[newest,{...older,id:idA}]:
   variant==='reversed timestamps'?[older,newest]:
   [newest,{...older,created_at:newest.created_at}];
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({
   patientId:patient,source:{accountId:patient,status:'submitted',version:3,
    updatedAt:'2026-11-10T12:00:00Z',submittedAt:'2026-11-10T12:00:00Z'},
   sections:sectionNames,unmappedKeys:[],reviews
  })})));
  const {container}=render(<PatientBpsIntakeReview patientId={patient}/>);
  await screen.findByRole('alert');
  expect(container.textContent).toContain('invalid saved-row provenance');
  expect(container.textContent).not.toContain('PRIVATE_FICTIONAL_HISTORICAL_REPORT');
  expect(container.textContent).not.toContain('PRIVATE_FICTIONAL_CLINICIAN_CONTEXT');
  expect(screen.queryByRole('button',{name:/Prepare clinician-reviewed BPS intake draft/i})).toBeNull();
  expect(screen.queryByRole('button',{name:/Save reviewed BPS history snapshot/i})).toBeNull();
 }
);

test('clinician BPS retains two valid, strictly ordered historical reviews',async()=>{
 const patient='00000000-0000-4000-8000-000000000973';
 const sections=Array.from({length:21},(_,i)=>({
  title:'Source section '+i,domain:'Clinical context',disposition:'clinical' as const,fields:[],answered:0
 }));
 const row=(id:string,created_at:string)=>({
  id,reviewed:true,source_version:2,source_status:'submitted',
  source_updated_at:'2026-11-10T08:00:00Z',created_at,
  clinical_answers:{counseling_reason:'FICTIONAL_PRESERVED_REPORT'},clinician_notes:{}
 });
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({
  patientId:patient,source:{accountId:patient,status:'submitted',version:3,
   updatedAt:'2026-11-10T12:00:00Z',submittedAt:'2026-11-10T12:00:00Z'},
  sections,unmappedKeys:[],reviews:[
   row('00000000-0000-4000-8000-000000000975','2026-11-10T11:00:00Z'),
   row('00000000-0000-4000-8000-000000000974','2026-11-10T10:00:00Z')
  ]
 })})));
 const {container}=render(<PatientBpsIntakeReview patientId={patient}/>);
 await screen.findByText(/Previously saved immutable clinician reviews \(2\)/);
 expect(container.textContent).toContain('FICTIONAL_PRESERVED_REPORT');
 expect(screen.queryByRole('alert')).toBeNull();
});
