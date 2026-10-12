import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import IntakeForm from '@/app/patient/intake/IntakeForm';
import {intakeSections} from '@/lib/patient/intake';

export const metadata={title:'Intake Field Test | Indian Creek Psychological Services'};
export default async function IntakePreviewPage(){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect('/login?next=/admin/intake-preview');
 const {data:profile}=await supabase.from('profiles').select('account_type').eq('id',user.id).maybeSingle();
 if(!profile||!['admin','staff'].includes(profile.account_type))redirect('/account');
 return <main className="authPage intakePage">
  <Link href="/account">← Account</Link>
  <h1>Questionnaire input test</h1>
  <p>Staff-only editable preview of the patient questionnaire: {intakeSections.length} sections and {intakeSections.reduce((total,section)=>total+section.fields.length,0)} fields.</p>
  <p><strong>Use fictional information only.</strong> Nothing typed here is sent to Supabase, saved or treated as a clinical record. This page is designed to check whether text boxes, selections and navigation respond on your device.</p>
  <p><Link href="/admin/intake-kiosk">Launch a secure office intake to test real saving</Link> · <Link href="/admin/test-accounts">Manage synthetic test accounts</Link> · <Link href="/admin/intakes">Review completed patient questionnaires</Link></p>
  <IntakeForm userId="" initial={null} defaults={{}} preview/>
 </main>;
}
