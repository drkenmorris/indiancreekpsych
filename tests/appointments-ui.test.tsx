import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const mocks=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc:mocks.rpc})}));
import AppointmentsClient from '../app/appointments/AppointmentsClient';
const props={userId:'admin',accountType:'admin' as const,preferredName:'Admin',initialSettings:{scheduling_enabled:true,timezone:'America/Chicago',appointment_duration_minutes:50,slot_interval_minutes:30,minimum_notice_hours:24,maximum_advance_days:60},initialRules:[],initialBlocks:[],initialAppointments:[]};
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockImplementation((name:string)=>({abortSignal:async()=>({data:name==='scheduling_patients'?[{id:'patient-1',full_name:'Synthetic Patient',preferred_name:null}]:[],error:null})}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('Saturday form saves, confirms next to form, and refreshes openings',async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({rules:[{id:'sat',weekday:6,start_time:'09:00:00',end_time:'17:00:00',enabled:true}]})});vi.stubGlobal('fetch',fetch);
 render(<AppointmentsClient {...props}/>);await waitFor(()=>expect((screen.getByRole('button',{name:'Add hours'}) as HTMLButtonElement).disabled).toBe(false));
 fireEvent.change(screen.getByLabelText('Day'),{target:{value:'6'}});fireEvent.click(screen.getByRole('button',{name:'Add hours'}));
 await screen.findByText(/Saturday hours saved/);expect(fetch).toHaveBeenCalledWith('/api/scheduling/office-hours',expect.objectContaining({body:JSON.stringify({weekday:6,start_time:'09:00',end_time:'17:00',anchor_time:''})}));
 expect(mocks.rpc.mock.calls.filter(([name])=>name==='get_available_appointment_slots').length).toBe(2);
});
test('save failures appear beside hours form and release its button',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Network unavailable')));render(<AppointmentsClient {...props}/>);
 await waitFor(()=>expect((screen.getByRole('button',{name:'Add hours'}) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Add hours'}));await screen.findByText('Network unavailable');expect((screen.getByRole('button',{name:'Add hours'}) as HTMLButtonElement).disabled).toBe(false);
});
test('patient selector and repeat controls are admin-only',async()=>{
 render(<AppointmentsClient {...props}/>);await screen.findByRole('option',{name:/Synthetic Patient/});fireEvent.change(screen.getByLabelText('Repeat'),{target:{value:'2'}});expect(screen.getByLabelText('Repeat through (up to one year)')).toBeTruthy();cleanup();render(<AppointmentsClient {...props} accountType="patient"/>);expect(screen.queryByLabelText('Patient')).toBeNull();
});
