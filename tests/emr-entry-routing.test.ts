import {expect,test,vi} from 'vitest';
import {readFileSync} from 'node:fs';
const mocks=vi.hoisted(()=>({redirect:vi.fn((path:string)=>{throw new Error('redirect '+path);})}));
vi.mock('next/navigation',()=>({redirect:mocks.redirect}));
import EmrPage from '@/app/emr/page';
test('primary EMR entry launches original BPS rather than Central Depository',async()=>{
 await expect(EmrPage({searchParams:Promise.resolve({})})).rejects.toThrow('redirect /emr/workspace?module=assessment&section=assessment%3Abiopsychosocial');
});
test('selected patient and original BPS subpage survive entry redirect',async()=>{
 const patient='11111111-1111-4111-8111-111111111111';
 await expect(EmrPage({searchParams:Promise.resolve({patient,module:'assessment',section:'assessment:biopsychosocial',bps_page:'medical_substance'})})).rejects.toThrow('redirect /emr/workspace?patient='+patient+'&module=assessment&section=assessment%3Abiopsychosocial&bps_page=medical_substance');
});
test('other requested clinical destinations and scheduler remain available',async()=>{
 await expect(EmrPage({searchParams:Promise.resolve({module:'notes',section:'notes:planner'})})).rejects.toThrow('redirect /emr/workspace?module=notes&section=notes%3Aplanner');
 await expect(EmrPage({searchParams:Promise.resolve({module:'schedule'})})).rejects.toThrow('redirect /emr/workspace?module=schedule');
});
test('unrecognized BPS subpage is not propagated',async()=>{
 await expect(EmrPage({searchParams:Promise.resolve({bps_page:'https://example.com'})})).rejects.toThrow('redirect /emr/workspace?module=assessment&section=assessment%3Abiopsychosocial');
});

test('central patient directory opens original BPS by default, not demographics or a synthetic account',()=>{
 const source=readFileSync('app/emr/PatientRepository.tsx','utf8');
 expect(source).toContain('href={"/emr?patient="+encodeURIComponent(selected.id)}');
 expect(source).toContain('Open original biopsychosocial EMR and clinical modules');
 expect(source).not.toContain('href={"/emr/workspace?patient="+selected.id}');
});

test('original BPS intake link carries the active clinical subpage into protected source review',()=>{
 const source=readFileSync('public/emr-assets/app.js','utf8');
 expect(source).toContain('data-bps-intake-review href="/emr/bps-intake?patient=${encodeURIComponent(patientId)}&bps_page=${encodeURIComponent(bpsSubpage())}"');
});


test('original BPS UI boots from the real clinic Supabase administrator + MFA identity, never a demo provider login',()=>{
 const html=readFileSync('public/emr-assets/index.html','utf8');
 const central=readFileSync('public/emr-assets/central-directory.js','utf8');
 expect(html.indexOf('/emr-assets/central-directory.js')).toBeGreaterThan(html.indexOf('/emr-assets/app.js'));
 expect(central).toContain('initProviderUI=async function()');
 expect(central).toContain("fetch('/api/emr/workflow',{method:'GET',cache:'no-store',credentials:'same-origin'})");
 expect(central).toContain('identity.me.is_admin!==true');
 expect(central).toContain('const opened=await startClinicalWorkspace()');
 expect(central).not.toContain("localStorage.setItem(PROVIDER_WORKSPACE_KEY");
});
test('legacy fictitious provider registration cannot replace clinic accounts',()=>{
 const central=readFileSync('public/emr-assets/central-directory.js','utf8');
 expect(central).toContain('providerAPI=function()');
 expect(central).toContain('Prototype provider accounts are disabled');
 expect(central).toContain('providerEntry=function()');
 expect(central).toContain('/login?next=%2Femr');
 expect(central).toContain('/account/security?next=%2Femr');
});
test('original clinical modules retain existing appointment and assessment-assignment services',()=>{
 const central=readFileSync('public/emr-assets/central-directory.js','utf8');
 const production=readFileSync('public/emr-assets/production.js','utf8');
 expect(production).toContain("location.assign('/appointments')");
 expect(central).toContain('/admin/assign-test');
 expect(central).toContain('renderProviderWorkspace=function()');
 expect(central).toContain('/appointments');
});
