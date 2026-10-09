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
