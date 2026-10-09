import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import FirewallCheck from '../app/appointments/FirewallCheck';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('protection check submits only a fixed empty body with current-session credentials',async()=>{
 const fetch=vi.fn().mockResolvedValue({status:403,json:async()=>({error:"Request denied by the site's OmniCore firewall policy.",reference:'test-operation'})});vi.stubGlobal('fetch',fetch);
 render(<FirewallCheck/>);fireEvent.click(screen.getByText('OmniCore protection check'));fireEvent.click(screen.getByRole('button',{name:'Test request-format protection'}));
 await screen.findByText(/OmniCore rejected the prohibited format/);
 expect(fetch).toHaveBeenCalledWith('/api/scheduling/office-hours',expect.objectContaining({method:'POST',credentials:'same-origin',headers:{'Content-Type':'text/plain'},body:'{}'}));
});
test('authentication and unrelated failures cannot be presented as firewall success',async()=>{
 for(const status of [401,403,400,500]){
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({status,json:async()=>({error:'Other response'})}));render(<FirewallCheck/>);fireEvent.click(screen.getByText('OmniCore protection check'));fireEvent.click(screen.getByRole('button',{name:'Test request-format protection'}));
  await screen.findByText(status===401?/Authentication rejected/:/Firewall blocking was not confirmed/);
  expect(screen.queryByText(/OmniCore rejected the prohibited format/)).toBeNull();cleanup();
 }
});
test('protected connection check uses only the reserved identifier and confirms an explicit no-change receipt',async()=>{
 const fetch=vi.fn().mockResolvedValue({status:200,json:async()=>({check:'office_hours_protected_operation',matchedRules:0,changed:false})});vi.stubGlobal('fetch',fetch);
 render(<FirewallCheck/>);fireEvent.click(screen.getByText('OmniCore protection check'));fireEvent.click(screen.getByRole('button',{name:'Test protected connection (no changes)'}));
 await screen.findByText(/protected request completed without changing office hours/);
 expect(fetch).toHaveBeenCalledWith('/api/scheduling/office-hours/toggle',expect.objectContaining({method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'00000000-0000-0000-0000-000000000000',enabled:false})}));
});
test.each([
 [401,{},/Authentication rejected/],
 [403,{code:'owner_approval_required'},/requires current approval/],
 [200,{rule:{enabled:false}},/not confirmed/],
 [200,{check:'office_hours_protected_operation',matchedRules:1,changed:true},/not confirmed/],
 [503,{},/not confirmed/],
])('protected check does not overclaim response %s %j',async(status,result,message)=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({status,json:async()=>result}));render(<FirewallCheck/>);
 fireEvent.click(screen.getByText('OmniCore protection check'));fireEvent.click(screen.getByRole('button',{name:'Test protected connection (no changes)'}));
 await screen.findByText(message);expect(screen.queryByText(/protected request completed without changing/)).toBeNull();
});
