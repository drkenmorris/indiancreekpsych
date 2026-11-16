import Link from 'next/link';
import {patientAccess} from '@/lib/patient/access';
import {uuid} from '@/lib/emr/demographics';
import HomeworkForm from './HomeworkForm';
import '../treatment-planner.css';
import '../treatment-response/response.css';
import './homework.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{patient?:string;embedded?:string}>}){
 const {patient,embedded}=await searchParams;const patientId=uuid(patient)?patient:null;
 const query=new URLSearchParams();if(patientId)query.set('patient',patientId);if(embedded==='1')query.set('embedded','1');
 await patientAccess(true,'/emr/homework'+(query.size?'?'+query:''));
 return <main className="treatmentWorkspace treatmentEmbedded">{embedded!=='1'&&<p className="noHomeworkPrint"><Link href="/emr">EMR workspace</Link></p>}{patientId?<HomeworkForm key={patientId} patientId={patientId}/>:<><h1>Homework</h1><p>Select a patient in the EMR to assign homework.</p></>}</main>;
}
