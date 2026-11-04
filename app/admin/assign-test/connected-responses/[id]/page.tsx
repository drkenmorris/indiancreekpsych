import Link from 'next/link';
import {notFound} from 'next/navigation';
import {patientAccess} from '@/lib/patient/access';
import {uuid} from '@/lib/emr/demographics';
import {checkedSource} from '@/lib/clinical-tests/connected/source';
import {buildClinicalReport} from '@/lib/clinical-tests/connected/report';
import type {Answers} from '@/lib/clinical-tests/connected/definition';
import ClinicalReport from '@/app/components/connected/ClinicalReport';
export const dynamic='force-dynamic';
export default async function ConnectedResponsePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!uuid(id))notFound();const {supabase,user}=await patientAccess(true,'/admin/assign-test/connected-responses/'+id);
 const {data:a,error}=await supabase.from('psych_test_assignments').select('id,assigned_by,patient_id,recipient_first_name,recipient_last_name,connected_source,connected_source_hash').eq('id',id).eq('assigned_by',user.id).maybeSingle();
 if(error||!a)notFound();
 const {data:r,error:responseError}=await supabase.from('connected_assignment_responses').select('answers,page,revision,status,answered_count,submitted_at').eq('assignment_id',id).maybeSingle();
 if(responseError)return <main><h1>Responses unavailable</h1><p>Could not load the saved record. Retry before interpreting results.</p></main>;
 let d;try{d=checkedSource(a.connected_source,a.connected_source_hash);}catch(e){return <main><h1>Source review required</h1><p>{e instanceof Error?e.message:'Questionnaire source unavailable.'}</p></main>;}
 if(!r||r.status!=='submitted')return <main className="asqRecipient"><Link href="/admin/assign-test">← Assignments</Link><h1>{d.title} — Recorded progress</h1><p>{r?.answered_count??0} of {d.items.length} responses saved. The questionnaire has not been submitted; no clinical scores are calculated from partial responses.</p>{r&&d.items.filter(i=>(r.answers as Answers)[i.id]!==undefined).map(i=><section key={i.id}><h2>{i.text}</h2><p>{i.options.find(o=>o.value===(r.answers as Answers)[i.id])?.label}</p></section>)}</main>;
 const report=buildClinicalReport(d,r.answers as Answers);
 return <main><p className="reportBackLink"><Link href="/admin/assign-test">← Assignments</Link> · <Link href={'/emr?patient='+a.patient_id}>Central patient record</Link></p><ClinicalReport report={report} definition={d} answers={r.answers as Answers} recipient={a.recipient_first_name+' '+a.recipient_last_name} assignmentId={id} patientId={a.patient_id} submittedAt={r.submitted_at} sourceHash={a.connected_source_hash} revision={r.revision}/></main>;
}
