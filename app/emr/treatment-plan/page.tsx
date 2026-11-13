import {patientAccess} from '@/lib/patient/access';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import PatientTreatmentPlan from './PatientTreatmentPlan';
import '../treatment-planner.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{patient?:string;step?:string;embedded?:string}>}){
 const {patient,step,embedded}=await searchParams;
 const query=new URLSearchParams();
 if(typeof patient==='string')query.set('patient',patient);
 if(typeof step==='string')query.set('step',step);
 if(embedded==='1')query.set('embedded','1');
 await patientAccess(true,'/emr/treatment-plan'+(query.size?'?'+query.toString():''));
 if(embedded==='1')return <main className="treatmentWorkspace treatmentEmbedded"><PatientTreatmentPlan embedded/></main>;
 return <AdministrativeShell><main className="treatmentWorkspace"><PatientTreatmentPlan/></main></AdministrativeShell>;}
