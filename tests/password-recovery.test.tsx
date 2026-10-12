import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
const mocks=vi.hoisted(()=>({getUser:vi.fn(),updateUser:vi.fn(),signOut:vi.fn(),resetPasswordForEmail:vi.fn(),verifyOtp:vi.fn(),assurance:vi.fn(),factors:vi.fn(),challenge:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({auth:{...mocks,mfa:{getAuthenticatorAssuranceLevel:mocks.assurance,listFactors:mocks.factors,challengeAndVerify:mocks.challenge}}})}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{...mocks,mfa:{getAuthenticatorAssuranceLevel:mocks.assurance,listFactors:mocks.factors,challengeAndVerify:mocks.challenge}}})}));
import Recovery from '../app/forgot-password/PasswordRecovery';
import Reset from '../app/reset-password/ResetPassword';
import {GET} from '../app/auth/confirm/route';
import {NextRequest} from 'next/server';
import {passwordRecoveryRedirect} from '../lib/password-recovery';
beforeEach(()=>{vi.clearAllMocks();mocks.assurance.mockResolvedValue({data:{currentLevel:'aal2',nextLevel:'aal2'},error:null});mocks.factors.mockResolvedValue({data:{all:[{id:'synthetic-factor',factor_type:'totp',status:'verified'}]},error:null});mocks.challenge.mockResolvedValue({error:null});mocks.getUser.mockResolvedValue({data:{user:{id:'synthetic-user'}},error:null});mocks.updateUser.mockResolvedValue({error:null});mocks.signOut.mockResolvedValue({error:null});mocks.resetPasswordForEmail.mockResolvedValue({error:null});mocks.verifyOtp.mockResolvedValue({error:null});});
afterEach(cleanup);
test('www and apex production use allowlisted apex callback while preview stays on its own origin',()=>{
 for(const origin of ['https://www.indiancreekpsych.com','https://indiancreekpsych.com'])expect(passwordRecoveryRedirect(origin)).toBe('https://indiancreekpsych.com/auth/callback?next=/reset-password');
 expect(passwordRecoveryRedirect('https://synthetic-preview.vercel.app')).toBe('https://synthetic-preview.vercel.app/auth/callback?next=/reset-password');
});
async function form(){render(<Reset/>);await screen.findByLabelText('New password');fireEvent.change(screen.getByLabelText('New password'),{target:{value:'synthetic-test-only-123'}});fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'synthetic-test-only-123'}});}
test('recovery uses same-origin PKCE callback and generic account response',async()=>{render(<Recovery/>);fireEvent.change(screen.getByLabelText('Email'),{target:{value:'synthetic@example.com'}});fireEvent.click(screen.getByRole('button',{name:'Send recovery email'}));await screen.findByText(/If an account exists/);expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('synthetic@example.com',{redirectTo:window.location.origin+'/auth/callback?next=/reset-password'});});
test('recovery failure does not expose provider details or claim email sent',async()=>{mocks.resetPasswordForEmail.mockRejectedValue(new Error('internal details'));render(<Recovery/>);fireEvent.change(screen.getByLabelText('Email'),{target:{value:'synthetic@example.com'}});fireEvent.click(screen.getByRole('button',{name:'Send recovery email'}));await screen.findByText(/could not be completed/);expect(screen.queryByText(/internal details/)).toBeNull();});
test('unauthenticated recovery page cannot update password',async()=>{mocks.getUser.mockResolvedValue({data:{user:null},error:null});render(<Reset/>);await screen.findByRole('alert');expect(screen.queryByLabelText('New password')).toBeNull();expect(mocks.updateUser).not.toHaveBeenCalled();});
test('mismatched and short passwords are rejected without update',async()=>{await form();fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'different-password'}});fireEvent.click(screen.getByRole('button',{name:'Update password'}));await screen.findByText(/do not match/);expect(mocks.updateUser).not.toHaveBeenCalled();fireEvent.change(screen.getByLabelText('New password'),{target:{value:'short'}});fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'short'}});fireEvent.submit(screen.getByRole('button',{name:'Update password'}).closest('form')!);await screen.findByText('Use a password with at least 12 characters.');expect(mocks.updateUser).not.toHaveBeenCalled();});
test('expired session is rechecked before updating',async()=>{await form();mocks.getUser.mockResolvedValue({data:{user:null},error:null});fireEvent.click(screen.getByRole('button',{name:'Update password'}));await screen.findByText(/Your recovery session expired/);expect(mocks.updateUser).not.toHaveBeenCalled();});
test('successful update changes only password, clears inputs and revokes sessions',async()=>{await form();fireEvent.click(screen.getByRole('button',{name:'Update password'}));await screen.findByText(/Password updated successfully/);expect(mocks.updateUser).toHaveBeenCalledWith({password:'synthetic-test-only-123'});expect(mocks.signOut).toHaveBeenCalledWith({scope:'global'});expect(screen.queryByLabelText('New password')).toBeNull();});
test('provider rejection is distinct from success and does not sign out',async()=>{mocks.updateUser.mockResolvedValue({error:{code:'weak_password',message:'private provider details'}});await form();fireEvent.click(screen.getByRole('button',{name:'Update password'}));await screen.findByText('Choose a stronger password and try again.');expect(mocks.signOut).not.toHaveBeenCalled();});
test('recovery token callback routes to reset regardless of supplied next; ordinary confirmation preserves safe redirect',async()=>{let r=await GET(new NextRequest('https://synthetic.example/auth/confirm?token_hash=synthetic-token&type=recovery&next=//outside.example'));expect(r.headers.get('location')).toBe('https://synthetic.example/reset-password');expect(mocks.verifyOtp).toHaveBeenCalledWith({token_hash:'synthetic-token',type:'recovery'});r=await GET(new NextRequest('https://synthetic.example/auth/confirm?token_hash=synthetic-token&type=email&next=/appointments'));expect(r.headers.get('location')).toBe('https://synthetic.example/appointments');});

test('MFA session displays the existing verification before any password fields',async()=>{
 mocks.assurance.mockResolvedValue({data:{currentLevel:'aal1',nextLevel:'aal2'},error:null});render(<Reset/>);
 await screen.findByRole('heading',{name:'Verify your authenticator first'});expect(screen.queryByLabelText('New password')).toBeNull();
 fireEvent.click(await screen.findByRole('button',{name:'Use authenticator app'}));await screen.findByLabelText('Authenticator code');expect(mocks.updateUser).not.toHaveBeenCalled();
});
test('returning with verified AAL2 exposes the password update and permits it',async()=>{
 mocks.assurance.mockResolvedValue({data:{currentLevel:'aal1',nextLevel:'aal2'},error:null});render(<Reset/>);await screen.findByRole('heading',{name:'Verify your authenticator first'});cleanup();
 mocks.assurance.mockResolvedValue({data:{currentLevel:'aal2',nextLevel:'aal2'},error:null});await form();fireEvent.click(screen.getByRole('button',{name:'Update password'}));await screen.findByText(/Password updated successfully/);expect(mocks.updateUser).toHaveBeenCalledTimes(1);
});
test('assurance is checked again at submit and blocks a downgraded session',async()=>{
 await form();mocks.assurance.mockResolvedValue({data:{currentLevel:'aal1',nextLevel:'aal2'},error:null});fireEvent.click(screen.getByRole('button',{name:'Update password'}));
 await screen.findByRole('heading',{name:'Verify your authenticator first'});expect(screen.queryByLabelText('New password')).toBeNull();expect(mocks.updateUser).not.toHaveBeenCalled();
});
test('provider insufficient_aal requires verification rather than another recovery email',async()=>{
 mocks.updateUser.mockResolvedValue({error:{code:'insufficient_aal'}});await form();fireEvent.click(screen.getByRole('button',{name:'Update password'}));
 await screen.findByRole('heading',{name:'Verify your authenticator first'});await screen.findByText(/Authenticator verification is required before/);expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();expect(mocks.signOut).not.toHaveBeenCalled();
});
test('same-password rejection has a specific explanation rather than an expired-link guess',async()=>{
 mocks.updateUser.mockResolvedValue({error:{code:'same_password'}});await form();fireEvent.click(screen.getByRole('button',{name:'Update password'}));await screen.findByText(/This is already your current password/);expect(mocks.signOut).not.toHaveBeenCalled();
});
test('unknown assurance fails closed and does not expose an update form',async()=>{
 mocks.assurance.mockResolvedValue({data:null,error:{message:'private provider detail'}});render(<Reset/>);await screen.findByText(/Your verification status could not be checked/);expect(screen.queryByLabelText('New password')).toBeNull();expect(mocks.updateUser).not.toHaveBeenCalled();
});
