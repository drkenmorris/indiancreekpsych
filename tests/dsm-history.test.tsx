import {test,expect,vi} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
const mock=vi.hoisted(()=>({access:vi.fn()}));
vi.mock('../lib/patient/access',()=>({patientAccess:mock.access}));
vi.mock('../app/components/AdministrativeShell',()=>({default:({children}:{children:React.ReactNode})=><>{children}</>}));
vi.mock('next/link',()=>({default:({href,children}:{href:string;children:React.ReactNode})=><a href={href}>{children}</a>}));
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('not found');}}));
import History from '../app/emr/dsm/page';
const patient='00000000-0000-0000-0000-000000000201';
test('patient history lists independent dated administrations and original/current clinician evaluations',async()=>{
 const rows={psych_test_assignments:[{id:'first',dsm_version:'adult',recipient_first_name:'Fictional',recipient_last_name:'Person',dsm_source_hash:'hash',created_at:'2026-10-01T10:00:00Z',status:'sent'},{id:'second',dsm_version:'adult',recipient_first_name:'Fictional',recipient_last_name:'Person',dsm_source_hash:'hash',created_at:'2026-11-01T10:00:00Z',status:'sent'}],dsm_assignment_responses:[{assignment_id:'first',status:'submitted',revision:4,answered_count:150,submitted_at:'2026-10-02T10:00:00Z'},{assignment_id:'second',status:'submitted',revision:8,answered_count:160,submitted_at:'2026-11-02T10:00:00Z'}],dsm_records:[{id:'record-first',source_assignment_id:'first',label:'First assessment',revision:3,created_at:'2026-10-02T10:00:00Z',updated_at:'2026-10-03T10:00:00Z'},{id:'record-second',source_assignment_id:'second',label:'Repeat assessment',revision:1,created_at:'2026-11-02T10:00:00Z',updated_at:'2026-11-02T10:00:00Z'}]};
 const filters:unknown[]=[];mock.access.mockResolvedValue({user:{id:'owner'},supabase:{from:(table:keyof typeof rows)=>{const query={select:()=>query,eq:(...args:unknown[])=>{filters.push([table,...args]);return query;},in:()=>query,order:()=>query,then:(resolve:Function)=>resolve({data:rows[table],error:null})};return query;}}});
 render(await History({searchParams:Promise.resolve({patient})}));expect(screen.getAllByRole('link',{name:'Open this administration’s responses / evaluation'})).toHaveLength(2);
 expect(screen.getAllByRole('link',{name:'Original imported evaluation'}).map(l=>l.getAttribute('href'))).toEqual(['/clinical-tests/dev/summary?record=record-first&revision=1','/clinical-tests/dev/summary?record=record-second&revision=1']);
 expect(screen.getByRole('link',{name:'Open saved clinician evaluation — revision 3'}).getAttribute('href')).toContain('record-first');expect(screen.getByText(/150 recorded answers/)).toBeTruthy();expect(screen.getByText(/160 recorded answers/)).toBeTruthy();
 expect(filters).toContainEqual(['psych_test_assignments','patient_id',patient]);expect(filters).toContainEqual(['psych_test_assignments','assigned_by','owner']);expect(filters).toContainEqual(['dsm_records','owner_id','owner']);cleanup();
});
