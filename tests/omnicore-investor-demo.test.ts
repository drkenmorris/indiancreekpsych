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

describe('published synthetic discovery resource',()=>{
  it('is absent outside activation',async()=>{
    vi.stubEnv('OMNICORE_DEMO_UNTIL','');
    const {GET}=await import('../app/.well-known/omnicore-exercise/route');
    expect((await GET(new Request('https://www.indiancreekpsych.com/.well-known/omnicore-exercise'))).status).toBe(404);
  });
  it('publishes only dummy capabilities on the exact clinic hosts during activation',async()=>{
    vi.stubEnv('OMNICORE_DEMO_UNTIL',new Date(Date.now()+60000).toISOString());
    const {GET}=await import('../app/.well-known/omnicore-exercise/route');
    const response=await GET(new Request('https://www.indiancreekpsych.com/.well-known/omnicore-exercise'));
    expect(response.status).toBe(200);const data=await response.json();
    expect(data.synthetic).toBe(true);expect(data.canary).toBe('DUMMY_DISCOVERY_CANARY_ONLY');expect(data.actions).toHaveLength(9);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await GET(new Request('https://preview.example/.well-known/omnicore-exercise'))).status).toBe(404);
  });
});
