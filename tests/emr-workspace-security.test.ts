import {beforeEach,expect,test,vi} from 'vitest';
import {readFileSync} from 'node:fs';
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
test('legacy blank workspace entry redirects to the original BPS menu without looking up a chart',async()=>{
 const legacy=await GET(request(''));
 expect(legacy.status).toBe(307);
 const url=new URL(legacy.headers.get('location')!);
 expect(url.pathname).toBe('/emr/workspace');
 expect(url.searchParams.get('module')).toBe('assessment');
 expect(url.searchParams.get('section')).toBe('assessment:biopsychosocial');
 expect(m.from).not.toHaveBeenCalled();expect(m.readFile).not.toHaveBeenCalled();
 const response=await GET(new Request(url));
 expect(response.status).toBe(200);
 expect(m.from).not.toHaveBeenCalled();expect(m.readFile).toHaveBeenCalledOnce();
});
test('existing patient-only workspace links open the original BPS, while explicit clinical modules are preserved',async()=>{
 const legacy=await GET(request());
 expect(legacy.status).toBe(307);
 const url=new URL(legacy.headers.get('location')!);
 expect(url.searchParams.get('patient')).toBe(patient);
 expect(url.searchParams.get('module')).toBe('assessment');
 expect(url.searchParams.get('section')).toBe('assessment:biopsychosocial');
 expect(m.readFile).not.toHaveBeenCalled();
 expect((await GET(new Request(url))).status).toBe(200);
 const notes=await GET(new Request('https://www.indiancreekpsych.com/emr/workspace?patient='+patient+'&module=notes&section=notes%3Aplanner'));
 expect(notes.status).toBe(200);
 expect(m.readFile).toHaveBeenCalledTimes(2);
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
test('matching authorized central UUID serves original BPS UI with private CSP headers',async()=>{
 const query='patient='+patient+'&module=assessment&section=assessment%3Abiopsychosocial';
 const response=await GET(new Request('https://www.indiancreekpsych.com/emr/workspace?'+query));
 expect(response.status).toBe(200);
 expect(await response.text()).toContain('Original clinical workspace');
 expect(response.headers.get('Content-Security-Policy')).toContain("script-src 'self'");
 expect(response.headers.get('Cache-Control')).toContain('no-store');
 expect(m.from).toHaveBeenCalledWith('clinical_patients');
 expect(m.patientAccess).toHaveBeenCalledWith(true,'/emr/workspace?'+query);
});

test('serverless tracing includes the exact original clinical HTML and all linked prototype controllers',()=>{
 const config=readFileSync('next.config.mjs','utf8');
 const route=readFileSync('app/emr/workspace/route.ts','utf8');
 const html=readFileSync('public/emr-assets/index.html','utf8');
 expect(config).toContain("'/emr/workspace': ['./public/emr-assets/index.html']");
 expect(route).toContain("readFile(join(process.cwd(),'public/emr-assets/index.html')");
 expect(html).toContain('id="workspace"');
 expect(html).toContain('id="main-modules"');
 for(const file of ['planner.js','module-menu.js','app.js','production.js','central-directory.js'])
  expect(html).toContain('src="/emr-assets/'+file+'"');
 // The browser must continue at /emr/workspace with the selected real patient;
 // no synthetic provider login or localStorage chart is substituted by this fix.
 expect(route).toContain("const id=requested.searchParams.get('patient')");
 expect(route).toContain("const ctx=await emrAccess()");
});

test('clinic login and MFA preserve the BPS subpage and real selected patient',async()=>{
 const query='patient='+patient+'&module=assessment&section=assessment%3Abiopsychosocial&bps_page=family_origin';
 const request=new Request('https://www.indiancreekpsych.com/emr/workspace?'+query);
 const expected='/emr/workspace?'+query;
 await GET(request);
 expect(m.patientAccess).toHaveBeenCalledWith(true,expected);
 m.emrAccess.mockResolvedValueOnce(null);
 const blocked=await GET(request);
 expect(blocked.status).toBe(307);
 const next=new URL(blocked.headers.get('location')!).searchParams.get('next');
 expect(next).toBe(expected);
 expect(m.readFile).toHaveBeenCalledTimes(1);
});
test('authentication return destination ignores untrusted redirect parameters',async()=>{
 const request=new Request('https://www.indiancreekpsych.com/emr/workspace?module=assessment&section=assessment%3Abiopsychosocial&next=https%3A%2F%2Fevil.example');
 m.emrAccess.mockResolvedValue(null);
 const blocked=await GET(request);
 expect(blocked.status).toBe(307);
 expect(new URL(blocked.headers.get('location')!).searchParams.get('next'))
  .toBe('/emr/workspace?module=assessment&section=assessment%3Abiopsychosocial');
 expect(m.from).not.toHaveBeenCalled();
});
