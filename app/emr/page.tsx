import {patientAccess} from '@/lib/patient/access';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import PatientRepository from './PatientRepository';
export const dynamic='force-dynamic';
export default async function EmrPage(){await patientAccess(true,'/emr');return <AdministrativeShell><main className="centralEmr"><PatientRepository/></main></AdministrativeShell>;}
