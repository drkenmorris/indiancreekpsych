import Link from 'next/link';
import {redirect} from 'next/navigation';
import {uuid} from '@/lib/emr/demographics';
import {createClient} from '@/lib/supabase/server';
import {emrAccess} from '@/lib/emr/access';
import AdministrativeShell from '@/app/components/AdministrativeShell';
import './entry.css';

export const dynamic='force-dynamic';

type PatientRow={id:string;demographics:Record<string,unknown>|null};
const demoModules=[
 ['assessment','assessment:biopsychosocial','Biopsychosocial assessment'],
 ['demographics','','Patient demographics'],
 ['notes','','Progress notes'],
 ['plan','','Treatment planning'],
 ['privacy','','Legal forms and notices'],
 ['insurance','','Insurance information'],
 ['history','','Chart history'],
] as const;
function clinicalHref(id:string,module:string,section:string){
 const query=new URLSearchParams({patient:id,module});
 if(section)query.set('section',section);
 return '/emr/workspace?'+query.toString();
}
function labelPatient(patient:PatientRow){
 const d=patient.demographics??{};
 const name=[d.first_name,d.last_name].filter(v=>typeof v==='string'&&v.trim()).join(' ');
 return name||'Patient chart '+patient.id.slice(0,8);
}
type EntryParams={patient?:string;module?:string;section?:string};
export default async function EmrPage({searchParams}:{searchParams?:Promise<EntryParams>}={}){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 const ctx=user?await emrAccess():null;
 let patients:PatientRow[]=[];
 let error='';
 if(ctx){
  const query=await ctx.supabase.from('clinical_patients').select('id,demographics').order('updated_at',{ascending:false}).limit(200);
  if(query.error)error='The patient directory is temporarily unavailable. No charts were changed.';
  else patients=(query.data??[]) as PatientRow[];
 }
 // Only an explicitly selected patient from the authorized central directory may launch the original EMR.
 const selected=searchParams?await searchParams:null;
 if(ctx&&!error&&uuid(selected?.patient)&&patients.some(patient=>patient.id===selected.patient)){
  const requested=demoModules.find(([module])=>module===selected.module);
  const module=requested?.[0]??'assessment';
  redirect(clinicalHref(selected.patient,module,module==='assessment'?'assessment:biopsychosocial':''));
 }
 return <AdministrativeShell><main className="emrEntry" aria-labelledby="emr-title">
  <header className="emrEntryHeader"><p className="emrEntryEyebrow">Indian Creek Psychological Services · Clinical workspace</p>
   <h1 id="emr-title">Electronic Medical Records</h1>
   <p>The complete clinical workspace, including the biopsychosocial assessment, chart modules, notes, treatment planning and forms.</p></header>
  {!user?<section className="emrEntryLogin"><h2>Administrator sign-in</h2>
   <p>Enter using your existing administrator account and multi-factor verification.</p>
   <Link className="emrEntryButton" href="/login?next=%2Femr">Sign in to EMR</Link>
  </section>:!ctx?<section className="emrEntryLogin"><h2>Complete administrator verification</h2>
   <p>The clinical workspace requires an authorized administrator and MFA. Patient accounts may use clinic services without enrolling MFA.</p>
   <Link className="emrEntryButton" href="/account/security?next=%2Femr">Complete security verification</Link>
   <p><Link href="/account">Account settings</Link></p></section>:<section className="emrEntryClinical">
    <div className="emrEntryWelcome"><div><p className="emrEntryEyebrow">Administrator access verified</p>
    <h2>Choose a patient to open the clinical EMR</h2>
    <p>The full original-style EMR opens with the Biopsychosocial Assessment as its initial page. Its linked clinical modules remain available through the workspace menus.</p></div>
    <Link href="/admin/assign-test">Assign psychological tests and email patients</Link></div>
    {error&&<p role="alert">{error}</p>}
    {!error&&(patients.length?<div className="emrEntryPatientList"><table><thead><tr><th scope="col">Patient chart</th><th scope="col">Open the complete workspace</th></tr></thead>
    <tbody>{patients.map(patient=><tr key={patient.id}><th scope="row">{labelPatient(patient)}</th><td>
      <Link className="emrEntryPatientLaunch" href={clinicalHref(patient.id,'assessment','assessment:biopsychosocial')}>Open biopsychosocial assessment</Link>
      <details className="emrEntryModuleLinks"><summary>Other chart pages</summary><div>{demoModules.slice(1).map(([module,section,label])=><Link key={module} href={clinicalHref(patient.id,module,section)}>{label}</Link>)}</div></details>
    </td></tr>)}</tbody></table></div>:<section className="emrEntryLogin"><h3>No linked central patient charts are available</h3><p>Add or link a test patient through the existing patient directory, then return here to launch the complete clinical workspace.</p><Link href="/emr/patients">Patient directory — setup only</Link></section>)}
    <nav className="emrEntryActions" aria-label="Practice administration">
     <Link href="/admin/assign-test">Psychological test assignment and email</Link>
     <Link href="/appointments">Existing appointment scheduler</Link>
     <Link href="/emr/patients">Patient directory administration</Link>
     <Link href="/account">Administrator account</Link>
    </nav>
  </section>}
 </main></AdministrativeShell>;
}
