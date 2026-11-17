import {patientAccess} from '@/lib/patient/access';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import IndividualProgressPlanner from './IndividualProgressPlanner';
import './progress-plan.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{patient?:string;embedded?:string}>}){
 const {patient,embedded}=await searchParams;
 const patientId=typeof patient==='string'?patient:'';
 const query=new URLSearchParams();
 if(patientId)query.set('patient',patientId);
 if(embedded==='1')query.set('embedded','1');
 await patientAccess(true,'/emr/individual-progress-planner'+(query.size?'?'+query.toString():''));
 const content=<main className="progressPlanWorkspace"><IndividualProgressPlanner key={patientId} patientId={patientId}/></main>;
 return embedded==='1'?content:<AdministrativeShell>{content}</AdministrativeShell>;
}
