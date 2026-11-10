import {beforeEach,expect,test,vi} from 'vitest';
import {GET} from '@/app/emr/workspace/route';

const m=vi.hoisted(()=>({patientAccess:vi.fn(),emrAccess:vi.fn(),readFile:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/patient/access',()=>({patientAccess:m.patientAccess}));
vi.mock('@/lib/emr/access',()=>({emrAccess:m.emrAccess,privateHeaders:{'Cache-Control':'private, no-store'}}));
vi.mock('node:fs/promises',async(importOriginal)=>{const original=await importOriginal<typeof import('node:fs/promises')>();return {...original,readFile:m.readFile,default:{...original,readFile:m.readFile}};});
const patient='00000000-0000-4000-8000-000000000101';
const request=(id=patient)=>new Request('https://www.indiancreekpsych.com/emr/workspace?patient='+encodeURIComponent(id));
let lookup:ReturnType<typeof vi.fn>;
beforeEach(()=>{
 vi.clearAllMocks();m.patientAccess.mockResolvedValue({});
 lookup=vi.fn(async()=>({data:{id:patient},error:null}));
 const query={select:vi.fn(),eq:vi.fn(),maybeSingle:lookup};query.select.mockReturnValue(query);query.eq.mockReturnValue(query);
 m.from.mockReturnValue(query);m.emrAccess.mockResolvedValue({supabase:{from:m.from}});
 m.readFile.mockResolvedValue('<!doctype html><html><body>Original clinical workspace</body></html>');
});
test('admin session without aal2 MFA cannot load original clinical workspace',async()=>{
 m.emrAccess.mockResolvedValue(null);
 const response=await GET(request());
 expect(response.status).toBe(307);
 expect(response.headers.get('location')).toContain('/account/security?next=%2Femr');
 expect(m.from).not.toHaveBeenCalled();expect(m.readFile).not.toHaveBeenCalled();
});
test('invalid patient UUID is rejected before any chart lookup',async()=>{
 const response=await GET(request('bad'));expect(response.status).toBe(400);
 expect(m.from).not.toHaveBeenCalled();expect(m.readFile).not.toHaveBeenCalled();
});
test('no selected patient serves original menu shell without querying a chart',async()=>{
 const response=await GET(request(''));expect(response.status).toBe(200);
 expect(m.from).not.toHaveBeenCalled();expect(m.readFile).toHaveBeenCalled();
});
test('unrecognized or unauthorized patient ID is rejected before original HTML is served',async()=>{
 lookup.mockResolvedValue({data:null,error:null});
 const response=await GET(request());expect(response.status).toBe(404);
 expect(m.readFile).not.toHaveBeenCalled();
});
test('central patient lookup failure fails closed, no clinical workspace HTML',async()=>{
 lookup.mockResolvedValue({data:null,error:{message:'RLS unavailable'}});
 const response=await GET(request());expect(response.status).toBe(503);
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 expect(m.readFile).not.toHaveBeenCalled();
});
test('matching authorized central UUID serves original UI with private CSP headers',async()=>{
 const response=await GET(request());
 expect(response.status).toBe(200);
 expect(await response.text()).toContain('Original clinical workspace');
 expect(response.headers.get('Content-Security-Policy')).toContain("script-src 'self'");
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 expect(m.from).toHaveBeenCalledWith('clinical_patients');
 expect(m.patientAccess).toHaveBeenCalledWith(true,'/emr/workspace');
});
