import React from 'react';
import {beforeEach,expect,test,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import EmrBpsIntakePage from '@/app/emr/bps-intake/page';

const m=vi.hoisted(()=>({patientAccess:vi.fn(),emrAccess:vi.fn(),from:vi.fn(),
 redirect:vi.fn((path:string)=>{throw Error('redirect '+path);}),
 notFound:vi.fn(()=>{throw Error('not-found');})}));
vi.mock('@/lib/patient/access',()=>({patientAccess:m.patientAccess}));
vi.mock('@/lib/emr/access',()=>({emrAccess:m.emrAccess}));
vi.mock('next/navigation',()=>({redirect:m.redirect,notFound:m.notFound}));
vi.mock('@/app/emr/PatientBpsIntakeReview',()=>({default:({patientId}:{patientId:string})=><div>Review for central patient {patientId}</div>}));
const patient='00000000-0000-4000-8000-000000000101';
const props=(id=patient,bps_page?:string)=>({searchParams:Promise.resolve({patient:id,bps_page})});
let lookup:ReturnType<typeof vi.fn>;
beforeEach(()=>{
 vi.clearAllMocks();m.patientAccess.mockResolvedValue({});
 lookup=vi.fn(async()=>({data:{id:patient},error:null}));
 const query={select:vi.fn(),eq:vi.fn(),maybeSingle:lookup};query.select.mockReturnValue(query);query.eq.mockReturnValue(query);
 m.from.mockReturnValue(query);m.emrAccess.mockResolvedValue({supabase:{from:m.from}});
});
test('authorized linked central patient opens original BPS and 21-section source review',async()=>{
 const markup=renderToStaticMarkup(await EmrBpsIntakePage(props()));
 expect(markup).toContain('Review for central patient '+patient);
 expect(markup).toContain('section=assessment%3Abiopsychosocial');
 expect(markup).toContain('/emr/workspace?patient='+patient);
 expect(markup).toContain('/emr/patients?patient='+patient);
 expect(markup).toContain('existing administrator credentials, MFA');
 expect(m.from).toHaveBeenCalledWith('clinical_patients');
});
test('round-trip from original BPS preserves allowed clinical subpage without accepting unsafe navigation input',async()=>{
 const markup=renderToStaticMarkup(await EmrBpsIntakePage(props(patient,'medical_substance')));
 expect(markup).toContain('bps_page=medical_substance');
 const unsafe=renderToStaticMarkup(await EmrBpsIntakePage(props(patient,'https://example.com')));
 expect(unsafe).not.toContain('bps_page=');
});
test('no MFA denies page before reading central patient',async()=>{
 m.emrAccess.mockResolvedValue(null);
 await expect(EmrBpsIntakePage(props())).rejects.toThrow('redirect /account/security');
 expect(m.from).not.toHaveBeenCalled();
});
test('bad patient UUID redirects without lookup or synthetic chart fallback',async()=>{
 await expect(EmrBpsIntakePage(props('bad'))).rejects.toThrow('redirect /emr');
 expect(m.from).not.toHaveBeenCalled();
});
test('missing or unlinked chart cannot render a different patient',async()=>{
 lookup.mockResolvedValue({data:null,error:null});
 await expect(EmrBpsIntakePage(props())).rejects.toThrow('not-found');
});
