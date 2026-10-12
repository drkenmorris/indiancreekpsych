import Link from 'next/link';
import {patientAccess} from '@/lib/patient/access';
import IntakeForm from './IntakeForm';
export default async function IntakePage(){
 const {supabase,user,role}=await patientAccess();
 if(role==='admin')return <main className="authPage intakePage"><Link href="/account">← Account</Link><h1>Patient intake</h1><p>You are signed in as an administrator. Patient questionnaires can only be submitted through an eligible patient account or a new office kiosk session. Your administrator account cannot edit another patient's submitted answers.</p><p><Link href="/admin/intake-preview">Open the editable 21-section test questionnaire</Link></p><p><Link href="/admin/intake-kiosk">Start a real office/iPad intake</Link></p><p><Link href="/admin/intakes">Review submitted questionnaires</Link></p></main>;
 const [{data:record,error},{data:profile}]=await Promise.all([
  supabase.from('patient_intakes').select('*').eq('patient_id',user.id).maybeSingle(),
  supabase.from('profiles').select('full_name').eq('id',user.id).single()
 ]);
 return <main className="authPage intakePage"><Link href="/account">← Account</Link><h1>Patient intake questionnaire</h1><p>Please tell us about yourself, your insurance, and what brings you to counseling. You can save a draft and return later.</p>
 <p>This form is not monitored for urgent needs. If you are in immediate danger, contact emergency services.</p>
 {error?<p role="alert">Your questionnaire could not be loaded. Please reload before entering information.</p>:<IntakeForm userId={user.id} initial={record} defaults={{full_name:profile?.full_name??'',email:user.email??''}}/>}</main>;
}
