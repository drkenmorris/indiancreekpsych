import Link from 'next/link';
import {notFound} from 'next/navigation';
import {patientAccess} from '@/lib/patient/access';
import {uuid} from '@/lib/emr/demographics';
import {assignedTestOptions} from '@/lib/clinical-tests/assignments';
import {isConnectedKey} from '@/lib/clinical-tests/connected/definition';

export default async function AssignedAssessments({searchParams}:{searchParams:Promise<{patient?:string}>}){
 const {patient}=await searchParams;
 if(!uuid(patient))notFound();
 const {supabase,user}=await patientAccess(true,'/admin/assign-test/completed?patient='+patient);
 const {data:chart,error:chartError}=await supabase.from('clinical_patients').select('id').eq('id',patient).is('directory_deleted_at',null).maybeSingle();
 if(chartError||!chart)notFound();
 const {data:assignments,error}=await supabase.from('psych_test_assignments')
  .select('id,test_key,status,created_at,expires_at,invitation_removed_at').eq('patient_id',patient)
  .eq('assigned_by',user.id).order('created_at',{ascending:false});
 if(error)throw Error('Assessment history unavailable.');
 const results=await Promise.all((assignments??[]).map(async assignment=>{
  const kind=isConnectedKey(assignment.test_key)?'connected':assignment.test_key==='asq'?'asq':assignment.test_key==='dsm'?'dsm':null;
  if(!kind)return null;
  const table=kind==='connected'?'connected_assignment_responses':kind==='asq'?'asq_assignment_responses':'dsm_assignment_responses';
  const {data:response,error}=await supabase.from(table).select('status,submitted_at').eq('assignment_id',assignment.id).maybeSingle();
  if(error)throw Error('Questionnaire responses unavailable.');
  if(response?.status!=='submitted'&&assignment.invitation_removed_at)return null;
  return {...assignment,kind,response};
 }));
 const visible=results.filter(item=>item!==null);
 return <main className="authPage">
  <p><Link href={'/emr?patient='+patient+'&module=assessment&section=assessment:assigned_assessments'}>← Patient EMR</Link> · <Link href={'/admin/assign-test?patient='+patient}>Assign a questionnaire</Link></p>
  <h1>Assigned/Completed Assessments</h1>
  {visible.length===0?<p>No assessments are available for this patient.</p>:<ul>{visible.map(item=><li key={item.id}>
   <strong>{assignedTestOptions.find(test=>test.value===item.test_key)?.label??item.test_key}</strong>
   {' · '}{item.response?.status==='submitted'?<>Completed {item.response.submitted_at&&new Date(item.response.submitted_at).toLocaleDateString('en-US',{timeZone:'America/Chicago'})}{' · '}<Link href={'/admin/assign-test/'+item.kind+'-responses/'+item.id}>View responses and results</Link></>:item.status==='draft'?'Draft':Date.parse(item.expires_at)<=Date.now()?'Expired':'Awaiting completion'}
  </li>)}</ul>}
 </main>;
}
