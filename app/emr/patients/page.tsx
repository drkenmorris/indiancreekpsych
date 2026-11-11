import {patientAccess} from '@/lib/patient/access';
import {uuid} from '@/lib/emr/demographics';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import PatientRepository from '../PatientRepository';
export const dynamic='force-dynamic';
const reviewAnchors=new Set(['emr-intake-medication-review','emr-intake-allergy-review',
 'emr-intake-medical-review','emr-intake-trauma-review']);
type Props={searchParams?:Promise<{patient?:string;review?:string}>};
export default async function EmrPatientsPage({searchParams}:Props={}){
 const params=searchParams?await searchParams:{};
 const query=new URLSearchParams();
 // The original BPS source links target the exact linked central chart.
 // Retain only a valid patient UUID and a known clinician-review destination
 // through sign-in and MFA; never accept a caller-controlled redirect.
 if(uuid(params.patient)){
  query.set('patient',params.patient);
  if(params.review&&reviewAnchors.has(params.review))query.set('review',params.review);
 }
 const returnTo='/emr/patients'+(query.size?'?'+query.toString():'');
 await patientAccess(true,returnTo);
 return <AdministrativeShell><main className="centralEmr"><PatientRepository/></main></AdministrativeShell>;
}
