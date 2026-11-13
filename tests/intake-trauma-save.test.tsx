import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {IntakeAnswers,IntakeRecord} from '@/lib/patient/intake';
const mocked=vi.hoisted(()=>({create:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createClient:mocked.create}));
import IntakeForm from '@/app/patient/intake/IntakeForm';
import KioskIntake from '@/app/intake/kiosk/[token]/KioskIntake';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
test('patient draft saves trauma checklist, preserves old answers and reloads',async()=>{
 let saved:IntakeRecord={patient_id:'fictional',answers:{prior_therapists:'Existing narrative',family_household:'Earlier context answer'},status:'draft',version:1,updated_at:'2026-11-02',submitted_at:null};
 const query={eq:vi.fn().mockReturnThis(),select:vi.fn().mockReturnThis(),abortSignal:vi.fn().mockReturnThis(),single:vi.fn(async()=>({data:saved,error:null}))};
 const update=vi.fn((payload:{answers:IntakeAnswers})=>{saved={...saved,...payload};return query;});mocked.create.mockReturnValue({from:()=>({update})});
 const {unmount}=render(<IntakeForm userId="fictional" initial={saved} defaults={{}}/>);
 fireEvent.click(screen.getByRole('tab',{name:'9'}));
 fireEvent.click(screen.getByLabelText('Physical assault or abuse'));fireEvent.change(screen.getByLabelText('Significant trauma, abuse, loss, violence, or other adverse experiences you want your clinician to know about'),{target:{value:'Optional fictional narrative'}});
 fireEvent.click(screen.getByLabelText('Childhood'));
 fireEvent.click(screen.getByRole('button',{name:'Save page'}));
 await screen.findByText('Draft saved securely.');
 expect(saved.answers.prior_therapists).toBe('Existing narrative');
 expect(JSON.parse(saved.answers.trauma_history_checklist).selections.experiences).toEqual(['Physical assault or abuse']);expect(saved.answers.family_household).toBe('Earlier context answer');expect(saved.answers.trauma_history).toBe('Optional fictional narrative');
 expect(query.eq).toHaveBeenCalledWith('patient_id','fictional');expect(query.eq).toHaveBeenCalledWith('version',1);
 unmount();render(<IntakeForm userId="fictional" initial={saved} defaults={{}}/>);fireEvent.click(screen.getByRole('tab',{name:'9'}));expect((screen.getByLabelText('Physical assault or abuse') as HTMLInputElement).checked).toBe(true);
},15000);
test('office draft uses existing token-scoped save and reload for trauma history',async()=>{
 let stored:IntakeAnswers={full_name:'Fictional Patient',date_of_birth:'1990-01-01'};
 const rpc=vi.fn(async(name:string,args:{p_answers?:IntakeAnswers})=>{if(name==='get_intake_kiosk_session')return {data:[{patient_name:'Fictional Patient',date_of_birth:'1990-01-01',answers:stored,status:'draft',expires_at:'2099-01-01'}],error:null};if(name==='save_intake_kiosk_session'){stored={...args.p_answers!};return {data:'draft',error:null};}throw Error('Unexpected RPC');});
 mocked.create.mockReturnValue({rpc});const {unmount}=render(<KioskIntake token="fictional-token"/>);await screen.findByRole('textbox',{name:/Full legal name/});fireEvent.click(screen.getByRole('button',{name:'Section 9: Trauma, family, social, educational, and occupational history'}));fireEvent.click(screen.getByLabelText('Physical assault or abuse'));fireEvent.click(screen.getByLabelText('Childhood'));fireEvent.click(screen.getByRole('button',{name:'Save'}));await screen.findByText('Progress saved securely.');expect(rpc).toHaveBeenCalledWith('save_intake_kiosk_session',expect.objectContaining({p_token:'fictional-token',p_answers:expect.objectContaining({trauma_history_checklist:expect.any(String)})}));unmount();render(<KioskIntake token="fictional-token"/>);await screen.findByRole('textbox',{name:/Full legal name/});fireEvent.click(screen.getByRole('button',{name:'Section 9: Trauma, family, social, educational, and occupational history'}));expect((screen.getByLabelText('Childhood') as HTMLInputElement).checked).toBe(true);
});
