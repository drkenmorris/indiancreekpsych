import {patientAccess} from '@/lib/patient/access';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import PatientRepository from '../PatientRepository';
export const dynamic='force-dynamic';
export default async function EmrPatientsPage(){await patientAccess(true,'/emr/patients');return <AdministrativeShell><main className="centralEmr"><PatientRepository/></main></AdministrativeShell>;}
