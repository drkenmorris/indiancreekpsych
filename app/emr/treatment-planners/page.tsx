import {patientAccess} from '@/lib/patient/access';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import TreatmentLibrary from './TreatmentLibrary';
import '../treatment-planner.css';
export const dynamic='force-dynamic';
export default async function Page(){await patientAccess(true,'/emr/treatment-planners');return <AdministrativeShell><main className="treatmentWorkspace"><TreatmentLibrary/></main></AdministrativeShell>;}
