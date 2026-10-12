import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {intakeSections} from '../lib/patient/intake';

const client=vi.hoisted(()=>({create:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createClient:client.create}));
import IntakeForm from '../app/patient/intake/IntakeForm';

beforeEach(()=>vi.clearAllMocks());
afterEach(()=>{cleanup();vi.restoreAllMocks();});

test('staff preview lets people type and navigate every section without touching Supabase',()=>{
 render(<main className="intakePage"><IntakeForm userId="" initial={null} defaults={{}} preview/></main>);
 expect(client.create).not.toHaveBeenCalled();
 const name=screen.getByRole('textbox',{name:/^Full legal name/}) as HTMLInputElement;
 fireEvent.change(name,{target:{value:'Synthetic Test'}});
 expect(name.value).toBe('Synthetic Test');
 const main=document.querySelector('.intakePage') as HTMLElement;
 main.scrollTop=400;
 fireEvent.click(screen.getByRole('tab',{name:'2'}));
 expect(main.scrollTop).toBe(0);
 expect(screen.getByText('Emergency contact, guardian, and responsible party')).toBeTruthy();
 fireEvent.click(screen.getByRole('tab',{name:'11'}));
 expect(screen.getByText('Consent to Counseling and Informed Treatment')).toBeTruthy();
 expect(document.querySelector('.legalDocumentFullText')).not.toBeNull();
 expect(document.querySelector('.legalDocumentFullText')?.hasAttribute('open')).toBe(false);
 for(let i=0;i<intakeSections.length;i++){
  fireEvent.click(screen.getByRole('tab',{name:String(i+1)}));
  const count=document.querySelectorAll('.intakeFields input:not([type=checkbox]),.intakeFields select,.intakeFields textarea').length;
  expect(count).toBe(intakeSections[i].fields.length);
 }
 fireEvent.click(screen.getByRole('tab',{name:'1'}));
 expect((screen.getByRole('textbox',{name:/^Full legal name/}) as HTMLInputElement).value).toBe('Synthetic Test');
 fireEvent.click(screen.getByRole('button',{name:'Check inputs (no save)'}));
 expect(screen.getByText(/The fields are responding to input/)).toBeTruthy();
 expect(client.create).not.toHaveBeenCalled();
});

test('submitted signed questionnaire is visibly locked; preview remains independent',()=>{
 client.create.mockReturnValue({});
 render(<main className="intakePage"><IntakeForm userId="synthetic-user" initial={{
  patient_id:'synthetic-user',answers:{full_name:'Synthetic Signed Record'},status:'submitted',
  version:1,updated_at:'2026-10-10T00:00:00Z',submitted_at:'2026-10-10T00:00:00Z'
 }} defaults={{}}/></main>);
 expect(screen.getByText(/Signed submissions are intentionally locked/)).toBeTruthy();
 expect((screen.getByRole('textbox',{name:/^Full legal name/}) as HTMLInputElement).disabled).toBe(true);
 expect(screen.queryByRole('button',{name:'Save draft'})).toBeNull();
});
