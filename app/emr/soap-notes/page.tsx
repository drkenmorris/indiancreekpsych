import {patientAccess} from '@/lib/patient/access';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import SoapNotes from './SoapNotes';
import '../central-emr.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{patient?:string;embedded?:string}>}){
 const {patient='',embedded}=await searchParams;
 const query=new URLSearchParams();if(patient)query.set('patient',patient);if(embedded==='1')query.set('embedded','1');
 await patientAccess(true,'/emr/soap-notes'+(query.size?'?'+query.toString():''));
 const content=<main className="centralEmr"><SoapNotes key={patient} patientId={patient}/></main>;
 return embedded==='1'?content:<AdministrativeShell>{content}</AdministrativeShell>;
}
