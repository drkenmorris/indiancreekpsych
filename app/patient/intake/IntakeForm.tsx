'use client';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {costFields,intakeSections,IntakeAnswers,IntakeRecord,validateIntake} from '@/lib/patient/intake';
export default function IntakeForm({userId,initial,defaults}:{userId:string;initial:IntakeRecord|null;defaults:IntakeAnswers}){
 const supabase=useMemo(()=>createClient(),[]);
 const [record,setRecord]=useState(initial),[answers,setAnswers]=useState<IntakeAnswers>(initial?.answers??defaults);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[confirm,setConfirm]=useState(false),[dirty,setDirty]=useState(false);
 const submitted=record?.status==='submitted';
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const update=(key:string,value:string)=>{setAnswers(a=>({...a,[key]:value}));setDirty(true);setConfirm(false);setMessage('');};
 async function save(submit:boolean){
  if(busy||submitted)return;setError('');const invalid=validateIntake(answers,submit);if(invalid){setError(invalid);return;}
  setBusy(true);
  try{
   const payload={answers,status:submit?'submitted':'draft'};
   const q=record?supabase.from('patient_intakes').update(payload).eq('patient_id',userId).eq('version',record.version):supabase.from('patient_intakes').insert({patient_id:userId,...payload});
   const {data,error:saveError}=await q.select().abortSignal(AbortSignal.timeout(20000)).single();
   if(saveError||!data)throw new Error('Your save could not be confirmed. Keep this page open and check your account in another tab before retrying. A newer version may already be saved.');
   setRecord(data);setDirty(false);setMessage(submit?'Your questionnaire has been submitted to the practice.':'Draft saved securely.');setConfirm(false);
  }catch(e){setError(e instanceof Error?e.message:'Unable to save. Your answers remain on this page.');}finally{setBusy(false);}
 }
 function submit(e:FormEvent){e.preventDefault();const invalid=validateIntake(answers,true);if(invalid){setError(invalid);return;}setError('');setConfirm(true);}
 return <form onSubmit={submit} className="authForm" autoComplete="off">
 {submitted&&<p role="status">Submitted on {new Date(record.submitted_at!).toLocaleDateString()}. Contact the practice if any information needs correction.</p>}
 {intakeSections.map((section,index)=><fieldset disabled={busy||submitted} key={section.title} className="appointmentPanel" aria-labelledby={`intake-section-${index}`}><h2 id={`intake-section-${index}`}>{section.title}</h2>
 {section.title==='Insurance information'&&<p>Enter the information shown on your card or benefits statement. Amounts are patient-reported estimates, not a guarantee of coverage. Choose “I don’t know” when unsure. Leave insurance fields blank if you are self-pay.</p>}
 <div className="intakeFields">{section.fields.map(field=>{
  const [key,label,type]=field;const required=field.length>3&&field[3];const options=(field.length>4?field[4]:[])??[];const cost=costFields.includes(key);
  return <div key={key} className={type==='textarea'?'intakeWide':''}><label>{label}{required?' *':''}
   {type==='select'?<select value={answers[key]??''} onChange={e=>update(key,e.target.value)}><option value="">Select…</option>{options.map(o=><option key={o} value={o}>{o==='insured'?'I have insurance':o==='self-pay'?'Self-pay / no insurance':o==='unsure'?'I’m not sure':o}</option>)}</select>
   :type==='textarea'?<textarea rows={5} maxLength={8000} value={answers[key]??''} onChange={e=>update(key,e.target.value)}/>
   :<input type={type} maxLength={8000} value={answers[key]??''} inputMode={cost?'decimal':undefined} disabled={cost&&answers[key]==='I don’t know'} onChange={e=>update(key,e.target.value)}/>}
  </label>{cost&&<label className="checkRow"><input type="checkbox" checked={answers[key]==='I don’t know'} onChange={e=>update(key,e.target.checked?'I don’t know':'')}/> I don’t know</label>}</div>;
 })}</div></fieldset>)}
 {!submitted&&<><p>* Required to submit. Drafts may be incomplete. {dirty?'You have unsaved changes.':''}</p><button type="button" disabled={busy} onClick={()=>void save(false)}>Save draft</button><button type="submit" disabled={busy}>Review and submit</button>
 {confirm&&<section className="appointmentPanel"><h2>Submit this questionnaire?</h2><p>Your answers will be available to authorized practice administrators. You can return to the form to make changes before submitting.</p><button type="button" disabled={busy} onClick={()=>void save(true)}>Confirm submission</button><button type="button" disabled={busy} onClick={()=>setConfirm(false)}>Keep editing</button></section>}</>}
 {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </form>;
}
