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

test('original BPS intake link carries the active clinical subpage into protected source review',()=>{
 const source=readFileSync('public/emr-assets/app.js','utf8');
 expect(source).toContain('data-bps-intake-review href="/emr/bps-intake?patient=${encodeURIComponent(patientId)}&bps_page=${encodeURIComponent(bpsSubpage())}"');
});
