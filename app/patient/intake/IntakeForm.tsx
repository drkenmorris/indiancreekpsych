'use client';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {costFields,intakeSections,IntakeAnswers,IntakeRecord,validateIntake} from '@/lib/patient/intake';

export default function IntakeForm({userId,initial,defaults}:{userId:string;initial:IntakeRecord|null;defaults:IntakeAnswers}){
 const supabase=useMemo(()=>createClient(),[]);
 const [record,setRecord]=useState(initial),[answers,setAnswers]=useState<IntakeAnswers>(initial?.answers??defaults);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[confirm,setConfirm]=useState(false),[dirty,setDirty]=useState(false);
 const [sectionIndex,setSectionIndex]=useState(0);
 const submitted=record?.status==='submitted';
 const section=intakeSections[sectionIndex];

 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 useEffect(()=>{window.scrollTo({top:0,behavior:'smooth'});},[sectionIndex]);

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
 const next=()=>{setError('');setMessage('');setSectionIndex(i=>Math.min(i+1,intakeSections.length-1));};
 const previous=()=>{setError('');setMessage('');setSectionIndex(i=>Math.max(i-1,0));};

 return <form onSubmit={submit} className="authForm intakeWizard" autoComplete="off">
  <section className="intakeProgress" aria-label="Questionnaire progress">
   <div><strong>Section {sectionIndex+1} of {intakeSections.length}</strong><span>{Math.round(((sectionIndex+1)/intakeSections.length)*100)}% complete</span></div>
   <progress max={intakeSections.length} value={sectionIndex+1}/>
   <div className="intakeSectionTabs" role="tablist" aria-label="Intake sections">
    {intakeSections.map((item,index)=><button key={item.title} type="button" role="tab" aria-selected={index===sectionIndex} disabled={busy} onClick={()=>setSectionIndex(index)}>{index+1}</button>)}
   </div>
  </section>

  {submitted&&<p role="status">Submitted on {new Date(record.submitted_at!).toLocaleDateString()}. Contact the practice if any information needs correction.</p>}

  <fieldset disabled={busy||submitted} className="appointmentPanel intakeSectionCard" aria-labelledby="intake-current-section">
   <p className="eyebrow">Patient intake</p>
   <h2 id="intake-current-section">{section.title}</h2>
   {section.description&&<p className="intakeSectionDescription">{section.description}</p>}
   {section.title==='Insurance and benefits information'&&<p className="intakeHelp">Enter the information shown on your card or benefits statement. Amounts are patient-reported estimates, not a guarantee of coverage. Choose “I don’t know” when unsure. Leave insurance fields blank if you are self-pay.</p>}
   {section.title==='Safety and risk screening'&&<p className="intakeUrgentNotice"><strong>Urgent safety notice:</strong> This form is not continuously monitored. If you are in immediate danger or believe you may act on thoughts of harming yourself or someone else, contact emergency services or seek immediate crisis assistance.</p>}
   {section.title==='Authorization to share health information'&&<p className="intakeHelp">This optional authorization covers the information you specifically describe below. It does not include separately maintained psychotherapy notes. You may leave this authorization as “No” and still receive care.</p>}
   {section.title==='Separate authorization for psychotherapy notes'&&<p className="intakeHelp">This optional authorization is intentionally separate from the general release because psychotherapy notes receive additional privacy protection.</p>}

   <div className="intakeFields">{section.fields.map(field=>{
    const [key,label,type]=field;const required=field.length>3&&field[3];const options=(field.length>4?field[4]:[])??[];const cost=costFields.includes(key);
    return <div key={key} className={type==='textarea'?'intakeWide':''}><label>{label}{required?' *':''}
     {type==='select'?<select value={answers[key]??''} onChange={e=>update(key,e.target.value)}><option value="">Select…</option>{options.map(o=><option key={o} value={o}>{o==='insured'?'I have insurance':o==='self-pay'?'Self-pay / no insurance':o==='unsure'?'I’m not sure':o}</option>)}</select>
     :type==='textarea'?<textarea rows={5} maxLength={8000} value={answers[key]??''} onChange={e=>update(key,e.target.value)}/>
     :<input type={type} maxLength={8000} value={answers[key]??''} inputMode={cost?'decimal':undefined} disabled={cost&&answers[key]==='I don’t know'} onChange={e=>update(key,e.target.value)}/>}
    </label>{cost&&<label className="checkRow"><input type="checkbox" checked={answers[key]==='I don’t know'} onChange={e=>update(key,e.target.checked?'I don’t know':'')}/> I don’t know</label>}</div>;
   })}</div>
  </fieldset>

  {!submitted&&<section className="intakeWizardActions">
   <p>* Required to submit. Drafts may be incomplete. {dirty?'You have unsaved changes.':''}</p>
   <div className="intakeActionRow">
    <button className="secondaryAction" type="button" disabled={busy||sectionIndex===0} onClick={previous}>← Previous</button>
    <button className="secondaryAction" type="button" disabled={busy} onClick={()=>void save(false)}>Save draft</button>
    {sectionIndex<intakeSections.length-1
      ?<button type="button" disabled={busy} onClick={next}>Next →</button>
      :<button type="submit" disabled={busy}>Review and submit</button>}
   </div>
  </section>}

  {confirm&&<section className="appointmentPanel intakeConfirm"><h2>Submit this questionnaire?</h2><p>Your answers and signed acknowledgments will be available to authorized practice personnel. Review any section using the numbered buttons above before submitting.</p><button type="button" disabled={busy} onClick={()=>void save(true)}>Confirm submission</button><button type="button" disabled={busy} onClick={()=>setConfirm(false)}>Keep editing</button></section>}
  {message&&<p className="authMessage" role="status">{message}</p>}{error&&<p className="calendarError" role="alert">{error}</p>}
 </form>;
}
