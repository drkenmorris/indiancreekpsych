import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const mock=vi.hoisted(()=>({insert:vi.fn(),save:vi.fn(),list:vi.fn(),assurance:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({auth:{mfa:{listFactors:mock.list,getAuthenticatorAssuranceLevel:mock.assurance}},from:()=>{const q:any={};for(const k of ['select','eq','abortSignal','update'])q[k]=()=>q;q.insert=(p:any)=>{mock.insert(p);return q;};q.single=mock.save;return q;}})}));
import IntakeForm from '../app/patient/intake/IntakeForm';
import SecurityClient from '../app/account/security/SecurityClient';
import {validateIntake,IntakeAnswers} from '../lib/patient/intake';
import {safeNext} from '../lib/patient/redirect';
const complete:IntakeAnswers={full_name:'Test Person',date_of_birth:'1990-01-01',address:'1 Example St',city:'Example',state:'KS',postal_code:'66000',phone:'5550100',email:'test@example.com',insurance_coverage:'self-pay',counseling_reason:'Test concern',
 emergency_contact_name:'Synthetic Contact',emergency_contact_relationship:'Friend',emergency_contact_phone:'5550101',emergency_contact_permission:'Yes',
 functional_impact:'Synthetic fixture only',counseling_goals:'Synthetic fixture only',prior_mental_health_treatment:'No',medical_conditions:'None',medications_current:'None',
 suicidal_thoughts_current:'No',suicidal_plan_current:'No',homicidal_thoughts_current:'No',abuse_neglect_current:'No',
 comm_phone_calls:'No',comm_voicemail:'No',comm_text:'No',comm_email:'No',comm_portal:'Yes',comm_mail:'No',
 npp_received:'Yes',npp_signature:'Test Person',npp_signature_date:'2026-01-01',roi_authorize:'No',psych_notes_authorize:'No',
 information_accuracy:'Yes',electronic_signature_consent:'Yes',patient_signature:'Test Person',patient_signature_date:'2026-01-01'};
beforeEach(()=>{vi.clearAllMocks();vi.spyOn(window,'scrollTo').mockImplementation(()=>{});});afterEach(()=>{cleanup();vi.restoreAllMocks();});
test('incomplete drafts allowed, submission requires demographics and reason',()=>{expect(validateIntake({},false)).toBeNull();expect(validateIntake({},true)).toContain('Full legal name');expect(validateIntake(complete,true)).toBeNull();});
test('unknown benefit amounts allowed; invalid percentages blocked',()=>{expect(validateIntake({...complete,coinsurance:'I don’t know'},true)).toBeNull();expect(validateIntake({...complete,coinsurance:'101'},true)).toContain('Coinsurance');expect(validateIntake({...complete,deductible:'-1'},true)).toContain('non-negative');});
test('external and script redirects rejected',()=>{for(const url of ['//evil.test','javascript:alert(1)','/\\evil.test','/\nevil'])expect(safeNext(url)).toBe('/account');expect(safeNext('/patient/intake')).toBe('/patient/intake');});
test('submission requires explicit confirmation and preserves answers on save failure',async()=>{
 mock.save.mockResolvedValue({error:{message:'offline'}});render(<IntakeForm userId="patient" initial={null} defaults={complete}/>);
 expect(screen.queryByRole('button',{name:'Review and submit'})).toBeNull();
 fireEvent.click(screen.getByRole('tab',{name:'14'}));
 fireEvent.click(screen.getByRole('button',{name:'Review and submit'}));expect(mock.insert).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm submission'}));await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('tab',{name:'1'}));
 expect((screen.getByLabelText(/Full legal name/) as HTMLInputElement).value).toBe('Test Person');expect(mock.insert).toHaveBeenCalledWith({patient_id:'patient',answers:complete,status:'submitted'});
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
