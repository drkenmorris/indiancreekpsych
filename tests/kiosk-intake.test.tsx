import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {sameIntakeAnswers} from '../lib/patient/intake-answer-comparison';

const mocked=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc:mocked.rpc})}));
import KioskIntake from '../app/intake/kiosk/[token]/KioskIntake';

beforeEach(()=>{vi.clearAllMocks();vi.spyOn(window,'scrollTo').mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

test('draft comparison ignores JSONB property order without ignoring changed values',()=>{
 const a={full_name:'Synthetic Patient',date_of_birth:'1990-01-01',city:'Olathe'};
 const b={city:'Olathe',date_of_birth:'1990-01-01',full_name:'Synthetic Patient'};
 expect(sameIntakeAnswers(a,b)).toBe(true);
 expect(sameIntakeAnswers(a,{...b,city:'Overland Park'})).toBe(false);
 expect(sameIntakeAnswers(a,{full_name:'Synthetic Patient',date_of_birth:'1990-01-01'})).toBe(false);
});

test('patient can type and save a kiosk draft repeatedly despite database key reordering',async()=>{
 let stored={date_of_birth:'1990-01-01',full_name:'Synthetic Patient',city:'Olathe'};
 mocked.rpc.mockImplementation(async (name:string,args:{p_answers?:typeof stored})=>{
  if(name==='get_intake_kiosk_session')return {data:[{
   patient_name:'Synthetic Patient',date_of_birth:'1990-01-01',
   answers:Object.fromEntries(Object.entries(stored).reverse()),
   status:'draft',expires_at:'2099-01-01T00:00:00Z'
  }],error:null};
  if(name==='save_intake_kiosk_session'){
   stored={...args.p_answers!};
   return {data:'draft',error:null};
  }
  throw Error('Unexpected RPC: '+name);
 });
 render(<KioskIntake token="synthetic-test-token"/>);
 const city=await screen.findByRole('textbox',{name:/^City/});
 expect((city as HTMLInputElement).value).toBe('Olathe');
 fireEvent.change(city,{target:{value:'Lenexa'}});
 expect((city as HTMLInputElement).value).toBe('Lenexa');
 fireEvent.click(screen.getByRole('button',{name:'Save'}));
 await screen.findByText('Progress saved securely.');
 expect(mocked.rpc).toHaveBeenCalledWith('save_intake_kiosk_session',expect.objectContaining({p_submit:false,p_answers:expect.objectContaining({city:'Lenexa'})}));
 fireEvent.change(city,{target:{value:'Shawnee'}});
 fireEvent.click(screen.getByRole('button',{name:'Save'}));
 await waitFor(()=>expect(mocked.rpc.mock.calls.filter(call=>call[0]==='save_intake_kiosk_session')).toHaveLength(2));
 await screen.findByText('Progress saved securely.');
 expect(stored.city).toBe('Shawnee');
 expect(screen.queryByRole('alert')).toBeNull();
});
