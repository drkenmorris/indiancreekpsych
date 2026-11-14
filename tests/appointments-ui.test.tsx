import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc:mocks.rpc,from:mocks.from})}));
vi.mock('../app/appointments/calendar/CalendarClient',()=>({default:()=>null}));
import AppointmentsClient from '../app/appointments/AppointmentsClient';
const props={userId:'admin',accountType:'admin' as const,preferredName:'Admin',initialSettings:{scheduling_enabled:true,timezone:'America/Chicago',appointment_duration_minutes:50,slot_interval_minutes:30,minimum_notice_hours:24,maximum_advance_days:60},initialRules:[],initialBlocks:[],initialAppointments:[]};
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockImplementation((name:string)=>({abortSignal:async()=>({data:name==='scheduling_patients'?[{id:'patient-1',full_name:'Synthetic Patient',preferred_name:null}]:[],error:null})}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('Saturday form saves, confirms next to form, and refreshes openings',async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({rules:[{id:'sat',weekday:6,start_time:'09:00:00',end_time:'17:00:00',enabled:true}]})});vi.stubGlobal('fetch',fetch);
 render(<AppointmentsClient {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Weekly office hours'}));await waitFor(()=>expect((screen.getByRole('button',{name:'Add hours'}) as HTMLButtonElement).disabled).toBe(false));
 fireEvent.change(screen.getByLabelText('Day'),{target:{value:'6'}});fireEvent.click(screen.getByRole('button',{name:'Add hours'}));
 await screen.findByText(/Saturday hours saved/);expect(fetch).toHaveBeenCalledWith('/api/scheduling/office-hours',expect.objectContaining({body:JSON.stringify({weekday:6,start_time:'09:00',end_time:'17:00',anchor_time:''})}));
 fireEvent.click(screen.getByRole('button',{name:'Appointment availability'}));await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('get_available_appointment_slots',expect.any(Object)));
});
test('save failures appear beside hours form and release its button',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Network unavailable')));render(<AppointmentsClient {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Weekly office hours'}));
 await waitFor(()=>expect((screen.getByRole('button',{name:'Add hours'}) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Add hours'}));await screen.findByText('Network unavailable');expect((screen.getByRole('button',{name:'Add hours'}) as HTMLButtonElement).disabled).toBe(false);
});
test('patient selector and repeat controls are admin-only',async()=>{
 render(<AppointmentsClient {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Place patient appointments'}));await screen.findByRole('option',{name:/Synthetic Patient/});fireEvent.change(screen.getByLabelText('Repeat'),{target:{value:'2'}});expect(screen.getByLabelText('Repeat through (up to one year)')).toBeTruthy();cleanup();render(<AppointmentsClient {...props} accountType="patient"/>);expect(screen.queryByLabelText('Patient')).toBeNull();
});
test('Pause/Enable uses the registered server operation and preserves state on approval failure',async()=>{
 const rule={id:'00000000-0000-4000-8000-000000000002',weekday:1,start_time:'09:00:00',end_time:'17:00:00',enabled:true};
 const fetch=vi.fn().mockResolvedValueOnce({ok:false,json:async()=>({code:'owner_approval_required',error:'Protected operation cannot proceed.'})}).mockResolvedValueOnce({ok:true,json:async()=>({rule:{...rule,enabled:false}})});vi.stubGlobal('fetch',fetch);
 render(<AppointmentsClient {...props} initialRules={[rule]}/>);fireEvent.click(screen.getByRole('button',{name:'Weekly office hours'}));
 fireEvent.click(screen.getByRole('button',{name:'Pause'}));await screen.findByText(/requires current approval in OmniCore/);expect(screen.getByRole('button',{name:'Pause'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Pause'}));await screen.findByRole('button',{name:'Enable'});
 expect(fetch).toHaveBeenCalledWith('/api/scheduling/office-hours/toggle',expect.objectContaining({body:JSON.stringify({id:rule.id,enabled:false})}));
});

test.each([0,null,'2'])('a %s booking receipt never claims appointments were placed',async receipt=>{
 mocks.rpc.mockImplementation((name:string)=>({abortSignal:async()=>({
  data:name==='scheduling_patients'?[{id:'patient-1',full_name:'Synthetic Patient',preferred_name:null}]:
   name==='book_patient_appointments'?receipt:[],
  error:null
 })}));
 render(<AppointmentsClient {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Place patient appointments'}));
 await screen.findByRole('option',{name:/Synthetic Patient/});
 fireEvent.change(screen.getByLabelText('Patient'),{target:{value:'patient-1'}});
 fireEvent.change(screen.getByLabelText('First appointment date'),{target:{value:'2026-12-01'}});
 fireEvent.click(screen.getByRole('button',{name:'Book patient appointments'}));
 await screen.findByText(/Booking was not confirmed. Refresh the calendar/);
 expect(screen.queryByText(/appointments? booked\./)).toBeNull();
 expect(mocks.rpc).toHaveBeenCalledWith('book_patient_appointments',expect.objectContaining({
  p_patient_id:'patient-1',p_first_date:'2026-12-01'
 }));
});

test('a positive integer booking receipt confirms the number of scheduled appointments',async()=>{
 mocks.rpc.mockImplementation((name:string)=>({abortSignal:async()=>({
  data:name==='scheduling_patients'?[{id:'patient-1',full_name:'Synthetic Patient',preferred_name:null}]:
   name==='book_patient_appointments'?3:[],
  error:null
 })}));
 render(<AppointmentsClient {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Place patient appointments'}));
 await screen.findByRole('option',{name:/Synthetic Patient/});
 fireEvent.change(screen.getByLabelText('Patient'),{target:{value:'patient-1'}});
 fireEvent.change(screen.getByLabelText('First appointment date'),{target:{value:'2026-12-01'}});
 fireEvent.click(screen.getByRole('button',{name:'Book patient appointments'}));
 await screen.findByText('3 appointments booked. Adjacent openings updated.');
 expect(screen.queryByText(/Booking was not confirmed/)).toBeNull();
});

test.each([
 {name:'zero matched rows',data:null},
 {name:'mismatched persisted settings',data:{id:true,...props.initialSettings,maximum_advance_days:365}},
 {name:'wrong singleton',data:{id:false,...props.initialSettings}},
])('scheduler settings refuse to report saved for $name',async ({data})=>{
 mocks.from.mockReturnValue({update:()=>({eq:()=>({select:()=>({maybeSingle:async()=>({data,error:null})})})})});
 render(<AppointmentsClient {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Online scheduling rules'}));
 fireEvent.click(screen.getByRole('button',{name:'Save scheduling settings'}));
 await screen.findByText(/Scheduling settings were not verified in the database/);
 expect(screen.queryByText('Scheduling settings saved and verified.')).toBeNull();
 expect(mocks.from).toHaveBeenCalledWith('appointment_settings');
});
test('scheduler only confirms settings when actual saved singleton matches all requested fields',async()=>{
 mocks.from.mockReturnValue({update:()=>({eq:()=>({select:()=>({maybeSingle:async()=>({data:{id:true,...props.initialSettings},error:null})})})})});
 render(<AppointmentsClient {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Online scheduling rules'}));
 fireEvent.click(screen.getByRole('button',{name:'Save scheduling settings'}));
 await screen.findByText('Scheduling settings saved and verified.');
 expect(screen.queryByText(/Scheduling settings were not verified/)).toBeNull();
});
test('a zero-row office-hours DELETE cannot remove the visible rule or claim success',async()=>{
 const rule={id:'00000000-0000-4000-8000-000000000002',weekday:1,start_time:'09:00:00',end_time:'17:00:00',enabled:true};
 let returned:unknown[]=[];
 mocks.from.mockReturnValue({delete:()=>({eq:()=>({select:async()=>({data:returned,error:null})})})});
 render(<AppointmentsClient {...props} initialRules={[rule]}/>);
 fireEvent.click(screen.getByRole('button',{name:'Weekly office hours'}));
 fireEvent.click(screen.getByRole('button',{name:'Delete'}));
 await screen.findByText(/Removal of office hours was not verified/);
 expect(screen.getByText(/09:00–17:00/)).toBeTruthy();
 returned=[{id:rule.id}];
 fireEvent.click(screen.getByRole('button',{name:'Delete'}));
 await screen.findByText('Office hours removed and verified.');
 expect(screen.queryByText(/09:00–17:00/)).toBeNull();
});
test('a zero-row blackout DELETE cannot remove visible protected time',async()=>{
 const blocked={id:'00000000-0000-4000-8000-000000000003',starts_at:'2026-12-01T12:00:00Z',ends_at:'2026-12-01T14:00:00Z',label:'Synthetic blackout'};
 let returned:unknown[]=[];
 mocks.from.mockReturnValue({delete:()=>({eq:()=>({select:async()=>({data:returned,error:null})})})});
 render(<AppointmentsClient {...props} initialBlocks={[blocked]}/>);
 fireEvent.click(screen.getByRole('button',{name:'Blackout periods'}));
 fireEvent.click(screen.getByRole('button',{name:'Remove'}));
 await screen.findByText(/Blackout removal was not verified/);
 expect(screen.getByText('Synthetic blackout')).toBeTruthy();
 returned=[{id:blocked.id}];
 fireEvent.click(screen.getByRole('button',{name:'Remove'}));
 await screen.findByText('Blackout removed and verified.');
 expect(screen.queryByText('Synthetic blackout')).toBeNull();
});


test.each([
 {caseName:'no persisted row',receipt:(_payload:any)=>null},
 {caseName:'wrong persisted interval',receipt:(payload:any)=>({...payload,id:'fictional-block',ends_at:'2026-12-03T14:00:00.000Z'})},
 {caseName:'wrong persisted label',receipt:(payload:any)=>({...payload,id:'fictional-block',label:'Unexpected server label'})},
])('blackout INSERT requires a persisted matching row: $caseName',async ({receipt})=>{
 const insert=vi.fn((payload:any)=>({select:()=>({single:async()=>({data:receipt(payload),error:null})})}));
 mocks.from.mockReturnValue({insert});
 render(<AppointmentsClient {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Blackout periods'}));
 fireEvent.change(screen.getByLabelText('Starts'),{target:{value:'2026-12-01T10:00'}});
 fireEvent.change(screen.getByLabelText('Ends'),{target:{value:'2026-12-01T11:00'}});
 fireEvent.change(screen.getByLabelText('Label'),{target:{value:'Synthetic blackout'}});
 fireEvent.click(screen.getByRole('button',{name:'Block time'}));
 await screen.findByText(/Blackout was not verified in the database/);
 expect(screen.queryByText('Blocked time saved and verified.')).toBeNull();
 expect(screen.queryByText('Synthetic blackout')).toBeNull();
 expect(insert).toHaveBeenCalledTimes(1);
});

test('blackout INSERT confirms a matching saved row before adding it to the schedule',async()=>{
 const insert=vi.fn((payload:any)=>({select:()=>({single:async()=>({data:{...payload,id:'fictional-block'},error:null})})}));
 mocks.from.mockReturnValue({insert});
 render(<AppointmentsClient {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Blackout periods'}));
 fireEvent.change(screen.getByLabelText('Starts'),{target:{value:'2026-12-01T10:00'}});
 fireEvent.change(screen.getByLabelText('Ends'),{target:{value:'2026-12-01T11:00'}});
 fireEvent.change(screen.getByLabelText('Label'),{target:{value:'Synthetic blackout'}});
 fireEvent.click(screen.getByRole('button',{name:'Block time'}));
 await screen.findByText('Blocked time saved and verified.');
 expect(screen.getByText('Synthetic blackout')).toBeTruthy();
 // The UI must send actual Chicago wall time, not the browser's local timezone.
 expect(insert).toHaveBeenCalledWith(expect.objectContaining({
  starts_at:'2026-12-01T16:00:00.000Z',ends_at:'2026-12-01T17:00:00.000Z'
 }));
 expect(insert).toHaveBeenCalledTimes(1);
});

test('invalid blackout interval is rejected before any scheduling write',async()=>{
 const insert=vi.fn();
 mocks.from.mockReturnValue({insert});
 render(<AppointmentsClient {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Blackout periods'}));
 fireEvent.change(screen.getByLabelText('Starts'),{target:{value:'2026-12-01T11:00'}});
 fireEvent.change(screen.getByLabelText('Ends'),{target:{value:'2026-12-01T10:00'}});
 fireEvent.click(screen.getByRole('button',{name:'Block time'}));
 await screen.findByText(/Choose valid blocked-time dates with an end later/);
 expect(insert).not.toHaveBeenCalled();
});

test('pending blackout insert locks its submit control against repeat writes',async()=>{
 let finish!:(value:any)=>void;
 const insert=vi.fn(()=>({select:()=>({single:()=>new Promise(resolve=>{finish=resolve;})})}));
 mocks.from.mockReturnValue({insert});
 render(<AppointmentsClient {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Blackout periods'}));
 fireEvent.change(screen.getByLabelText('Starts'),{target:{value:'2026-12-01T10:00'}});
 fireEvent.change(screen.getByLabelText('Ends'),{target:{value:'2026-12-01T11:00'}});
 fireEvent.click(screen.getByRole('button',{name:'Block time'}));
 expect((screen.getByRole('button',{name:'Working…'}) as HTMLButtonElement).disabled).toBe(true);
 expect(insert).toHaveBeenCalledTimes(1);
 finish({data:null,error:null});
 await screen.findByText(/Blackout was not verified in the database/);
 expect((screen.getByRole('button',{name:'Block time'}) as HTMLButtonElement).disabled).toBe(false);
 expect(insert).toHaveBeenCalledTimes(1);
});

test('unsaved timezone edits cannot silently move a patient-calendar blackout',async()=>{
 const insert=vi.fn((payload:any)=>({select:()=>({single:async()=>({data:{...payload,id:'fictional-block'},error:null})})}));
 mocks.from.mockReturnValue({insert});
 render(<AppointmentsClient {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Online scheduling rules'}));
 fireEvent.change(screen.getByLabelText('Time zone'),{target:{value:'America/New_York'}});
 // Do not save settings; the schedule is still based on persisted Chicago time.
 fireEvent.click(screen.getByRole('button',{name:'Blackout periods'}));
 fireEvent.change(screen.getByLabelText('Starts'),{target:{value:'2026-12-01T10:00'}});
 fireEvent.change(screen.getByLabelText('Ends'),{target:{value:'2026-12-01T11:00'}});
 fireEvent.click(screen.getByRole('button',{name:'Block time'}));
 await screen.findByText('Blocked time saved and verified.');
 expect(insert).toHaveBeenCalledWith(expect.objectContaining({
  starts_at:'2026-12-01T16:00:00.000Z',ends_at:'2026-12-01T17:00:00.000Z'
 }));
 expect(screen.getByText(/saved practice time zone \(America\/Chicago\)/)).toBeTruthy();
});
test('invalid IANA practice timezone must never be written into scheduler settings',async()=>{
 render(<AppointmentsClient {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Online scheduling rules'}));
 fireEvent.change(screen.getByLabelText('Time zone'),{target:{value:'Incorrect/Timezone'}});
 fireEvent.click(screen.getByRole('button',{name:'Save scheduling settings'}));
 await screen.findByText(/Enter a valid IANA practice time zone/);
 expect(mocks.from).not.toHaveBeenCalledWith('appointment_settings');
 expect(screen.queryByText('Scheduling settings saved and verified.')).toBeNull();
});
