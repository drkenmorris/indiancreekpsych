import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {patientAccess} from '@/lib/patient/access';
import {emrAccess} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import PatientBpsIntakeReview from '../PatientBpsIntakeReview';
import '../central-emr.css';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{patient?:string}>};

export default async function EmrBpsIntakePage({searchParams}:Props){
 await patientAccess(true,'/emr/bps-intake');
 const ctx=await emrAccess();
 if(!ctx)redirect('/account/security?next=%2Femr');
 const {patient}=await searchParams;
 if(!uuid(patient))redirect('/emr');
 const {data,error}=await ctx.supabase.from('clinical_patients').select('id').eq('id',patient).maybeSingle();
 if(error)throw Error('The central patient could not be verified.');
 if(!data)notFound();
 const params=new URLSearchParams({patient,module:'assessment',section:'assessment:biopsychosocial'});
 return <AdministrativeShell><main className="centralEmr" aria-label="Protected clinician-reviewed biopsychosocial intake">
  <header><p>Indian Creek Psychological Services · Central clinical chart</p>
   <h1>Patient intake → Biopsychosocial assessment</h1>
   <p>This linked patient chart uses the clinic's existing administrator credentials, MFA and Supabase authorization. No synthetic or browser-local intake record is imported.</p>
   <nav aria-label="BPS clinical navigation">
    <Link href={'/emr/workspace?'+params.toString()}>Return to the original biopsychosocial assessment</Link>
    <Link href={'/emr/patients?patient='+encodeURIComponent(patient)}>Open central chart and dedicated medication/allergy reconciliation</Link>
    <Link href="/appointments">Clinic scheduler (unchanged)</Link>
   </nav>
  </header>
  <PatientBpsIntakeReview patientId={patient}/>
 </main></AdministrativeShell>;
}
