import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {intakeSections,IntakeAnswers,IntakeRecord} from '@/lib/patient/intake';
import {LEGAL_PACKET_VERSION} from '@/lib/patient/legal-documents';

type KioskRecord={id:string;patient_name:string;date_of_birth:string;answers:IntakeAnswers;submitted_at:string|null};
type Saved={id:string;name:string;when:string|null;answers:IntakeAnswers;source:string};

function SubmittedPacket({record}:{record:Saved}){
 return <details className="appointmentPanel" style={{margin:'16px 0'}}>
  <summary>{record.name} — {record.when?new Date(record.when).toLocaleDateString():'Submission date unavailable'} · {record.source}</summary>
  <p><strong>Submitted:</strong> {record.when?new Date(record.when).toLocaleString():'Not available'}</p>
  <p><strong>Document revision:</strong> {record.answers.legal_packet_version||'Legacy intake (before comprehensive legal packet)'}</p>
  <p><strong>Separate authorizations:</strong> Release of information: {record.answers.roi_authorize||'Not recorded'}; psychotherapy notes: {record.answers.psych_notes_authorize||'Not recorded'}; telehealth: {record.answers.telehealth_choice||'Not recorded'}.</p>
  {intakeSections.map(section=><section key={section.title} className="intakeStaffReviewSection">
   <h2>{section.title}</h2>
   <dl>{section.fields.map(([key,label])=><div key={key}><dt><strong>{label}</strong></dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{record.answers[key]||'Not provided'}</dd></div>)}</dl>
  </section>)}
 </details>;
}
export default async function IntakeReviewPage(){
 const supabase=await createClient();
 const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError||!user)redirect('/login');
 if(!user.email_confirmed_at)redirect('/account/security');
 const {data:profile,error:profileError}=await supabase.from('profiles').select('account_type').eq('id',user.id).single();
 if(profileError||!profile||!['admin','staff'].includes(profile.account_type))redirect('/account');
 const {data:assurance,error:assuranceError}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
 if(assuranceError||assurance?.currentLevel!=='aal2')redirect('/account/security?next=%2Fadmin%2Fintakes');

 const [{data:patientRows,error:patientError},{data:kioskRows,error:kioskError}]=await Promise.all([
  supabase.from('patient_intakes').select('*').eq('status','submitted').order('submitted_at',{ascending:false}).limit(100),
  supabase.rpc('list_submitted_kiosk_intakes')
 ]);
 const registered=((patientRows??[]) as IntakeRecord[]).map(r=>({
  id:r.patient_id,name:r.answers.full_name||'Patient questionnaire',when:r.submitted_at,source:'Patient account',answers:r.answers
 }));
 const kiosks=((kioskRows??[]) as KioskRecord[]).map(r=>({
  id:r.id,name:r.patient_name,when:r.submitted_at,source:'Office iPad / kiosk',answers:r.answers
 }));
 const records=[...registered,...kiosks].sort((a,b)=>Date.parse(b.when||'')-Date.parse(a.when||''));

 return <main className="authPage intakePage"><Link href="/account">← Account</Link>
  <h1>Submitted patient questionnaires and signed documents</h1>
  <p>Available only to verified office staff and administrators with second-factor sign-in. The latest 100 submitted questionnaires from each source are displayed; drafts are not shown.</p>
  <p>Submitted packets retain their chosen responses, typed signatures, dates and document revision. Current legal document revision: {LEGAL_PACKET_VERSION}. For a signed-record copy, use your browser’s Print / Save as PDF while the selected packet is expanded, and protect any downloaded PHI.</p>
  {(patientError||kioskError)&&<p role="alert" className="calendarError">Some questionnaires could not be loaded. {patientError?'Patient-account review unavailable. ':''}{kioskError?'Office iPad review unavailable.':''}</p>}
  {!records.length?<p>No submitted questionnaires are available.</p>:records.map(r=><SubmittedPacket key={r.source+r.id} record={r}/>)}
 </main>;
}
