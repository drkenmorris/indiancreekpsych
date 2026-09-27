import Link from 'next/link';
import {patientAccess} from '@/lib/patient/access';
import {intakeSections,IntakeRecord} from '@/lib/patient/intake';
export default async function IntakeReviewPage(){
 const {supabase}=await patientAccess(true);
 const {data,error}=await supabase.from('patient_intakes').select('*').eq('status','submitted').order('submitted_at',{ascending:false}).limit(100);
 return <main className="authPage intakePage"><Link href="/account">← Account</Link><h1>Submitted patient questionnaires</h1><p>The most recent 100 submissions are shown. Draft questionnaires are not listed.</p>
 {error?<p role="alert">Questionnaires could not be loaded.</p>:!data?.length?<p>No questionnaires have been submitted.</p>:(data as IntakeRecord[]).map(r=><details key={r.patient_id} className="appointmentPanel"><summary>{r.answers.full_name} — {new Date(r.submitted_at!).toLocaleDateString()}</summary>{intakeSections.map(s=><section key={s.title}><h2>{s.title}</h2><dl>{s.fields.map(([key,label])=><div key={key}><dt><strong>{label}</strong></dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{r.answers[key]||'Not provided'}</dd></div>)}</dl></section>)}</details>)}</main>;
}
