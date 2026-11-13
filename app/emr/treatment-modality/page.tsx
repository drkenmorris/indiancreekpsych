import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { modalityAccess } from '@/lib/emr/modality-access';
import { uuid } from '@/lib/emr/demographics';
import ApproachChecklist from '../treatment-approach/ApproachChecklist';
import ModalityTable from './ModalityTable';
import '../treatment-planner.css';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ patient?: string; embedded?: string; section?: string }> }) {
 const { patient, embedded, section } = await searchParams;
 const patientId = uuid(patient) ? patient : null;
 const query = new URLSearchParams();
 if (patientId) query.set('patient', patientId);
 if (embedded === '1') query.set('embedded', '1');
 const approach = section === 'approach';
 if (approach) query.set('section', 'approach');
 const next = '/emr/treatment-modality' + (query.size ? '?' + query : '');

 const ctx = await modalityAccess();
 if (!ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=' + encodeURIComponent(next));
  const { data: profile } = await supabase.from('profiles').select('account_type').eq('id', user.id).maybeSingle();
  if (profile?.account_type !== 'admin' && profile?.account_type !== 'staff') redirect('/account');
  redirect('/account/security?next=' + encodeURIComponent(next));
 }

 if (patientId) return <main className="treatmentWorkspace treatmentEmbedded">
  {embedded !== '1' && <Link href="/emr/treatment-modality">Assigned patient charts</Link>}
  {embedded !== '1' && <nav aria-label="Treatment plan options"><Link href={'/emr/treatment-modality?patient=' + patientId + (approach ? '' : '&section=approach')}>{approach ? 'Modality' : 'Approach'}</Link></nav>}
  {approach ? <ApproachChecklist key={patientId} patientId={patientId} /> : <ModalityTable key={patientId} patientId={patientId} />}
 </main>;

 const charts = await ctx.supabase.rpc('emr_modality_assigned_charts');
 return <main className="treatmentWorkspace">
  <h1>Treatment Plan Modality</h1>
  <h2>Assigned patient charts</h2>
  {charts.error ? <p role="status">Assigned charts could not be loaded.</p> :
   charts.data?.length ? <ul>{charts.data.map((chart: { id: string; name: string }) =>
    <li key={chart.id}><Link href={'/emr/treatment-modality?patient=' + chart.id}>{chart.name}</Link></li>)}</ul> :
    <p>No patients are assigned to you for Modality.</p>}
  {ctx.admin && <Link href="/emr/workspace?module=plan&section=plan%3Amodality">Open Modality in the EMR</Link>}
 </main>;
}
