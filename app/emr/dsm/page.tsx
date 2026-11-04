import AdministrativeShell from '@/app/components/AdministrativeShell';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {patientAccess} from '@/lib/patient/access';
import {uuid} from '@/lib/emr/demographics';
import {dsmVersionLabel} from '@/lib/clinical-tests/dsm/entry-choice';
import '@/app/components/asq/asq-recipient.css';
export const dynamic='force-dynamic';
const date=(v:string)=>new Date(v).toLocaleString('en-US',{timeZone:'America/Chicago'});
export default async function PatientDsm({searchParams}:{searchParams:Promise<{patient?:string}>}){
 const {patient}=await searchParams;if(!uuid(patient))notFound();
 const {supabase,user}=await patientAccess(true,'/emr');
 const {data:assignments,error}=await supabase.from('psych_test_assignments').select('id,recipient_first_name,recipient_last_name,dsm_version,dsm_source_hash,status,created_at').eq('patient_id',patient).eq('assigned_by',user.id).eq('test_key','dsm').order('created_at',{ascending:false});
 if(error)throw Error('DSM administrations unavailable.');
 const ids=(assignments??[]).map(a=>a.id);
 const {data:responses,error:responseError}=ids.length?await supabase.from('dsm_assignment_responses').select('assignment_id,status,revision,answered_count,submitted_at,updated_at').in('assignment_id',ids):{data:[],error:null};
 const {data:records,error:recordError}=await supabase.from('dsm_records').select('id,label,revision,source_assignment_id,created_at,updated_at').eq('patient_id',patient).eq('owner_id',user.id).order('created_at',{ascending:false});
 if(responseError||recordError)throw Error('Saved DSM history could not be loaded. Please retry.');
 return <AdministrativeShell><main className="asqAssignmentReview"><h1>Patient DSM administrations and results</h1><nav><Link href={'/emr?patient='+patient}>Central patient record</Link> · <Link href={'/admin/assign-test?test=dsm&patient='+patient}>Assign another DSM questionnaire</Link></nav><p>Each administration is retained separately. Open its original responses or its clinician evaluation. Dates are shown in Central time. Starting another administration does not replace prior results.</p>
 <h2>Questionnaire administrations</h2>{assignments?.length?<ol>{assignments.map(a=>{const r=responses?.find(r=>r.assignment_id===a.id),record=records?.find(r=>r.source_assignment_id===a.id);return <li key={a.id}><h3>{dsmVersionLabel(a.dsm_version)} · Assigned {date(a.created_at)}</h3><p>{a.recipient_first_name} {a.recipient_last_name} · {r?.status==='submitted'?'Submitted '+date(r.submitted_at):r?'In progress':a.status==='draft'?'Invitation draft':'Awaiting response'}{r?` · ${r.answered_count} recorded answers · response revision ${r.revision}`:''}</p>{a.dsm_source_hash&&<Link href={'/admin/assign-test/dsm-responses/'+a.id}>Open this administration’s responses / evaluation</Link>}{record&&<p><Link href={'/clinical-tests/dev/summary?record='+record.id}>Open saved clinician evaluation — revision {record.revision}</Link> · <Link href={'/clinical-tests/dev/summary?record='+record.id+'&revision=1'}>Original imported evaluation</Link></p>}</li>})}</ol>:<p>No DSM recipient administrations for this patient under your account.</p>}
 <h2>Clinician assessment records</h2><p>Each record includes its saved revision history. Earlier revisions open read-only.</p>{records?.length?<ul>{records.map(r=><li key={r.id}><Link href={'/clinical-tests/dev/summary?record='+r.id}>{r.label} — saved revision {r.revision}</Link> · Created {date(r.created_at)} · Updated {date(r.updated_at)}</li>)}</ul>:<p>No saved clinician evaluation records under your account.</p>}</main></AdministrativeShell>;
}
