import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {demographics,uuid} from '@/lib/emr/demographics';
import {recognizedBpsQuestionnaireVersion,validBpsSubmissionChronology} from '@/lib/emr/intake-bps';
export const dynamic='force-dynamic';
/** Read-only directory intake context is separate from the reviewed BPS snapshot.
 * Database filters alone are not a provenance receipt: verify each returned row
 * before releasing patient-submitted clinical source answers.
 */
const directoryIntakeKeys = new Set([
  'full_name','preferred_name','date_of_birth','address','address2','city','state',
  'postal_code','phone','email','medication_entries','medication_allergy_status',
  'medication_allergy_notes','medical_substance_history','treatment_history_entries',
  'trauma_history_checklist','trauma_history',
]);
const directoryReply = (data:unknown,status=200) =>
  NextResponse.json(data,{status,headers:privateHeaders});

export async function GET(request:Request){
  const ctx=await emrAccess();
  if(!ctx)return directoryReply({error:'Administrator sign-in and MFA required.'},403);
  const params=new URL(request.url).searchParams;
  const id=params.get('id');
  if(id&&!uuid(id))return directoryReply({error:'Invalid patient ID.'},400);
  let query=ctx.supabase.from('clinical_patients')
    .select('id,account_id,demographics,revision,created_at,updated_at,directory_deleted_at,profiles!clinical_patients_account_id_fkey(full_name)')
    .order('updated_at',{ascending:false}).limit(200);
  if(id)query=query.eq('id',id);
  if(id||params.get('directory')!=='1')query=query.is('directory_deleted_at',null);
  const {data,error}=await query;
  if(error||!Array.isArray(data))return directoryReply({error:'Patient repository unavailable.'},503);
  if(id&&data.length===0)return directoryReply({error:'Patient unavailable.'},404);
  // Even an incorrectly scoped/stale backend adapter may not substitute a
  // different chart, reveal multiple charts, or resurrect an archived chart.
  if(id&&(data.length!==1||data[0]?.id!==id||data[0].directory_deleted_at!==null))
    return directoryReply({error:'Central patient identity or chart status could not be verified.'},409);
  let intake=null;
  if(id&&data[0].account_id!=null){
    const accountId=data[0].account_id;
    if(!uuid(accountId))
      return directoryReply({error:'Central patient account linkage is invalid.'},409);
    const result=await ctx.supabase.from('patient_intakes')
      .select('patient_id,answers,status,version,updated_at,submitted_at')
      .eq('patient_id',accountId).maybeSingle();
    if(result.error)return directoryReply({error:'Intake source unavailable.'},503);
    if(result.data){
      const row=result.data;
      // A successful .eq() is not proof that the returned record belongs to
      // this chart. Withhold all intake answers on ambiguous provenance.
      if(row.patient_id!==accountId||!['draft','submitted'].includes(row.status)||
         !Number.isSafeInteger(row.version)||row.version<1||
         !validBpsSubmissionChronology(row.status,row.updated_at,row.submitted_at)||
         !row.answers||typeof row.answers!=='object'||Array.isArray(row.answers)||
         Object.values(row.answers).some(value=>typeof value!=='string')||
         !recognizedBpsQuestionnaireVersion(row.answers.legal_packet_version)){
        return directoryReply({error:'Linked intake provenance or answer format could not be verified.'},409);
      }
      // Preserve source revision and patient submission receipt separately from
      // clinician attestation. A status flag without verified chronology is insufficient.
      intake={status:row.status,version:row.version,updated_at:row.updated_at,
        submitted_at:row.submitted_at??null,
        questionnaire_packet_version:row.answers.legal_packet_version??null,
        answers:Object.fromEntries(Object.entries(row.answers)
          .filter(([key])=>directoryIntakeKeys.has(key)))};
      // A patient may edit or resubmit the 21-section intake while the directory
      // source is being assembled. Re-read the source before releasing any answers:
      // the initial receipt alone cannot attest to unchanged clinical text.
      // Compare the complete answer packet, including hidden legal/version fields,
      // not only the allowlisted fields displayed by this directory.
      const currentSource=await ctx.supabase.from('patient_intakes')
        .select('patient_id,answers,status,version,updated_at,submitted_at')
        .eq('patient_id',accountId).maybeSingle();
      const current=currentSource.data;
      const originalAnswers=row.answers as Record<string,string>;
      const currentAnswers=current?.answers;
      if(currentSource.error||!current||current.patient_id!==accountId||
         current.status!==row.status||current.version!==row.version||
         current.updated_at!==row.updated_at||current.submitted_at!==row.submitted_at||
         !currentAnswers||typeof currentAnswers!=='object'||Array.isArray(currentAnswers)||
         Object.keys(currentAnswers).length!==Object.keys(originalAnswers).length||
         Object.entries(originalAnswers).some(([key,value])=>
           !Object.prototype.hasOwnProperty.call(currentAnswers,key)||
           currentAnswers[key]!==value))
        return directoryReply({error:'Linked intake changed during clinical source retrieval; reopen the chart.'},409);
      // A chart can be archived or linked to another website account while the
      // intake query is in flight. Recheck its identity, revision and live status
      // immediately before disclosing the earlier account's clinical statements.
      // Source validation alone does not protect against a concurrent chart relink.
      const verified=await ctx.supabase.from('clinical_patients')
        .select('id,account_id,revision,directory_deleted_at')
        .eq('id',id).maybeSingle();
      if(verified.error||!verified.data||verified.data.id!==id||
         verified.data.account_id!==accountId||
         verified.data.revision!==data[0].revision||
         verified.data.directory_deleted_at!==null)
        return directoryReply({error:'Central chart linkage or status changed during intake retrieval; reopen the chart.'},409);
    }
  }
  return directoryReply({patients:data,intake});
}
export async function POST(request:Request){const ctx=await emrAccess();if(!ctx)return NextResponse.json({error:'Administrator sign-in and MFA required.'},{status:403,headers:privateHeaders});if(!sameOrigin(request))return NextResponse.json({error:'Same-origin request required.'},{status:403,headers:privateHeaders});try{const text=await request.text();if(text.length>30000)throw Error('Request too large.');const body=JSON.parse(text),values=demographics(body.demographics);if(body.id&&(!uuid(body.id)||!Number.isInteger(body.expectedRevision)||body.expectedRevision<1))throw Error('Invalid patient ID.');const query=body.id?ctx.supabase.from('clinical_patients').update({demographics:values}).eq('id',body.id).eq('revision',body.expectedRevision):ctx.supabase.from('clinical_patients').insert({demographics:values});const {data,error}=await query.select('id').single();if(error)return NextResponse.json({error:'Patient save was not confirmed.'},{status:409,headers:privateHeaders});return NextResponse.json({id:data.id,saved:true},{headers:privateHeaders});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid patient.'},{status:400,headers:privateHeaders});}}

export async function PATCH(request: Request) {
  const ctx = await emrAccess();
  const reply = (data: unknown, status = 200) =>
    NextResponse.json(data, { status, headers: privateHeaders });
  if (!ctx || !sameOrigin(request)) return reply({ error: 'Administrator MFA and same-origin request required.' }, 403);

  let input;
  try {
    input = await request.json();
  } catch {
    return reply({ error: 'Invalid patient directory request.' }, 400);
  }
  if (!input || !uuid(input.id) || !Number.isSafeInteger(input.expectedRevision) ||
      input.expectedRevision < 1 || !['delete', 'restore'].includes(input.action)) {
    return reply({ error: 'Invalid patient, revision, or directory action.' }, 400);
  }

  const deleting = input.action === 'delete';
  const query = ctx.supabase.from('clinical_patients')
    .update({ directory_deleted_at: deleting ? new Date().toISOString() : null })
    .eq('id', input.id).eq('revision', input.expectedRevision);
  const { data, error } = await (deleting
    ? query.is('directory_deleted_at', null)
    : query.not('directory_deleted_at', 'is', null)).select('id').maybeSingle();
  if (error) return reply({ error: 'Patient directory change was not confirmed.' }, 503);
  if (!data) return reply({ error: 'The patient changed. Reopen the directory and try again.' }, 409);
  return reply({ id: data.id, status: deleting ? 'deleted' : 'restored' });
}
