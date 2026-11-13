import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {patientAccess} from '@/lib/patient/access';
import {emrAccess} from '@/lib/emr/access';
import {uuid} from '@/lib/emr/demographics';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import PatientBpsIntakeReview from '../PatientBpsIntakeReview';
import '../central-emr.css';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{patient?:string;bps_page?:string}>};
const bpsPageLabels=[
 {key:'symptoms',label:'Current symptom checklist'},
 {key:'treatment_history',label:'Counseling and psychiatric history'},
 {key:'medications',label:'Psychiatric medications'},
 {key:'family_origin',label:'Family of origin'},
 {key:'medical_substance',label:'Medical and substance-use history'},
 {key:'developmental_personal',label:'Developmental and personal history'},
 {key:'trauma_history',label:'Trauma history'}
] as const;
const bpsPages=new Set<string>(bpsPageLabels.map(page=>page.key));

export default async function EmrBpsIntakePage({searchParams}:Props){
 const {patient,bps_page}=await searchParams;
 // Keep an explicitly selected central chart and approved BPS subpage across
 // login and MFA. Do not preserve arbitrary return URLs or unsupported pages.
 const returnQuery=new URLSearchParams();
 if(uuid(patient)){
  returnQuery.set('patient',patient);
  if(bps_page&&bpsPages.has(bps_page))returnQuery.set('bps_page',bps_page);
 }
 const returnTo='/emr/bps-intake'+(returnQuery.size?'?'+returnQuery.toString():'');
 await patientAccess(true,returnTo);
 const ctx=await emrAccess();
 if(!ctx)redirect('/account/security?next='+encodeURIComponent(returnTo));
 if(!uuid(patient))redirect('/emr');
 const {data,error}=await ctx.supabase.from('clinical_patients').select('id,directory_deleted_at').eq('id',patient).is('directory_deleted_at',null).maybeSingle();
 if(error)throw Error('The central patient could not be verified.');
 // Never trust the query predicate alone: a stale, incorrectly scoped or mocked
 // result must not let a clinician open another patient's protected BPS page.
 if(!data||data.id!==patient||data.directory_deleted_at!==null)notFound();
 const params=new URLSearchParams({patient,module:'assessment',section:'assessment:biopsychosocial'});
 if(bps_page&&bpsPages.has(bps_page))params.set('bps_page',bps_page);
 return <AdministrativeShell><main className="centralEmr" aria-label="Protected clinician-reviewed biopsychosocial intake">
  <header><p>Indian Creek Psychological Services · Central clinical chart</p>
   <h1>Patient intake → Biopsychosocial assessment</h1>
   <p>This linked patient chart uses the clinic's existing administrator credentials, MFA and Supabase authorization. No synthetic or browser-local intake record is imported.</p>
   <nav aria-label="BPS clinical navigation">
    <Link href={'/emr/workspace?'+params.toString()}>Return to the original biopsychosocial assessment</Link>
    <Link href={'/emr/patients?patient='+encodeURIComponent(patient)}>Open central chart and dedicated medication/allergy reconciliation</Link>
    <Link href="/appointments">Clinic scheduler (unchanged)</Link>
   </nav>
   <nav aria-label="Original seven-page biopsychosocial forms">
    <p>Continue the independent clinician assessment on any of the seven original BPS pages for this exact patient. These links do not auto-copy questionnaire responses, certify findings or save an assessment.</p>
    {bpsPageLabels.map(page=>{
     const original=new URLSearchParams({patient,module:'assessment',section:'assessment:biopsychosocial',bps_page:page.key});
     return <Link key={page.key} href={'/emr/workspace?'+original.toString()}>{page.label}</Link>;
    })}
   </nav>
  </header>
  <PatientBpsIntakeReview patientId={patient}/>
 </main></AdministrativeShell>;
}
