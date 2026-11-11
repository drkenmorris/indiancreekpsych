import {NextResponse} from 'next/server';
import {emrAccess,privateHeaders,sameOrigin} from '@/lib/emr/access';
import {demographics,uuid} from '@/lib/emr/demographics';
export const dynamic='force-dynamic';
export async function GET(request:Request){const ctx=await emrAccess();if(!ctx)return NextResponse.json({error:'Administrator sign-in and MFA required.'},{status:403,headers:privateHeaders});const params=new URL(request.url).searchParams;const id=params.get('id');if(id&&!uuid(id))return NextResponse.json({error:'Invalid patient ID.'},{status:400,headers:privateHeaders});let query=ctx.supabase.from('clinical_patients').select('id,account_id,demographics,revision,created_at,updated_at,directory_deleted_at,profiles!clinical_patients_account_id_fkey(full_name)').order('updated_at',{ascending:false}).limit(200);if(id)query=query.eq('id',id);if(id||params.get('directory')!=='1')query=query.is('directory_deleted_at',null);const {data,error}=await query;if(error)return NextResponse.json({error:'Patient repository unavailable.'},{status:503,headers:privateHeaders});if(id&&!data?.length)return NextResponse.json({error:'Patient unavailable.'},{status:404,headers:privateHeaders});let intake=null;if(id&&data?.[0]?.account_id){const result=await ctx.supabase.from('patient_intakes').select('answers,status,version,updated_at').eq('patient_id',data[0].account_id).maybeSingle();if(result.error)return NextResponse.json({error:'Intake source unavailable.'},{status:503,headers:privateHeaders});intake=result.data?{status:result.data.status,updated_at:result.data.updated_at,answers:Object.fromEntries(Object.entries(result.data.answers??{}).filter(([key])=>['full_name','preferred_name','date_of_birth','address','address2','city','state','postal_code','phone','email','medication_entries','medication_allergy_status','medication_allergy_notes','medical_substance_history','treatment_history_entries','trauma_history_checklist','trauma_history'].includes(key)))}:null;}return NextResponse.json({patients:data??[],intake},{headers:privateHeaders});}
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
