import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import PatientRepository from '@/app/emr/PatientRepository';

// Fictional DOM + mocked API only. These cases do NOT establish authenticated
// clinical production acceptance or modify any real chart.
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

const chart='00000000-0000-4000-8000-000000000651';
const account='00000000-0000-4000-8000-000000000652';
const wrongChart='00000000-0000-4000-8000-000000000653';
const patient=(revision:number,id=chart)=>({
 id,account_id:account,revision,
 demographics:{first_name:'Fictional',last_name:'Patient',city:'Original'},
 profiles:null
});
type Scenario='stale revision'|'missing directory row'|'wrong chart receipt'|'wrong detail identity'|'wrong detail revision'|'wrong detail field'|'changed linked account'|'wrong persisted values'|'verified same chart';
test.each([
 'stale revision','missing directory row','wrong chart receipt',
 'wrong detail identity','wrong detail revision','wrong detail field',
 'changed linked account','wrong persisted values','verified same chart'
] as Scenario[])('a demographics POST receipt cannot claim independently verified chart persistence: %s',async scenario=>{
 let posts=0;
 const requests:string[]=[];
 const latest={...patient(3),demographics:{...patient(3).demographics,city:'Updated fictional city'}};
 vi.stubGlobal('fetch',vi.fn(async (url:string,init?:RequestInit)=>{
  const method=init?.method??'GET';
  requests.push(method+' '+url);
  if(url==='/api/emr/patients'&&method==='POST'){
   posts++;
   const body=JSON.parse(String(init?.body??'{}'));
   expect(body).toMatchObject({id:chart,expectedRevision:2});
   return Response.json({id:scenario==='wrong chart receipt'?wrongChart:chart});
  }
  if(url==='/api/emr/patients'){
   const rows=posts===0?[patient(2)]:
    scenario==='missing directory row'?[]:
    scenario==='stale revision'?[patient(2)]:
    scenario==='wrong persisted values'?[patient(3)]:
    scenario==='changed linked account'?[{...latest,account_id:wrongChart}]:[latest];
   return Response.json({patients:rows});
  }
  if(url.startsWith('/api/emr/patients?id=')){
   const row=posts>0&&scenario==='wrong detail identity'?{...latest,id:wrongChart}:
    posts>0&&scenario==='wrong detail revision'?{...latest,revision:2}:
    posts>0&&scenario==='wrong detail field'?patient(3):
    posts>0?latest:patient(2);
   return Response.json({patients:[row],intake:null});
  }
  if(url.startsWith('/api/emr/dsm-records?'))return Response.json({records:[]});
  if(url.startsWith('/api/emr/bps-intake'))return Response.json({error:'No fictional intake'},{status:404});
  if(url==='/api/emr/workflow')return Response.json({value:{records:[]},revision:1});
  return Response.json({records:[]});
 }));
 render(<PatientRepository/>);
 fireEvent.click(await screen.findByRole('button',{name:/Fictional Patient.*Linked patient account/i}));
 await screen.findByText(/Central patient ID:/);
 const save=screen.getByRole('button',{name:'Save central demographics'}) as HTMLButtonElement;
 await waitFor(()=>expect(save.disabled).toBe(false));
 fireEvent.change(screen.getByLabelText('City'),{target:{value:'Updated fictional city'}});
 fireEvent.click(save);
 if(scenario==='verified same chart'){
  await screen.findByText(/Central patient demographics saved and independently reopened in the correct chart/);
  expect((screen.getByLabelText('City') as HTMLInputElement).value).toBe('Updated fictional city');
  expect(save.disabled).toBe(false);
 }else{
  await screen.findByText(/Save may have committed; DO NOT blindly resubmit/);
  expect(screen.queryByText(/Central patient demographics saved and independently reopened/)).toBeNull();
  expect(save.disabled).toBe(true);
  expect(document.body.textContent).toContain('Another save is locked');
  fireEvent.click(save); // No second clinical write when the first may already have committed.
  if(scenario==='wrong detail identity')expect(document.body.textContent).toContain('exact chart could not be reopened');
  if(scenario==='wrong chart receipt')expect(document.body.textContent).toContain('receipt did not match');
 }
 expect(posts).toBe(1);
 expect(requests.filter(request=>request==='POST /api/emr/patients')).toHaveLength(1);
 // The UI must never silently reissue a clinical chart write after a
 // possible-commit acknowledgment or a mismatched directory/readback.
});

test('a directory selection does not mount patient clinical panels before verified chart readback, and fails closed on wrong identity',async()=>{
 let resolveDetail:((response:Response)=>void)|undefined;
 const requestLog:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async (url:string)=>{
  requestLog.push(url);
  if(url==='/api/emr/patients')return Response.json({patients:[patient(2)]});
  if(url==='/api/emr/dsm-records?patient='+chart)return Response.json({records:[]});
  if(url==='/api/emr/patients?id='+chart)
   return new Promise<Response>(resolve=>{resolveDetail=resolve;});
  return Response.json({records:[]});
 }));
 render(<PatientRepository/>);
 fireEvent.click(await screen.findByRole('button',{name:/Fictional Patient.*Linked patient account/i}));
 await waitFor(()=>expect(resolveDetail).toBeTypeOf('function'));
 // The directory list is not proof of identity. No protected chart UI,
 // BPS review, reconciliation or progress notes may mount while it is pending.
 expect(screen.queryByText(/Central patient ID:/)).toBeNull();
 expect(screen.queryByRole('heading',{name:'Patient intake source'})).toBeNull();
 expect(screen.queryByText(/Clinician-reviewed BPS/i)).toBeNull();
 resolveDetail?.(Response.json({patients:[patient(2,wrongChart)],intake:null}));
 await screen.findByText(/Central chart readback identity or revision was not verified/);
 expect(screen.queryByText(/Central patient ID:/)).toBeNull();
 expect(screen.queryByRole('heading',{name:'Patient intake source'})).toBeNull();
 expect(screen.getByRole('heading',{name:'New central patient record'})).toBeTruthy();
 expect(requestLog.filter(url=>url==='/api/emr/patients?id='+chart)).toHaveLength(1);
});


test.each([
 'connection lost after sending POST',
 'malformed success receipt',
 'HTTP 503 without a reliable save receipt'
] as const)('an uncertain demographics POST cannot be retried from the opened chart: %s',async scenario=>{
 let posts=0;
 vi.stubGlobal('fetch',vi.fn(async (url:string,init?:RequestInit)=>{
  if(url==='/api/emr/patients'&&init?.method==='POST'){
   posts++;
   if(scenario==='connection lost after sending POST')throw Error('Fictional network interruption');
   if(scenario==='malformed success receipt')return new Response('not valid JSON',{status:200});
   return Response.json({error:'Fictional unavailable receipt'},{status:503});
  }
  if(url==='/api/emr/patients')return Response.json({patients:[patient(2)]});
  if(url==='/api/emr/patients?id='+chart)return Response.json({patients:[patient(2)],intake:null});
  if(url.startsWith('/api/emr/dsm-records?'))return Response.json({records:[]});
  if(url.startsWith('/api/emr/bps-intake'))return Response.json({error:'No fictional intake'},{status:404});
  if(url==='/api/emr/workflow')return Response.json({value:{records:[]},revision:1});
  return Response.json({records:[]});
 }));
 render(<PatientRepository/>);
 fireEvent.click(await screen.findByRole('button',{name:/Fictional Patient.*Linked patient account/i}));
 await screen.findByText(/Central patient ID:/);
 const save=screen.getByRole('button',{name:'Save central demographics'}) as HTMLButtonElement;
 fireEvent.change(screen.getByLabelText('City'),{target:{value:'Fictional changed city'}});
 fireEvent.click(save);
 await screen.findByText(/Save may have committed; DO NOT blindly resubmit/);
 expect(save.disabled).toBe(true);
 expect(document.body.textContent).toContain('Another save is locked');
 expect(screen.queryByText(/saved and independently reopened in the correct chart/)).toBeNull();
 fireEvent.click(save);
 expect(posts).toBe(1);
});

test('an interrupted new-patient POST locks a second creation until directory verification',async()=>{
 let posts=0;
 vi.stubGlobal('fetch',vi.fn(async (url:string,init?:RequestInit)=>{
  if(url==='/api/emr/patients'&&init?.method==='POST'){
   posts++;
   // The database may have committed before the client lost this response.
   throw Error('Fictional connection interruption after create');
  }
  if(url==='/api/emr/patients')return Response.json({patients:[]});
  return Response.json({records:[]});
 }));
 render(<PatientRepository/>);
 await screen.findByRole('heading',{name:'New central patient record'});
 fireEvent.change(screen.getByLabelText('First name'),{target:{value:'Fictional'}});
 fireEvent.change(screen.getByLabelText('Last name'),{target:{value:'Unverified'}});
 const save=screen.getByRole('button',{name:'Save central demographics'}) as HTMLButtonElement;
 fireEvent.click(save);
 await screen.findByText(/Save may have committed; DO NOT blindly resubmit/);
 expect(document.body.textContent).toContain('check the patient directory and exact patient chart');
 expect(save.disabled).toBe(true);
 fireEvent.click(save);
 expect(posts).toBe(1);
});


test('an uncertain existing patient write stays locked if a DIFFERENT chart is reopened',async()=>{
 const other=patient(2,wrongChart);
 let posts=0;
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  if(url==='/api/emr/patients'&&init?.method==='POST'){
   posts++;
   return Response.json({error:'Fictional uncertain database receipt'},{status:503});
  }
  if(url==='/api/emr/patients')return Response.json({patients:[patient(2),other]});
  if(url.startsWith('/api/emr/patients?id=')){
   return Response.json({patients:[url.endsWith(wrongChart)?other:patient(2)],intake:null});
  }
  if(url.startsWith('/api/emr/dsm-records?'))return Response.json({records:[]});
  if(url.startsWith('/api/emr/bps-intake'))return Response.json({error:'No fictional intake'},{status:404});
  if(url==='/api/emr/workflow')return Response.json({value:{records:[]},revision:1});
  return Response.json({records:[]});
 }));
 render(<PatientRepository/>);
 const buttons=await screen.findAllByRole('button',{name:/Fictional Patient.*Linked patient account/i});
 expect(buttons).toHaveLength(2);
 fireEvent.click(buttons[0]);
 await waitFor(()=>expect(document.body.textContent).toContain('Central patient ID: '+chart));
 const save=screen.getByRole('button',{name:'Save central demographics'}) as HTMLButtonElement;
 fireEvent.change(screen.getByLabelText('City'),{target:{value:'Fictional changed city'}});
 fireEvent.click(save);
 await screen.findByText(/Save may have committed; DO NOT blindly resubmit/);
 expect(save.disabled).toBe(true);
 fireEvent.click(buttons[1]);
 await waitFor(()=>expect(document.body.textContent).toContain('Central patient ID: '+wrongChart));
 expect(save.disabled).toBe(true);
 expect(document.body.textContent).toContain('Opening a different patient chart does not clear the interlock');
 // Only the verified, originally affected chart can clear the uncertain write.
 fireEvent.click(buttons[0]);
 await waitFor(()=>expect(document.body.textContent).toContain('Central patient ID: '+chart));
 await waitFor(()=>expect(save.disabled).toBe(false));
 expect(posts).toBe(1);
});

test('two direct form submit events cannot transmit two patient writes before React renders busy state',async()=>{
 let posts=0;
 let resolvePost:((response:Response)=>void)|undefined;
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  if(url==='/api/emr/patients'&&init?.method==='POST'){
   posts++;
   return new Promise<Response>(resolve=>{resolvePost=resolve;});
  }
  if(url==='/api/emr/patients')return Response.json({patients:[patient(2)]});
  if(url==='/api/emr/patients?id='+chart)return Response.json({patients:[patient(2)],intake:null});
  if(url.startsWith('/api/emr/dsm-records?'))return Response.json({records:[]});
  if(url.startsWith('/api/emr/bps-intake'))return Response.json({error:'No fictional intake'},{status:404});
  if(url==='/api/emr/workflow')return Response.json({value:{records:[]},revision:1});
  return Response.json({records:[]});
 }));
 render(<PatientRepository/>);
 fireEvent.click(await screen.findByRole('button',{name:/Fictional Patient.*Linked patient account/i}));
 await screen.findByText(/Central patient ID:/);
 const form=screen.getByRole('button',{name:'Save central demographics'}).closest('form');
 expect(form).not.toBeNull();
 fireEvent.submit(form!);
 fireEvent.submit(form!);
 expect(posts).toBe(1);
 expect(resolvePost).toBeTypeOf('function');
 resolvePost?.(Response.json({error:'Fictional uncertain receipt'},{status:503}));
 await screen.findByText(/Save may have committed; DO NOT blindly resubmit/);
 expect(posts).toBe(1);
});
