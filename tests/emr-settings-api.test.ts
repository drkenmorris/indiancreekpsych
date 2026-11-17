import {beforeEach,expect,test,vi} from 'vitest';
import {GET,POST} from '@/app/api/emr/settings/route';
import {defaultEmrSettings,validEmrSettings} from '@/lib/emr/settings';
const mock=vi.hoisted(()=>({access:vi.fn()}));vi.mock('@/lib/emr/access',async()=>({...await vi.importActual('@/lib/emr/access'),emrAccess:mock.access}));
let record:any,error:any,writes:any[];
const userId='00000000-0000-4000-8000-000000000005';
const post=(data:any,origin='https://clinic.test')=>new Request('https://clinic.test/api/emr/settings',{method:'POST',headers:{origin},body:JSON.stringify(data)});
beforeEach(()=>{record=null;error=null;writes=[];mock.access.mockResolvedValue({user:{id:userId},supabase:{from:()=>{const q:any={select:()=>q,eq:()=>q,insert:(data:any)=>{writes.push(data);record=data;return q;},update:(data:any)=>{writes.push(data);record=data;return q;},maybeSingle:async()=>({data:record,error})};return q;}}});});
test('settings are account-scoped and require MFA/same origin',async()=>{mock.access.mockResolvedValueOnce(null);expect((await GET()).status).toBe(403);expect((await POST(post({revision:0,settings:defaultEmrSettings},'https://elsewhere.test'))).status).toBe(403);expect(writes).toHaveLength(0);});
test('every preference, default, shortcut and custom field type saves and reloads',async()=>{
 expect((await(await GET()).json()).revision).toBe(0);
 const settings={preferences:{density:'compact',large_text:true,contrast:true},defaults:{note_template:'SOAP',country:'Fictional country',modality:'Group'},shortcuts:['personal','prognosis_details'],custom_fields:['text','date','number'].map((type,i)=>({id:'custom_00000000-0000-4000-8000-00000000000'+i,label:'Fictional '+type,type}))};
 expect(validEmrSettings(settings)).toBe(true);expect((await POST(post({revision:0,settings}))).status).toBe(200);expect(writes[0]).toMatchObject({account_id:userId,revision:1,settings});expect((await(await GET()).json()).settings).toEqual(settings);
});
test('invalid definitions or unknown options are rejected without writing',async()=>{for(const settings of [{...defaultEmrSettings,shortcuts:['unknown']},{...defaultEmrSettings,custom_fields:[{id:'bad',label:'bad',type:'script'}]},{...defaultEmrSettings,preferences:{...defaultEmrSettings.preferences,contrast:'true'}}])expect((await POST(post({settings,revision:0}))).status).toBe(400);expect(writes).toHaveLength(0);});
test('database failure does not become a browser-only success',async()=>{error={code:'unavailable'};expect((await POST(post({revision:0,settings:defaultEmrSettings}))).status).toBe(503);expect((await GET()).status).toBe(503);});
