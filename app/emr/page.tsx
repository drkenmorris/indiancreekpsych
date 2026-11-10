import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {emrAccess} from '@/lib/emr/access';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import './entry.css';

export const dynamic='force-dynamic';

const sections=[
 {title:'Central patient records',description:'Find the patient chart, reviewed demographics, clinical history and source reconciliation.',href:'/emr/patients',label:'Open patient directory'},
 {title:'Treatment planning',description:'Manage the clinical treatment library and create versioned individualized treatment plans.',href:'/emr/treatment-planners',label:'Treatment plan library'},
 {title:'Group therapy',description:'Document group attendance, shared sessions and patient-specific progress records.',href:'/emr/groups',label:'Group therapy workspace'},
 {title:'Clinical assessments',description:'Access assigned instruments and the assessment administration workspace.',href:'/clinical-tests',label:'Clinical assessments'},
 {title:'Intake and documents',description:'Review submitted intake material and patient-reported clinical source information.',href:'/admin/intakes',label:'Intake administration'},
 {title:'Appointments and calendar',description:'Use the existing production scheduling system. Existing appointments are preserved.',href:'/appointments',label:'Open existing scheduler'},
] as const;

export default async function EmrPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 const authorized=user?Boolean(await emrAccess()):false;
 return <AdministrativeShell><main className="emrEntry" aria-labelledby="emr-title">
  <header className="emrEntryHeader">
   <p className="emrEntryEyebrow">Indian Creek Psychological Services · Clinical workspace</p>
   <h1 id="emr-title">Electronic Medical Records</h1>
   <p>Secure entry to the integrated clinical record, assessments, treatment planning and scheduling.</p>
  </header>
  {!user?<section className="emrEntryLogin" aria-labelledby="emr-login-title">
   <p className="emrEntryEyebrow">Administrator sign-in required</p>
   <h2 id="emr-login-title">Access your clinical workspace</h2>
   <p>Use your existing clinic administrator account. Your current password, permissions and authenticator-app security stay in place.</p>
   <Link className="emrEntryButton" href="/login?next=%2Femr">Sign in to EMR</Link>
   <p className="emrEntryHelp">Already signed in on another device? Sign in here to establish a protected session.</p>
  </section>:!authorized?<section className="emrEntryLogin" aria-labelledby="emr-verify-title">
   <p className="emrEntryEyebrow">Access verification required</p>
   <h2 id="emr-verify-title">Complete administrator verification</h2>
   <p>Clinical modules require your existing administrator role and multi-factor authentication. No patient records are displayed until access is verified.</p>
   <Link className="emrEntryButton" href="/account/security?next=%2Femr">Complete security verification</Link>
   <p><Link href="/account">Account settings</Link> · <Link href="/login?next=%2Femr">Use another account</Link></p>
  </section>:<><section className="emrEntryWelcome">
   <div><p className="emrEntryEyebrow">Administrator access verified</p><h2>Clinical operations</h2><p>Select a workspace. Patient charts remain in the protected central repository.</p></div>
   <Link href="/account">Manage account security</Link>
  </section>
  <section className="emrEntryGrid" aria-label="EMR workspaces">{sections.map(item=>
   <article key={item.href} className="emrEntryCard"><h3>{item.title}</h3><p>{item.description}</p><Link href={item.href}>{item.label} <span aria-hidden="true">→</span></Link></article>
  )}</section></>}
  <footer className="emrEntryFooter"><Link href="/">Clinic home</Link><span>Existing scheduler and administrative credentials remain unchanged.</span></footer>
 </main></AdministrativeShell>;
}
