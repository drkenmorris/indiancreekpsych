import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import DiagnosticReferencePanel from '@/app/emr/diagnosis/DiagnosticReferencePanel';
import {diagnosticReference} from '@/lib/emr/diagnosis-reference';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('late reference responses cannot replace a newly selected diagnosis',async()=>{
 let resolveFirst:(value:unknown)=>void=()=>{};
 vi.stubGlobal('fetch',vi.fn((url:string)=>url.includes('F41.1')?new Promise(resolve=>{resolveFirst=resolve;}):Promise.resolve({ok:true,json:async()=>diagnosticReference('F32.1')})));
 const props={name:'Diagnosis 1',onSelectRelated:vi.fn(),selectedRelatedCode:'',selectedCodes:[]};
 const panel=render(<DiagnosticReferencePanel {...props} code="F41.1"/>);
 panel.rerender(<DiagnosticReferencePanel {...props} code="F32.1"/>);
 await screen.findByText(/Assess depressed mood or loss of interest/);
 resolveFirst({ok:true,json:async()=>diagnosticReference('F41.1')});
 await waitFor(()=>expect(screen.queryByText(/Evaluate difficult-to-control worry/)).toBeNull());
 expect(screen.getByText(/Assess depressed mood or loss of interest/)).not.toBeNull();
});
test('codes without a verified criteria overview display the gap instead of a generic criteria set',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>diagnosticReference('F41.9')})));
 render(<DiagnosticReferencePanel name="Diagnosis 1" code="F41.9" onSelectRelated={vi.fn()} selectedRelatedCode="" selectedCodes={[]}/>);
 await screen.findByText(/verified diagnosis-specific criteria overview is not yet available/);
 expect(screen.queryByText(/Evaluate difficult-to-control worry/)).toBeNull();
});
