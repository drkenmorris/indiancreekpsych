import {expect,test,vi,beforeEach} from 'vitest';
import EmrPage from '@/app/emr/page';
const redirect=vi.hoisted(()=>vi.fn((path:string)=>{throw Error('redirect '+path);}));
vi.mock('next/navigation',()=>({redirect}));
beforeEach(()=>vi.clearAllMocks());
test('EMR entry goes directly to original workspace, without a replacement landing page',async()=>{await expect(EmrPage()).rejects.toThrow('redirect /emr/workspace');});
test('explicit patient and original menu section survive the entry route',async()=>{await expect(EmrPage({searchParams:Promise.resolve({patient:'00000000-0000-4000-8000-000000000101',module:'module-section',section:'assessment:strengths'})})).rejects.toThrow('redirect /emr/workspace?patient=00000000-0000-4000-8000-000000000101&module=module-section&section=assessment%3Astrengths');});
