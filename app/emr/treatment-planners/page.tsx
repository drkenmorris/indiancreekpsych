import {patientAccess} from '@/lib/patient/access';

import TreatmentLibrary from './TreatmentLibrary';
import '../treatment-planner.css';
export const dynamic='force-dynamic';
export default async function Page(){await patientAccess(true,'/emr/treatment-planners');return <><main className="treatmentWorkspace"><TreatmentLibrary/></main></>;}
