import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import PatientRepository from '@/app/emr/PatientRepository';

// Fictional API fixtures only. No production charts, credentials or schedules
// are read or changed by these browser-component regression scenarios.
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

const chart='00000000-0000-4000-8000-000000000651';
const originalAccount='00000000-0000-4000-8000-000000000652';
const differentAccount='00000000-0000-4000-8000-000000000653';
const baseline={
 id:chart,account_id:originalAccount,revision:2,directory_deleted_at:null,
 demographics:{first_name:'Fictional',last_name:'Patient',city:'Test'},
 profiles:null
};
const intake={status:'submitted',updated_at:'2026-11-20T16:00:00Z',
 answers:{medication_allergy_notes:'FICTIONAL_PRIVATE_ALLERGY'}};

test.each([
 'account relink',
 'chart revision change',
 'archived chart',
 'revoked protected API',
] as const)('background chart verification closes ALL clinical panels after %s',async reason=>{
 let detailReads=0,writes=0;
 vi.stubGlobal('fetch',vi.fn(async (url:string,init?:RequestInit)=>{
  // Some existing clinical panels use POST for read-only workspace lookups.
  // Count only writes to the patient-directory or BPS-review endpoints;
  // unrelated fixture-backed lookups are not chart mutations.
  if((init?.method==='POST'||init?.method==='PATCH')&&
     (url==='/api/emr/patients'||url==='/api/emr/bps-intake'))writes++;
  if(url==='/api/emr/patients')return Response.json({patients:[baseline]});
  if(url==='/api/emr/patients?id='+chart){
   detailReads++;
   if(detailReads===1)return Response.json({patients:[baseline],intake});
   if(reason==='revoked protected API')return Response.json({error:'MFA required'},{status:403});
   const changed=reason==='account relink'?{...baseline,account_id:differentAccount}:
    reason==='chart revision change'?{...baseline,revision:3}:
    {...baseline,directory_deleted_at:'2026-11-21T12:00:00Z'};
   return Response.json({patients:[changed],intake:{
    ...intake,answers:{medication_allergy_notes:'NEW_LINKED_ACCOUNT_PRIVATE_SOURCE'}
   }});
  }
  if(url.startsWith('/api/emr/dsm-records?'))return Response.json({records:[]});
  if(url.startsWith('/api/emr/bps-intake'))return Response.json({error:'No linked fictional BPS intake'},{status:404});
  if(url==='/api/emr/workflow')return Response.json({value:{records:[]},revision:1});
  return Response.json({records:[]});
 }));
 render(<PatientRepository/>);
 fireEvent.click(await screen.findByRole('button',{name:/Fictional Patient.*Linked patient account/i}));
 await screen.findByText(/Central patient ID:/);
 expect(screen.getByRole('heading',{name:'Patient intake source'})).toBeTruthy();
 expect(document.body.textContent).toContain('FICTIONAL_PRIVATE_ALLERGY');

 await act(async()=>{window.dispatchEvent(new Event('focus'));});
 await screen.findByText(/All patient-specific clinical panels were closed/);
 expect(detailReads).toBe(2);
 expect(screen.queryByText(/Central patient ID:/)).toBeNull();
 expect(screen.queryByRole('heading',{name:'Patient intake source'})).toBeNull();
 expect(screen.queryByRole('heading',{name:/Biopsychosocial assessment — 21-section intake reconciliation/i})).toBeNull();
 expect(document.body.textContent).not.toContain('FICTIONAL_PRIVATE_ALLERGY');
 expect(document.body.textContent).not.toContain('NEW_LINKED_ACCOUNT_PRIVATE_SOURCE');
 expect(screen.getByRole('heading',{name:'New central patient record'})).toBeTruthy();
 expect(writes).toBe(0);
});
