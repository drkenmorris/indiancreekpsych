import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {IntakeAnswers,IntakeRecord} from '@/lib/patient/intake';
const mocked=vi.hoisted(()=>({create:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createClient:mocked.create}));
import IntakeForm from '@/app/patient/intake/IntakeForm';
import KioskIntake from '@/app/intake/kiosk/[token]/KioskIntake';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
test('patient draft saves structured medications, preserves old answers and reloads',async()=>{
 let saved:IntakeRecord={patient_id:'fictional',answers:{prior_therapists:'Existing narrative'},status:'draft',version:1,updated_at:'2026-11-02',submitted_at:null};
 const query={eq:vi.fn().mockReturnThis(),select:vi.fn().mockReturnThis(),abortSignal:vi.fn().mockReturnThis(),single:vi.fn(async()=>({data:saved,error:null}))};
 const update=vi.fn((payload:{answers:IntakeAnswers})=>{saved={...saved,...payload};return query;});mocked.create.mockReturnValue({from:()=>({update})});
 const {unmount}=render(<IntakeForm userId="fictional" initial={saved} defaults={{}}/>);
 fireEvent.click(screen.getByRole('tab',{name:'6'}));
 fireEvent.change(screen.getByLabelText('Medication Status'),{target:{value:'Current'}});
 fireEvent.change(screen.getByLabelText('Medication'),{target:{value:'Fictional medication'}});
 fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
 await screen.findByText('Draft saved securely.');
 expect(saved.answers.prior_therapists).toBe('Existing narrative');
 expect(JSON.parse(saved.answers.medication_entries)[0].medication).toBe('Fictional medication');
 expect(query.eq).toHaveBeenCalledWith('patient_id','fictional');expect(query.eq).toHaveBeenCalledWith('version',1);
 unmount();render(<IntakeForm userId="fictional" initial={saved} defaults={{}}/>);fireEvent.click(screen.getByRole('tab',{name:'6'}));expect((screen.getByLabelText('Medication') as HTMLInputElement).value).toBe('Fictional medication');
});
test('office draft uses existing token-scoped save and reload for medication entries',async()=>{
 let stored:IntakeAnswers={full_name:'Fictional Patient',date_of_birth:'1990-01-01'};
 const rpc=vi.fn(async(name:string,args:{p_answers?:IntakeAnswers})=>{if(name==='get_intake_kiosk_session')return {data:[{patient_name:'Fictional Patient',date_of_birth:'1990-01-01',answers:stored,status:'draft',expires_at:'2099-01-01'}],error:null};if(name==='save_intake_kiosk_session'){stored={...args.p_answers!};return {data:'draft',error:null};}throw Error('Unexpected RPC');});
 mocked.create.mockReturnValue({rpc});const {unmount}=render(<KioskIntake token="fictional-token"/>);await screen.findByRole('textbox',{name:/Full legal name/});fireEvent.click(screen.getByRole('button',{name:'Section 6: Medications'}));fireEvent.change(screen.getByLabelText('Medication Status'),{target:{value:'Past'}});fireEvent.change(screen.getByLabelText('Medication'),{target:{value:'Fictional medicine'}});fireEvent.click(screen.getByRole('button',{name:'Save'}));await screen.findByText('Progress saved securely.');expect(rpc).toHaveBeenCalledWith('save_intake_kiosk_session',expect.objectContaining({p_token:'fictional-token',p_answers:expect.objectContaining({medication_entries:expect.any(String)})}));unmount();render(<KioskIntake token="fictional-token"/>);await screen.findByRole('textbox',{name:/Full legal name/});fireEvent.click(screen.getByRole('button',{name:'Section 6: Medications'}));expect((screen.getByLabelText('Medication') as HTMLTextAreaElement).value).toBe('Fictional medicine');
});
