import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
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
async function openFutureRecurringBooking(){
 render(<CalendarClient timezone={timezone} duration={50}/>);
 fireEvent.click(screen.getByRole('button',{name:'Next month'}));
 const open=await screen.findByRole('button',{name:/Synthetic Scheduling Patient/});
 fireEvent.click(open);
 expect(screen.getByLabelText('Apply to')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Apply to'),{target:{value:'future'}});
 fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
}
beforeEach(()=>vi.clearAllMocks());
afterEach(()=>cleanup());

test.each([0,null,'2'])('calendar edit receipt %s cannot claim a recurring series was updated',async receipt=>{
 prepare(receipt);
 await openFutureRecurringBooking();
 await screen.findByText('Appointment change was not confirmed. Refresh the calendar before retrying.');
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
