import { beforeEach, expect, test, vi } from 'vitest';
const mock=vi.hoisted(()=>({getUser:vi.fn(),assurance:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:mock.getUser,mfa:{getAuthenticatorAssuranceLevel:mock.assurance}},rpc:mock.rpc})}));
import {asqRecipientAccess} from '../lib/clinical-tests/asq/recipient-access';
beforeEach(()=>{
 vi.clearAllMocks();
 mock.getUser.mockResolvedValue({data:{user:{id:'synthetic',email_confirmed_at:'verified'}},error:null});
 mock.assurance.mockResolvedValue({data:{currentLevel:'aal1'},error:null});
 mock.rpc.mockResolvedValue({data:true,error:null});
});
test('verified patient can reach recipient identity checks without enrolling MFA',async()=>{
 expect(await asqRecipientAccess()).not.toBeNull();expect(mock.rpc).toHaveBeenCalledWith('patient_security_ready');
});
test.each([{data:false,error:null},{data:true,error:{message:'offline'}}])('failed patient readiness is denied: %j',async result=>{
 mock.rpc.mockResolvedValue(result);expect(await asqRecipientAccess()).toBeNull();
});
test('MFA-verified recipients retain their existing access path',async()=>{
 mock.assurance.mockResolvedValue({data:{currentLevel:'aal2'},error:null});
 expect(await asqRecipientAccess()).not.toBeNull();expect(mock.rpc).not.toHaveBeenCalled();
});
test('unverified email and assurance errors fail closed',async()=>{
 mock.getUser.mockResolvedValue({data:{user:{id:'synthetic'}},error:null});expect(await asqRecipientAccess()).toBeNull();
 mock.getUser.mockResolvedValue({data:{user:{id:'synthetic',email_confirmed_at:'verified'}},error:null});
 mock.assurance.mockResolvedValue({data:null,error:{message:'offline'}});expect(await asqRecipientAccess()).toBeNull();
});
