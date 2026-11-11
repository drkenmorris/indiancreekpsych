import React from 'react';
import {readFileSync} from 'node:fs';
import {beforeEach,expect,test,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import EmrPatientsPage from '@/app/emr/patients/page';
const m=vi.hoisted(()=>({patientAccess:vi.fn()}));
vi.mock('@/lib/patient/access',()=>({patientAccess:m.patientAccess}));
vi.mock('@/app/components/AdministrativeShell',()=>({default:({children}:{children:React.ReactNode})=><>{children}</>}));
vi.mock('@/app/emr/PatientRepository',()=>({default:()=> <p>Protected central patient directory</p>}));
const patient='00000000-0000-4000-8000-000000000101';
beforeEach(()=>{vi.clearAllMocks();m.patientAccess.mockResolvedValue({});});
test('patient-specific medication and allergy review survives a login or MFA round-trip',async()=>{
 const review='emr-intake-medication-review';
 const result=await EmrPatientsPage({searchParams:Promise.resolve({patient,review})});
 expect(renderToStaticMarkup(result)).toContain('Protected central patient directory');
 expect(m.patientAccess).toHaveBeenCalledWith(true,'/emr/patients?patient='+patient+'&review='+review);
});
test('malicious or unsupported patient/review arguments cannot rewrite the clinical return destination',async()=>{
 await EmrPatientsPage({searchParams:Promise.resolve({patient:'https://malicious.example',review:'https://malicious.example'})});
 expect(m.patientAccess).toHaveBeenLastCalledWith(true,'/emr/patients');
 await EmrPatientsPage({searchParams:Promise.resolve({patient,review:'../admin/assign-test'})});
 expect(m.patientAccess).toHaveBeenLastCalledWith(true,'/emr/patients?patient='+patient);
});
test('source links and central chart use matching whitelisted review targets after patient data load',()=>{
 const source=readFileSync('app/emr/PatientBpsIntakeReview.tsx','utf8');
 const directory=readFileSync('app/emr/PatientRepository.tsx','utf8');
 expect(source).toContain("'&review='+encodeURIComponent(target.anchor)");
 expect(directory).toContain("params.get('patient')!==selected.id");
 expect(directory).toContain("clinicianReviewAnchors.has(target)");
 expect(directory).toContain("scrollIntoView?.({block:'start'})");
});
