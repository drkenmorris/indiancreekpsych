import {patientAccess} from '@/lib/patient/access';

import GroupSessions from './GroupSessions';
export const dynamic='force-dynamic';
export default async function Page(){await patientAccess(true,'/emr/groups');return <><main><GroupSessions/></main></>;}
