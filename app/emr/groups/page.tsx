import {patientAccess} from '@/lib/patient/access';
import GroupSessions from './GroupSessions';
import GroupProgressHistory from './GroupProgressHistory';
import GroupTreatmentPlanner from './GroupTreatmentPlanner';
import {uuid} from '@/lib/emr/demographics';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{section?:string;patient?:string}>}){
 await patientAccess(true,'/emr/groups');const query=await searchParams;const patient=uuid(query.patient)?query.patient:undefined;
 return <main>{query.section==='history'?<GroupProgressHistory patientId={patient}/>:query.section==='planner'?<GroupTreatmentPlanner/>:<GroupSessions mode={query.section==='notes'?'notes':query.section==='administration'?'administration':'legacy'} patientId={patient}/>}</main>;
}
