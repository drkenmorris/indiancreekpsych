import React from 'react';
import {expect,test,vi,beforeEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import EmrPage from '@/app/emr/page';
const mocks=vi.hoisted(()=>({getUser:vi.fn(),access:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:mocks.getUser}})}));
vi.mock('@/lib/emr/access',()=>({emrAccess:mocks.access}));
beforeEach(()=>{
 vi.clearAllMocks();
 mocks.getUser.mockResolvedValue({data:{user:{id:'demo-admin'}}});
 const chain={select:()=>chain,order:()=>chain,limit:async()=>({data:[{id:'00000000-0000-4000-8000-000000000101',demographics:{first_name:'Fictional',last_name:'Patient'}}],error:null})};
 mocks.from.mockReturnValue(chain);
 mocks.access.mockResolvedValue({supabase:{from:mocks.from}});
});
test('anonymous gets administrator login, no clinical patient information',async()=>{
 mocks.getUser.mockResolvedValue({data:{user:null}});
 const body=renderToStaticMarkup(await EmrPage());
 expect(body).toContain('Sign in to EMR');
 expect(body).toContain('/login?next=%2Femr');
 expect(body).not.toContain('Fictional Patient');
 expect(mocks.from).not.toHaveBeenCalled();
});
test('nonadministrator or missing MFA sees verification, no patient list',async()=>{
 mocks.access.mockResolvedValue(null);
 const body=renderToStaticMarkup(await EmrPage());
 expect(body).toContain('Complete administrator verification');
 expect(body).toContain('/account/security?next=%2Femr');
 expect(body).not.toContain('Fictional Patient');
 expect(mocks.from).not.toHaveBeenCalled();
});
test('verified admin can launch actual BPS workspace and other original modules',async()=>{
 const body=renderToStaticMarkup(await EmrPage());
 expect(body).toContain('Fictional Patient');
 expect(body).toContain('Open biopsychosocial assessment');
 expect(body).toContain('module=assessment');
 expect(body).toContain('section=assessment%3Abiopsychosocial');
 expect(body).toContain('/emr/workspace?patient=00000000-0000-4000-8000-000000000101');
 for(const module of ['notes','plan','privacy','insurance','history'])expect(body).toContain('module='+module);
 expect(mocks.from).toHaveBeenCalledWith('clinical_patients');
});
test('production scheduler and test assignment/email remain separate linked services',async()=>{
 const body=renderToStaticMarkup(await EmrPage());
 expect(body).toContain('/admin/assign-test');
 expect(body).toContain('Psychological test assignment and email');
 expect(body).toContain('href="/appointments"');
 expect(body).not.toContain('synthetic scheduler');
});
test('failed patient repository yields an error without invented patient names',async()=>{
 const chain={select:()=>chain,order:()=>chain,limit:async()=>({data:null,error:{message:'offline'}})};
 mocks.from.mockReturnValue(chain);
 const body=renderToStaticMarkup(await EmrPage());
 expect(body).toContain('patient directory is temporarily unavailable');
 expect(body).not.toContain('Fictional Patient');
});
