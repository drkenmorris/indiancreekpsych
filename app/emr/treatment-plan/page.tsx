import {patientAccess} from '@/lib/patient/access';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import PatientTreatmentPlan from './PatientTreatmentPlan';
import '../treatment-planner.css';
export const dynamic='force-dynamic';
export default async function Page(){await patientAccess(true,'/emr/treatment-plan');return <AdministrativeShell><main className="treatmentWorkspace"><PatientTreatmentPlan/></main></AdministrativeShell>;}
