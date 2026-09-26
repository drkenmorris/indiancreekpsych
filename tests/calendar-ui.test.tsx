import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const mock=vi.hoisted(()=>({rpc:vi.fn(),read:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc:mock.rpc,from:()=>{const q:any={};for(const key of ['select','eq','gte','lt','order'])q[key]=()=>q;q.abortSignal=mock.read;return q;}})}));
import CalendarClient from '../app/appointments/calendar/CalendarClient';
const nextDay=new Date(Date.now()+86400000).toISOString().slice(0,10);
const appointment={id:'appointment-1',patient_id:null,patient_name:'Synthetic Calendar Patient',starts_at:nextDay+'T16:00:00Z',ends_at:nextDay+'T17:00:00Z',status:'booked',series_id:'series-1'};
beforeEach(()=>{vi.clearAllMocks();mock.read.mockResolvedValue({data:[appointment],error:null});mock.rpc.mockImplementation((name:string)=>({abortSignal:async()=>({data:name==='scheduling_patients'?[]:1,error:null})}));});
afterEach(cleanup);
test('monthly appointment opens editor and sends scoped edit with stale-write check',async()=>{
 render(<CalendarClient timezone="America/Chicago" duration={60}/>);
 fireEvent.click(await screen.findByRole('button',{name:/Synthetic Calendar Patient,/}));
 expect(screen.getByRole('heading',{name:'Appointment details'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Start time'),{target:{value:'13:00'}});
 fireEvent.change(screen.getByLabelText('Apply to'),{target:{value:'future'}});
 fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
 await screen.findByText(/1 appointment updated/);
 expect(mock.rpc).toHaveBeenCalledWith('edit_calendar_appointments',expect.objectContaining({p_id:appointment.id,p_expected_start:appointment.starts_at,p_time:'13:00',p_scope:'future',p_action:'save'}));
});
test('conflict keeps appointment editor and displays database validation',async()=>{
 mock.rpc.mockImplementation((name:string)=>({abortSignal:async()=>name==='scheduling_patients'?{data:[],error:null}:{data:null,error:{message:'This time has been blocked from scheduling'}}}));
 render(<CalendarClient timezone="America/Chicago" duration={60}/>);
 fireEvent.click(await screen.findByRole('button',{name:/Synthetic Calendar Patient,/}));fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
 await screen.findByRole('alert');expect(screen.getByText('This time has been blocked from scheduling')).toBeTruthy();expect(screen.getByLabelText('Appointment date')).toBeTruthy();
});
test('cancellation requires a separate confirmation and defaults to one occurrence',async()=>{
 render(<CalendarClient timezone="America/Chicago" duration={60}/>);fireEvent.click(await screen.findByRole('button',{name:/Synthetic Calendar Patient,/}));fireEvent.click(screen.getByRole('button',{name:'Cancel appointment'}));
 expect(mock.rpc.mock.calls.filter(([n])=>n==='edit_calendar_appointments')).toHaveLength(0);
 fireEvent.click(screen.getByRole('button',{name:'Confirm cancellation'}));await screen.findByText(/1 appointment cancelled/);
 expect(mock.rpc).toHaveBeenCalledWith('edit_calendar_appointments',expect.objectContaining({p_scope:'one',p_action:'cancel'}));
});
test('load failure is not presented as an empty schedule',async()=>{
 mock.read.mockResolvedValue({data:null,error:{message:'offline'}});render(<CalendarClient timezone="America/Chicago" duration={60}/>);
 await screen.findByRole('alert');expect(screen.queryByText(/No booked appointments/)).toBeNull();await waitFor(()=>expect((screen.getByRole('button',{name:'Refresh'}) as HTMLButtonElement).disabled).toBe(false));
});
