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
 }else{
  await screen.findByText(/Save may have committed; DO NOT blindly resubmit/);
  expect(screen.queryByText(/Central patient demographics saved and independently reopened/)).toBeNull();
  if(scenario==='wrong detail identity')expect(document.body.textContent).toContain('exact chart could not be reopened');
  if(scenario==='wrong chart receipt')expect(document.body.textContent).toContain('receipt did not match');
 }
 expect(posts).toBe(1);
 expect(requests.filter(request=>request==='POST /api/emr/patients')).toHaveLength(1);
 // The UI must never silently reissue a clinical chart write after a
 // possible-commit acknowledgment or a mismatched directory/readback.
});
