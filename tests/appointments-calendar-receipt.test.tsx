import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {type CalendarAppointment,localParts,shiftMonth} from '@/lib/scheduling/calendar';
import CalendarClient from '@/app/appointments/calendar/CalendarClient';

const m=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({from:m.from,rpc:m.rpc})}));
const timezone='America/Chicago';
const nextMonth=shiftMonth(localParts(new Date().toISOString(),timezone).date.slice(0,7),1);
const booking={
 id:'00000000-0000-4000-8000-000000000100',
 patient_id:null,patient_name:'Synthetic Scheduling Patient',
 starts_at:nextMonth+'-10T16:00:00Z',ends_at:nextMonth+'-10T17:00:00Z',
 status:'booked',series_id:'00000000-0000-4000-8000-000000000200'
};
function prepare(receipt:unknown, row:CalendarAppointment|CalendarAppointment[]=booking){
 const q:any={};
 for(const method of ['select','eq','gte','lt','order'])q[method]=vi.fn(()=>q);
 q.abortSignal=vi.fn(async()=>({data:Array.isArray(row)?row:[row],error:null}));
 m.from.mockReturnValue(q);
 m.rpc.mockImplementation((name:string)=>({abortSignal:async()=>({
  data:name==='scheduling_patients'?[]:receipt,error:null
 })}));
}
async function openFutureRecurringEditor(){
 render(<CalendarClient timezone={timezone} duration={50}/>);
 fireEvent.click(screen.getByRole('button',{name:'Next month'}));
 const open=await screen.findByRole('button',{name:/Synthetic Scheduling Patient/});
 fireEvent.click(open);
 expect(screen.getByLabelText('Apply to')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Apply to'),{target:{value:'future'}});
 const form=screen.getByLabelText('Apply to').closest('form');
 expect(form).not.toBeNull();
 return form!;
}
async function openFutureRecurringBooking(){
 const form=await openFutureRecurringEditor();
 fireEvent.submit(form);
}
beforeEach(()=>vi.clearAllMocks());
afterEach(()=>cleanup());

test.each([0,null,'2'])('calendar edit receipt %s cannot claim a recurring series was updated',async receipt=>{
 prepare(receipt);
 await openFutureRecurringBooking();
 await screen.findByText(/Appointment change was not confirmed\. Refresh the calendar before retrying\./);
 expect(screen.queryByText(/appointments? updated\. Adjacent openings/)).toBeNull();
 expect(m.rpc).toHaveBeenCalledWith('edit_calendar_appointments',expect.objectContaining({
  p_id:booking.id,p_scope:'future',p_action:'save'
 }));
});
test('positive calendar edit receipt confirms affected recurring occurrences',async()=>{
 prepare(2);
 await openFutureRecurringBooking();
 await screen.findByText('2 appointments updated. Adjacent openings have been recalculated.');
 expect(screen.queryByText(/Appointment change was not confirmed/)).toBeNull();
});

test('two edit submit events in one render batch create only one pending recurring-series write',async()=>{
 prepare(2);
 let finish!:(result:{data:number;error:null})=>void;
 const pending=new Promise<{data:number;error:null}>(resolve=>{finish=resolve;});
 m.rpc.mockImplementation((name:string)=>({
  abortSignal:()=>name==='scheduling_patients'?Promise.resolve({data:[],error:null}):pending
 }));
 const form=await openFutureRecurringEditor();
 // Batched submits reproduce a repeat before React can render disabled controls.
 act(()=>{fireEvent.submit(form);fireEvent.submit(form);});
 const mutations=m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments');
 expect(mutations).toHaveLength(1);
 expect(mutations[0][1]).toEqual(expect.objectContaining({p_scope:'future',p_action:'save'}));
 finish({data:2,error:null});
 await screen.findByText('2 appointments updated. Adjacent openings have been recalculated.');
 expect(m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments')).toHaveLength(1);
});

test('confirmation and simultaneous edit submit cannot execute competing cancellation and save',async()=>{
 prepare(2);
 let finish!:(result:{data:number;error:null})=>void;
 const pending=new Promise<{data:number;error:null}>(resolve=>{finish=resolve;});
 m.rpc.mockImplementation((name:string)=>({
  abortSignal:()=>name==='scheduling_patients'?Promise.resolve({data:[],error:null}):pending
 }));
 const form=await openFutureRecurringEditor();
 fireEvent.click(screen.getByRole('button',{name:'Cancel appointment'}));
 const confirm=screen.getByRole('button',{name:'Confirm cancellation'});
 act(()=>{fireEvent.click(confirm);fireEvent.submit(form);});
 const mutations=m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments');
 expect(mutations).toHaveLength(1);
 expect(mutations[0][1]).toEqual(expect.objectContaining({p_scope:'future',p_action:'cancel'}));
 finish({data:2,error:null});
 await screen.findByText('2 appointments cancelled. Adjacent openings have been recalculated.');
 expect(m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments')).toHaveLength(1);
});

test.each([
 {name:'connection failure after an uncertain commit',data:null,error:{code:'08006',message:'Connection lost'}},
 {name:'unknown completion status',data:null,error:{code:'40003',message:'Completion unknown'}},
 {name:'server shutdown while awaiting acknowledgment',data:null,error:{code:'57P01',message:'Server unavailable'}},
 {name:'malformed successful receipt',data:null,error:null},
])('uncertain $name locks repeat edit and cancellation until page reload',async ({data,error})=>{
 prepare(2);
 m.rpc.mockImplementation((name:string)=>({
  abortSignal:async()=>name==='scheduling_patients'?{data:[],error:null}:{data,error}
 }));
 const form=await openFutureRecurringEditor();
 fireEvent.submit(form);
 expect((await screen.findAllByText(/Further calendar edits and cancellations are locked in this session/)).length).toBeGreaterThan(0);
 // Even synthetic direct form dispatch cannot bypass the post-error write lock.
 fireEvent.submit(form);
 expect((screen.getByRole('button',{name:'Save changes'}) as HTMLButtonElement).disabled).toBe(true);
 expect((screen.getByRole('button',{name:'Cancel appointment'}) as HTMLButtonElement).disabled).toBe(true);
 const changes=m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments');
 expect(changes).toHaveLength(1);
 expect(screen.queryByText(/appointments? updated\. Adjacent openings/)).toBeNull();
 expect(screen.queryByText(/appointments? cancelled\. Adjacent openings/)).toBeNull();
});

test('uncertain recurring-series cancellation also prevents a subsequent edit',async()=>{
 prepare(2);
 m.rpc.mockImplementation((name:string)=>({
  abortSignal:async()=>name==='scheduling_patients'?{data:[],error:null}:
   {data:null,error:{code:'08006',message:'Cancellation acknowledgment lost'}}
 }));
 const form=await openFutureRecurringEditor();
 fireEvent.click(screen.getByRole('button',{name:'Cancel appointment'}));
 fireEvent.click(screen.getByRole('button',{name:'Confirm cancellation'}));
 await screen.findByText(/A calendar edit or cancellation may already have committed/);
 fireEvent.submit(form);
 expect(m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments')).toHaveLength(1);
 expect((screen.getByRole('button',{name:'Save changes'}) as HTMLButtonElement).disabled).toBe(true);
});

test('definitive calendar conflict rejection allows a corrected retry',async()=>{
 prepare(2);
 let attempt=0;
 m.rpc.mockImplementation((name:string)=>({
  abortSignal:async()=>name==='scheduling_patients'?{data:[],error:null}:
   (++attempt===1?{data:null,error:{code:'23505',message:'Appointment conflict'}}:{data:2,error:null})
 }));
 const form=await openFutureRecurringEditor();
 fireEvent.submit(form);
 await screen.findByText(/Appointment conflict\. Refresh the calendar and choose another time\./);
 expect(screen.queryByText(/Further calendar edits and cancellations are locked/)).toBeNull();
 fireEvent.submit(form);
 await screen.findByText('2 appointments updated. Adjacent openings have been recalculated.');
 expect(m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments')).toHaveLength(2);
});

test('a name-only recurring booking never implies a link to the central patient chart',async()=>{
 prepare(2);
 await openFutureRecurringEditor();
 expect(screen.getByText(/name-only booking, not a central patient chart link/i)).toBeTruthy();
 expect(screen.getByText(/Renaming this booking will not create a chart link/i)).toBeTruthy();
});

test('a centrally linked patient booking does not show the name-only warning',async()=>{
 const chartId='00000000-0000-4000-8000-000000000901';
 prepare(1,{...booking,patient_id:chartId});
 m.rpc.mockImplementation((name:string)=>({
  abortSignal:async()=>({data:name==='scheduling_patients'?
   [{id:chartId,full_name:'Synthetic Verified Directory Patient',preferred_name:null}]:1,error:null})
 }));
 await openFutureRecurringEditor();
 expect(screen.queryByText(/name-only booking, not a central patient chart link/i)).toBeNull();
 expect(screen.queryByText(/Renaming this booking will not create a chart link/i)).toBeNull();
});

test.each([
 ['cancelled status returned despite booked filter',{...booking,status:'cancelled'}],
 ['wrong linked patient identity',{...booking,patient_id:'invalid-chart-id'}],
 ['non-positive appointment duration',{...booking,ends_at:booking.starts_at}],
 ['duplicate appointment identities returned across rows',[booking,{...booking}]],
])('calendar withholds edit controls on %s',async(_reason,rows)=>{
 prepare(1,rows as CalendarAppointment|CalendarAppointment[]);
 render(<CalendarClient timezone={timezone} duration={50}/>);
 fireEvent.click(screen.getByRole('button',{name:'Next month'}));
 await screen.findByText(/Calendar appointment readback could not be verified\. Refresh before editing bookings\./);
 expect(screen.queryByRole('button',{name:/Synthetic Scheduling Patient/})).toBeNull();
 expect(m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments')).toHaveLength(0);
});

test('refresh clears stale patient name and edit selection while appointment readback is pending',async()=>{
 prepare(1);
 await openFutureRecurringEditor();
 let finish!:(result:{data:CalendarAppointment[];error:null})=>void;
 const pending=new Promise<{data:CalendarAppointment[];error:null}>(resolve=>{finish=resolve;});
 const q:any={};
 for(const method of ['select','eq','gte','lt','order'])q[method]=vi.fn(()=>q);
 q.abortSignal=vi.fn(()=>pending);
 m.from.mockReturnValue(q);
 fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
 expect(screen.queryByLabelText('Apply to')).toBeNull();
 expect(screen.queryByRole('button',{name:/Synthetic Scheduling Patient/})).toBeNull();
 expect(screen.getByText('Loading appointments…')).toBeTruthy();
 await act(async()=>{finish({data:[booking],error:null});});
 await screen.findByRole('button',{name:/Synthetic Scheduling Patient/});
 expect(screen.queryByLabelText('Apply to')).toBeNull();
 expect(m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments')).toHaveLength(0);
});

test('failed refresh does not leave prior recurring appointment editable or display stale patient bookings',async()=>{
 prepare(1);
 await openFutureRecurringEditor();
 const q:any={};
 for(const method of ['select','eq','gte','lt','order'])q[method]=vi.fn(()=>q);
 q.abortSignal=vi.fn(async()=>({data:null,error:{code:'42501',message:'Readback denied'}}));
 m.from.mockReturnValue(q);
 fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
 await screen.findByText(/Appointments could not be loaded\. Try Refresh\./);
 expect(screen.queryByLabelText('Apply to')).toBeNull();
 expect(screen.queryByRole('button',{name:/Synthetic Scheduling Patient/})).toBeNull();
 expect(screen.queryByRole('button',{name:'Save changes'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Cancel appointment'})).toBeNull();
 expect(m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments')).toHaveLength(0);
});

test.each([
 ['non-array directory response',{id:booking.id,full_name:'Synthetic Directory Patient',preferred_name:null}],
 ['malformed central patient ID',[{id:'not-a-valid-central-id',full_name:'Synthetic Directory Patient',preferred_name:null}]],
 ['duplicate central chart identity',[
  {id:booking.id,full_name:'Synthetic Directory Patient',preferred_name:null},
  {id:booking.id.toUpperCase(),full_name:'Another Synthetic Name',preferred_name:null}
 ]],
 ['malformed patient name',[{id:booking.id,full_name:{secret:'untrusted'},preferred_name:null}]]
])('invalid scheduler patient roster (%s) never displays or enables stale bookings',async (_reason,roster)=>{
 prepare(1);
 m.rpc.mockImplementation((name:string)=>({
  abortSignal:async()=>({data:name==='scheduling_patients'?roster:1,error:null})
 }));
 render(<CalendarClient timezone={timezone} duration={50}/>);
 fireEvent.click(screen.getByRole('button',{name:'Next month'}));
 await screen.findByText(/Calendar patient roster could not be verified\. Refresh before editing bookings\./);
 expect(screen.queryByRole('button',{name:/Synthetic Scheduling Patient/})).toBeNull();
 expect(screen.queryByRole('button',{name:'Save changes'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Cancel appointment'})).toBeNull();
 expect(m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments')).toHaveLength(0);
});

test('verified scheduler patient roster may label the exact linked chart appointment',async()=>{
 const chartId='00000000-0000-4000-8000-000000000901';
 prepare(1,{...booking,patient_id:chartId,patient_name:null});
 m.rpc.mockImplementation((name:string)=>({
  abortSignal:async()=>({data:name==='scheduling_patients'?
   [{id:chartId,full_name:'Synthetic Verified Directory Patient',preferred_name:null}]:1,error:null})
 }));
 render(<CalendarClient timezone={timezone} duration={50}/>);
 fireEvent.click(screen.getByRole('button',{name:'Next month'}));
 const open=await screen.findByRole('button',{name:/Synthetic Verified Directory Patient/});
 fireEvent.click(open);
 expect(screen.getByRole('heading',{name:'Appointment details'})).toBeTruthy();
 expect(screen.queryByText(/name-only booking, not a central patient chart link/i)).toBeNull();
});


test('linked appointment without a corresponding authorized central chart remains uneditable',async()=>{
 const chartId='00000000-0000-4000-8000-000000000901';
 prepare(1,{...booking,patient_id:chartId});
 // An empty, otherwise successful directory result cannot verify a chart link.
 render(<CalendarClient timezone={timezone} duration={50}/>);
 fireEvent.click(screen.getByRole('button',{name:'Next month'}));
 await screen.findByText(/Calendar linked patient identity could not be verified\. Refresh before editing bookings\./);
 expect(screen.queryByRole('button',{name:/Synthetic Scheduling Patient/})).toBeNull();
 expect(screen.queryByRole('button',{name:'Save changes'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Cancel appointment'})).toBeNull();
 expect(m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments')).toHaveLength(0);
});

test('linked appointment displays the verified chart name, never stale free-text booking identity',async()=>{
 const chartId='00000000-0000-4000-8000-000000000901';
 prepare(1,{...booking,patient_id:chartId,patient_name:'WRONG_SYNTHETIC_PATIENT'});
 m.rpc.mockImplementation((name:string)=>({
  abortSignal:async()=>({data:name==='scheduling_patients'?
   [{id:chartId,full_name:'Synthetic Verified Directory Patient',preferred_name:null}]:1,error:null})
 }));
 render(<CalendarClient timezone={timezone} duration={50}/>);
 fireEvent.click(screen.getByRole('button',{name:'Next month'}));
 const open=await screen.findByRole('button',{name:/Synthetic Verified Directory Patient/});
 expect(document.body.textContent).not.toContain('WRONG_SYNTHETIC_PATIENT');
 fireEvent.click(open);
 expect(screen.getByRole('heading',{name:'Appointment details'})).toBeTruthy();
 expect(document.body.textContent).not.toContain('WRONG_SYNTHETIC_PATIENT');
});

test('scheduler chart-directory identity comparison is UUID case-insensitive',async()=>{
 const chartId='00000000-0000-4000-8000-000000000901';
 prepare(1,{...booking,patient_id:chartId.toUpperCase(),patient_name:null});
 m.rpc.mockImplementation((name:string)=>({
  abortSignal:async()=>({data:name==='scheduling_patients'?
   [{id:chartId,full_name:'Synthetic Verified Directory Patient',preferred_name:null}]:1,error:null})
 }));
 render(<CalendarClient timezone={timezone} duration={50}/>);
 fireEvent.click(screen.getByRole('button',{name:'Next month'}));
 expect(await screen.findByRole('button',{name:/Synthetic Verified Directory Patient/})).toBeTruthy();
 expect(screen.queryByText(/Calendar linked patient identity could not be verified/)).toBeNull();
});

test.each([
 ['conflict rejection','23505','Appointment conflict',false],
 ['MFA authorization rejection','42501','Appointment authorization denied',false],
 ['lost connection','08006','Appointment change could not be confirmed',true],
 ['unknown database error','XX000','Appointment change could not be confirmed',true]
])('scheduler %s must not disclose provider-supplied patient or database details',async(_reason,code,expected,uncertain)=>{
 prepare(1);
 m.rpc.mockImplementation((name:string)=>({
  abortSignal:async()=>name==='scheduling_patients'?{data:[],error:null}:{
   data:null,error:{code,message:'SYNTHETIC_PHI_SENTINEL_123: private chart and SQL argument details'}
  }
 }));
 const form=await openFutureRecurringEditor();
 fireEvent.submit(form);
 await screen.findByText(new RegExp(expected));
 expect(document.body.textContent).not.toContain('SYNTHETIC_PHI_SENTINEL_123');
 expect(screen.queryByText(/private chart and SQL argument details/)).toBeNull();
 expect(m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments')).toHaveLength(1);
 if(uncertain)expect((screen.getByRole('button',{name:'Save changes'}) as HTMLButtonElement).disabled).toBe(true);
 else expect(screen.queryByText(/Further calendar edits and cancellations are locked in this session/)).toBeNull();
});

test('scheduler does not disclose details from a thrown provider transport exception',async()=>{
 prepare(1);
 m.rpc.mockImplementation((name:string)=>({
  abortSignal:async()=> {
   if(name==='scheduling_patients')return {data:[],error:null};
   throw new Error('SYNTHETIC_PHI_SENTINEL_123: failed SQL containing chart ID');
  }
 }));
 const form=await openFutureRecurringEditor();
 fireEvent.submit(form);
 await screen.findByText(/Appointment change could not be confirmed/);
 expect(document.body.textContent).not.toContain('SYNTHETIC_PHI_SENTINEL_123');
 expect((screen.getByRole('button',{name:'Save changes'}) as HTMLButtonElement).disabled).toBe(true);
});
