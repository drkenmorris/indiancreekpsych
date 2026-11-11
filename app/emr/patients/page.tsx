import {patientAccess} from '@/lib/patient/access';
import {uuid} from '@/lib/emr/demographics';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import PatientRepository from '../PatientRepository';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams?:Promise<{patient?:string}>}={}){
 const params=searchParams?await searchParams:{};
 const returnTo='/emr/patients'+(uuid(params.patient)?'?patient='+params.patient:'');
 await patientAccess(true,returnTo);
 return <AdministrativeShell><main className="centralEmr"><PatientRepository/></main></AdministrativeShell>;
}
