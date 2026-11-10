import React from 'react';
import {expect,test,vi,beforeEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import EmrPage from '@/app/emr/page';
const mocks=vi.hoisted(()=>({getUser:vi.fn(),access:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:mocks.getUser}})}));
vi.mock('@/lib/emr/access',()=>({emrAccess:mocks.access}));
beforeEach(()=>{mocks.getUser.mockReset();mocks.access.mockReset();});
test('anonymous visitor sees EMR entry and existing clinic login, never patient directory',async()=>{
 mocks.getUser.mockResolvedValue({data:{user:null}});
 const body=renderToStaticMarkup(await EmrPage());
 expect(body).toContain('Electronic Medical Records');
 expect(body).toContain('Sign in to EMR');
 expect(body).toContain('/login?next=%2Femr');
 expect(body).not.toContain('Open patient directory');
 expect(mocks.access).not.toHaveBeenCalled();
});
test('signed-in user without admin MFA cannot see clinical workspace shortcuts',async()=>{
 mocks.getUser.mockResolvedValue({data:{user:{id:'fictional-user'}}});
 mocks.access.mockResolvedValue(null);
 const body=renderToStaticMarkup(await EmrPage());
 expect(body).toContain('Complete administrator verification');
 expect(body).toContain('/account/security?next=%2Femr');
 expect(body).not.toContain('Open patient directory');
});
test('verified administrator sees entry dashboard and links to existing patient records and scheduler',async()=>{
 mocks.getUser.mockResolvedValue({data:{user:{id:'fictional-admin'}}});
 mocks.access.mockResolvedValue({user:{id:'fictional-admin'}});
 const body=renderToStaticMarkup(await EmrPage());
 expect(body).toContain('Administrator access verified');
 for(const path of ['/emr/patients','/emr/groups','/emr/treatment-planners','/appointments'])
   expect(body).toContain(path);
 expect(body).not.toContain('Sign in to EMR');
});
