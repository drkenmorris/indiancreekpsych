import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {localParts,shiftMonth} from '@/lib/scheduling/calendar';
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
function prepare(receipt:unknown){
 const q:any={};
 for(const method of ['select','eq','gte','lt','order'])q[method]=vi.fn(()=>q);
 q.abortSignal=vi.fn(async()=>({data:[booking],error:null}));
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
 await screen.findByText(/Further calendar edits and cancellations are locked in this session/);
 // Directly submit again and attempt the cancellation control even after the
 // first RPC has settled. Neither path may issue another write.
 fireEvent.submit(form);
 fireEvent.click(screen.getByRole('button',{name:'Cancel appointment'}));
 fireEvent.click(screen.getByRole('button',{name:'Confirm cancellation'}));
 const changes=m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments');
 expect(changes).toHaveLength(1);
 expect(screen.queryByText(/appointments? updated\. Adjacent openings/)).toBeNull();
 expect(screen.queryByText(/appointments? cancelled\. Adjacent openings/)).toBeNull();
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
 await screen.findByText('Appointment conflict');
 expect(screen.queryByText(/Further calendar edits and cancellations are locked/)).toBeNull();
 fireEvent.submit(form);
 await screen.findByText('2 appointments updated. Adjacent openings have been recalculated.');
 expect(m.rpc.mock.calls.filter(([name])=>name==='edit_calendar_appointments')).toHaveLength(2);
});
