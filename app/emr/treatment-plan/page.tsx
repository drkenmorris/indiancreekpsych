import {patientAccess} from '@/lib/patient/access';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import PatientTreatmentPlan from './PatientTreatmentPlan';
import '../treatment-planner.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{patient?:string;step?:string}>}){
 const {patient,step}=await searchParams;
 const query=new URLSearchParams();
 if(typeof patient==='string')query.set('patient',patient);
 if(typeof step==='string')query.set('step',step);
 await patientAccess(true,'/emr/treatment-plan'+(query.size?'?'+query.toString():''));return <AdministrativeShell><main className="treatmentWorkspace"><PatientTreatmentPlan/></main></AdministrativeShell>;}
