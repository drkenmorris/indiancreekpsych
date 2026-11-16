import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { modalityAccess } from '@/lib/emr/modality-access';
import { uuid } from '@/lib/emr/demographics';
import ResponseForm from './ResponseForm';
import '../treatment-planner.css';
import './response.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{patient?:string;embedded?:string}>}) {
 const {patient,embedded}=await searchParams;
 const patientId=uuid(patient)?patient:null;
 const query=new URLSearchParams();
 if(patientId)query.set('patient',patientId);
 if(embedded==='1')query.set('embedded','1');
 const next='/emr/treatment-response'+(query.size?'?'+query:'');
 const ctx = await modalityAccess();
 if (!ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=' + encodeURIComponent(next));
  const { data: profile } = await supabase.from('profiles').select('account_type').eq('id', user.id).maybeSingle();
  if (profile?.account_type !== 'admin' && profile?.account_type !== 'staff') redirect('/account');
  redirect('/account/security?next=' + encodeURIComponent(next));
 }

 return <main className="treatmentWorkspace treatmentEmbedded">
  {embedded!=='1'&&<Link href="/emr">EMR workspace</Link>}
  {patientId?<ResponseForm key={patientId} patientId={patientId}/>:<><h1>Treatment Plan Response</h1><p>Select a patient in the EMR to record treatment plan approval and responses.</p></>}
 </main>;
}
