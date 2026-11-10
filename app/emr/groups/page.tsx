import {patientAccess} from '@/lib/patient/access';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import GroupSessions from './GroupSessions';
export const dynamic='force-dynamic';
export default async function Page(){await patientAccess(true,'/emr/groups');return <AdministrativeShell><main><GroupSessions/></main></AdministrativeShell>;}
