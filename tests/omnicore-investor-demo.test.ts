import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST } from '../app/api/omnicore-investor-demo/action/route';

afterEach(()=>vi.unstubAllEnvs());
describe('investor exercise deployment boundary',()=>{
  it('is disabled when no activation is configured',async()=>{
    vi.stubEnv('OMNICORE_DEMO_UNTIL','');
    const response=await POST(new Request('https://www.indiancreekpsych.com/api/omnicore-investor-demo/action',{method:'POST'}));
    expect(response.status).toBe(404);
  });
  it('rejects activation beyond the maximum short window',async()=>{
    vi.stubEnv('OMNICORE_DEMO_UNTIL',new Date(Date.now()+3600000).toISOString());
    const response=await POST(new Request('https://www.indiancreekpsych.com/api/omnicore-investor-demo/action',{method:'POST'}));
    expect(response.status).toBe(404);
  });
  it('does not expose the route in a preview even with configuration present',async()=>{
    vi.stubEnv('OMNICORE_DEMO_UNTIL',new Date(Date.now()+60000).toISOString());
    for(const name of ['OMNICORE_DEMO_RUN_SECRET','OMNICORE_DEMO_BOT_SECRET','OMNICORE_DEMO_WITNESS_SECRET',
      'OMNICORE_DEMO_APPROVED_ORIGIN','OMNICORE_DEMO_UNAPPROVED_ORIGIN','OMNICORE_SITE_ID','OMNICORE_INGEST_KEY'])vi.stubEnv(name,'test-only');
    const response=await POST(new Request('https://clinic-preview.example/api/omnicore-investor-demo/action',{method:'POST'}));
    expect(response.status).toBe(404);
  });
});
