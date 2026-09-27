import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const mock=vi.hoisted(()=>({insert:vi.fn(),save:vi.fn(),list:vi.fn(),assurance:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({auth:{mfa:{listFactors:mock.list,getAuthenticatorAssuranceLevel:mock.assurance}},from:()=>{const q:any={};for(const k of ['select','eq','abortSignal','update'])q[k]=()=>q;q.insert=(p:any)=>{mock.insert(p);return q;};q.single=mock.save;return q;}})}));
import IntakeForm from '../app/patient/intake/IntakeForm';
import SecurityClient from '../app/account/security/SecurityClient';
import {validateIntake,IntakeAnswers} from '../lib/patient/intake';
import {safeNext} from '../lib/patient/redirect';
const complete:IntakeAnswers={full_name:'Test Person',date_of_birth:'1990-01-01',address:'1 Example St',city:'Example',state:'KS',postal_code:'66000',phone:'5550100',email:'test@example.com',insurance_coverage:'self-pay',counseling_reason:'Test concern'};
beforeEach(()=>vi.clearAllMocks());afterEach(cleanup);
test('incomplete drafts allowed, submission requires demographics and reason',()=>{expect(validateIntake({},false)).toBeNull();expect(validateIntake({},true)).toContain('Full legal name');expect(validateIntake(complete,true)).toBeNull();});
test('unknown benefit amounts allowed; invalid percentages blocked',()=>{expect(validateIntake({...complete,coinsurance:'I don’t know'},true)).toBeNull();expect(validateIntake({...complete,coinsurance:'101'},true)).toContain('Coinsurance');expect(validateIntake({...complete,deductible:'-1'},true)).toContain('non-negative');});
test('external and script redirects rejected',()=>{for(const url of ['//evil.test','javascript:alert(1)','/\\evil.test','/\nevil'])expect(safeNext(url)).toBe('/account');expect(safeNext('/patient/intake')).toBe('/patient/intake');});
test('submission requires explicit confirmation and preserves answers on save failure',async()=>{
 mock.save.mockResolvedValue({error:{message:'offline'}});render(<IntakeForm userId="patient" initial={null} defaults={complete}/>);
 fireEvent.click(screen.getByRole('button',{name:'Review and submit'}));expect(mock.insert).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm submission'}));await screen.findByRole('alert');expect((screen.getByLabelText(/Full legal name/) as HTMLInputElement).value).toBe('Test Person');expect(mock.insert).toHaveBeenCalledWith({patient_id:'patient',answers:complete,status:'submitted'});
});
test('draft save accepts incomplete answers and confirms success',async()=>{
 mock.save.mockResolvedValue({data:{patient_id:'patient',answers:{},status:'draft',version:1},error:null});render(<IntakeForm userId="patient" initial={null} defaults={{}}/>);fireEvent.click(screen.getByRole('button',{name:'Save draft'}));await screen.findByText('Draft saved securely.');expect(mock.insert).toHaveBeenCalledWith({patient_id:'patient',answers:{},status:'draft'});
});
test('security load failure never offers fresh factor enrollment',async()=>{
 mock.list.mockResolvedValue({error:{message:'offline'}});mock.assurance.mockResolvedValue({error:{message:'offline'}});render(<SecurityClient next="/patient/intake"/>);await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Set up authenticator app'})).toBeNull();
});
test('existing factor requires verification before adding another',async()=>{
 mock.list.mockResolvedValue({data:{all:[{id:'factor',factor_type:'totp',status:'verified'}]},error:null});mock.assurance.mockResolvedValue({data:{currentLevel:'aal1'},error:null});render(<SecurityClient next="/patient/intake"/>);await screen.findByRole('button',{name:'Use authenticator app'});expect(screen.queryByRole('button',{name:'Set up passkey / device'})).toBeNull();
});
