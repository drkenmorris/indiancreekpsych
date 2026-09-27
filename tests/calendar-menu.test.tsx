import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const mock=vi.hoisted(()=>({rpc:vi.fn(),read:vi.fn(),eq:vi.fn(),insert:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc:mock.rpc,from:()=>{const q:any={};for(const k of ['select','gte','lt','order','update'])q[k]=()=>q;q.eq=(...args:any[])=>{mock.eq(...args);return q;};q.insert=(p:any)=>{mock.insert(p);return q;};q.abortSignal=mock.read;return q;}})}));
import AppointmentsClient from '../app/appointments/AppointmentsClient';
import MonthSchedule from '../app/appointments/calendar/MonthSchedule';
const settings={scheduling_enabled:true,timezone:'America/Chicago',appointment_duration_minutes:60,slot_interval_minutes:60,minimum_notice_hours:24,maximum_advance_days:365};
const slot={starts_at:'2030-03-12T16:00:00Z',ends_at:'2030-03-12T17:00:00Z'};
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2030-03-01T12:00:00Z'));vi.clearAllMocks();mock.read.mockResolvedValue({data:[],error:null});mock.rpc.mockImplementation((name:string)=>({abortSignal:async()=>({data:name==='get_available_appointment_slots'?[slot]:[],error:null})}));});
afterEach(()=>{cleanup();vi.useRealTimers();});
const monthProps={timezone:'America/Chicago',enabled:true,showAvailability:true,showBookings:true,patientId:'patient-1',readOnly:false,layout:'month' as const,revision:0};
test('admin menu separates settings and preserves booking form',async()=>{
 render(<AppointmentsClient userId="admin" accountType="admin" preferredName="" initialSettings={settings} initialRules={[]} initialBlocks={[]}/>);
 await screen.findByRole('button',{name:'Online scheduling rules'});
 expect(screen.queryByLabelText('Minimum notice (hours)')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Online scheduling rules'}));expect(screen.getByLabelText('Minimum notice (hours)')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Weekly office hours'}));expect(screen.getByLabelText('Day')).toBeTruthy();expect(screen.queryByLabelText('Minimum notice (hours)')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Place patient appointments'}));expect(screen.getByLabelText('Patient name')).toBeTruthy();
});
test('patient calendar has no administration or preview controls',async()=>{
 render(<AppointmentsClient userId="patient-1" accountType="patient" preferredName="Patient" initialSettings={settings} initialRules={[]} initialBlocks={[]}/>);
 await screen.findByText('Available');expect(screen.queryByRole('button',{name:'Weekly office hours'})).toBeNull();expect(screen.queryByLabelText('Preview patient')).toBeNull();expect(mock.eq).toHaveBeenCalledWith('patient_id','patient-1');expect(mock.rpc).not.toHaveBeenCalledWith('scheduling_patients');
});
test('month arrows request complete month and do not silently truncate to 21 days',async()=>{
 render(<MonthSchedule {...monthProps}/>);await screen.findByText('Available');
 expect(mock.rpc).toHaveBeenCalledWith('get_available_appointment_slots',{p_from:'2030-03-01',p_to:'2030-03-31'});
 fireEvent.click(screen.getByRole('button',{name:'Next month'}));await waitFor(()=>expect(mock.rpc).toHaveBeenCalledWith('get_available_appointment_slots',{p_from:'2030-04-01',p_to:'2030-04-30'}));
 expect(screen.getByText('April 2030')).toBeTruthy();expect(screen.queryByText('Available')).toBeNull();
});
test('read-only patient preview cannot book and filters selected patient',async()=>{
 render(<MonthSchedule {...monthProps} readOnly patientId="selected-patient"/>);await screen.findByText('Available');expect((screen.getByRole('button',{name:/Available/}) as HTMLButtonElement).disabled).toBe(true);expect(mock.eq).toHaveBeenCalledWith('patient_id','selected-patient');expect(mock.insert).not.toHaveBeenCalled();
});
test('patient must confirm booking before any write',async()=>{
 render(<MonthSchedule {...monthProps}/>);fireEvent.click(await screen.findByRole('button',{name:/Available/}));expect(mock.insert).not.toHaveBeenCalled();mock.read.mockResolvedValue({data:[{id:'new-booking'}],error:null});fireEvent.click(screen.getByRole('button',{name:'Confirm booking'}));await waitFor(()=>expect(mock.insert).toHaveBeenCalledWith({patient_id:'patient-1',...slot}));
});
test('failed load is not shown as no availability',async()=>{
 mock.rpc.mockImplementation(()=>({abortSignal:async()=>({data:null,error:{message:'offline'}})}));render(<MonthSchedule {...monthProps}/>);await screen.findByRole('alert');expect(screen.queryByText(/No available times/)).toBeNull();
});
