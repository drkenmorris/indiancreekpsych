'use client';

import {FormEvent,useEffect,useMemo,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {costFields,intakeSections,IntakeAnswers,validateIntake} from '@/lib/patient/intake';
import styles from './KioskIntake.module.css';

type KioskSession={
 patient_name:string;
 date_of_birth:string;
 answers:IntakeAnswers;
 status:'draft'|'submitted';
 expires_at:string;
};

function normalizeSession(data:unknown):KioskSession|null{
 const row=Array.isArray(data)?data[0]:data;
 if(!row||typeof row!=='object')return null;
 const value=row as Partial<KioskSession>;
 if(!value.status||!value.expires_at)return null;
 return {
  patient_name:value.patient_name??'',
  date_of_birth:value.date_of_birth??'',
  answers:(value.answers&&typeof value.answers==='object'?value.answers:{}) as IntakeAnswers,
  status:value.status,
  expires_at:value.expires_at
 };
}

function sameAnswers(a:IntakeAnswers,b:IntakeAnswers){
 return JSON.stringify(a)===JSON.stringify(b);
}

export default function KioskIntake({token}:{token:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const [answers,setAnswers]=useState<IntakeAnswers>({});
 const [sectionIndex,setSectionIndex]=useState(0);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [dirty,setDirty]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [confirm,setConfirm]=useState(false);
 const [complete,setComplete]=useState(false);
 const [invalid,setInvalid]=useState(false);
 const baseline=useRef<IntakeAnswers>({});
 const section=intakeSections[sectionIndex];

 useEffect(()=>{
  let active=true;
  (async()=>{
   const {data,error}=await supabase.rpc('get_intake_kiosk_session',{p_token:token});
   if(!active)return;
   const session=normalizeSession(data);
   if(error||!session){setInvalid(true);setLoading(false);return;}
   if(session.status==='submitted'){
    baseline.current={};setAnswers({});setComplete(true);setLoading(false);return;
   }
   const loaded={full_name:session.patient_name,date_of_birth:session.date_of_birth,...session.answers};
   baseline.current=loaded;setAnswers(loaded);setLoading(false);
  })();
  return()=>{active=false;};
 },[supabase,token]);

 useEffect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[dirty]);

 useEffect(()=>{window.scrollTo({top:0,behavior:'smooth'});},[sectionIndex]);

 const update=(key:string,value:string)=>{
  setAnswers(current=>({...current,[key]:value}));
  setDirty(true);setConfirm(false);setMessage('');setError('');
 };

 async function save(submit:boolean){
  if(busy||complete)return;
  setError('');setMessage('');
  const validation=validateIntake(answers,submit);
  if(validation){setError(validation);return;}
  setBusy(true);
  try{
   const latest=await supabase.rpc('get_intake_kiosk_session',{p_token:token});
   const remote=normalizeSession(latest.data);
   if(latest.error||!remote)throw new Error('This intake session is invalid or has expired. Please return the iPad to office personnel.');
   if(remote.status==='submitted'){
    baseline.current={};setAnswers({});setComplete(true);setDirty(false);return;
   }
   if(!sameAnswers(remote.answers,baseline.current)){
    throw new Error('A newer saved version of this intake was found. This page was not overwritten. Reload the page to continue from the newest saved version.');
   }
   const result=await supabase.rpc('save_intake_kiosk_session',{p_token:token,p_answers:answers,p_submit:submit});
   if(result.error)throw new Error(result.error.message||'The save could not be confirmed.');
   if(submit){
    baseline.current={};setAnswers({});setDirty(false);setConfirm(false);setComplete(true);
    window.history.replaceState(null,'',window.location.pathname+'?complete=1');
   }else{
    baseline.current={...answers};setDirty(false);setMessage('Progress saved securely.');
   }
  }catch(e){
   setError(e instanceof Error?e.message:'The save could not be confirmed. Your answers remain on this device.');
  }finally{setBusy(false);}
 }

 function requestSubmit(e:FormEvent){
  e.preventDefault();
  const validation=validateIntake(answers,true);
  if(validation){setError(validation);return;}
  setError('');setConfirm(true);
 }

 if(loading)return <main className={styles.page}><section className={styles.statusCard} aria-live="polite"><h1>Initial Intake Questionnaire</h1><p>Loading your secure intake session…</p></section></main>;
 if(invalid)return <main className={styles.page}><section className={styles.statusCard}><p className={styles.eyebrow}>Indian Creek Psychological Services</p><h1>Intake session unavailable</h1><p role="alert">This link is invalid, expired, or could not be loaded. Please return the iPad to office personnel so a new intake session can be prepared.</p></section></main>;
 if(complete)return <main className={styles.page}><section className={styles.completeCard}><p className={styles.eyebrow}>Indian Creek Psychological Services</p><h1>Thank you.</h1><p>Your intake questionnaire has been submitted. Please return the iPad to office personnel.</p><p className={styles.privacyNote}>For your privacy, completed answers are no longer displayed on this screen.</p></section></main>;

 return <main className={styles.page}>
  <form className={styles.shell} onSubmit={requestSubmit} autoComplete="off">
   <header className={styles.header}>
    <p className={styles.eyebrow}>Indian Creek Psychological Services</p>
    <h1>Initial Intake Questionnaire</h1>
    <div className={styles.progressCopy}><strong>Section {sectionIndex+1} of {intakeSections.length}</strong><span>{section.title}</span></div>
    <progress aria-label="Questionnaire progress" max={intakeSections.length} value={sectionIndex+1}/>
    <nav className={styles.sectionNav} aria-label="Questionnaire sections">
     {intakeSections.map((item,index)=><button key={item.title} type="button" aria-current={index===sectionIndex?'step':undefined} aria-label={'Section '+(index+1)+': '+item.title} disabled={busy} onClick={()=>setSectionIndex(index)}>{index+1}</button>)}
    </nav>
   </header>

   <section className={styles.card} aria-labelledby="kiosk-current-section">
    <h2 id="kiosk-current-section">{section.title}</h2>
    {section.description&&<p className={styles.description}>{section.description}</p>}
    {section.title==='Insurance and benefits information'&&<p className={styles.notice}>Enter the information shown on your card or benefits statement. Amounts are patient-reported estimates and are not a guarantee of coverage.</p>}
    {section.title==='Safety and risk screening'&&<p className={styles.urgent}><strong>Urgent safety notice:</strong> This form is not continuously monitored. For immediate safety needs, contact emergency services or seek immediate crisis assistance.</p>}
    {section.title==='Authorization to share health information'&&<p className={styles.notice}>This optional authorization does not include psychotherapy notes. You may choose “No” and still receive care.</p>}
    {section.title==='Separate authorization for psychotherapy notes'&&<p className={styles.notice}>This authorization is intentionally separate from the general release because psychotherapy notes receive additional privacy protection.</p>}

    <div className={styles.fields}>{section.fields.map(field=>{
     const [key,label,type]=field;
     const required=field.length>3&&field[3];
     const options=(field.length>4?field[4]:[])??[];
     const cost=costFields.includes(key);
     return <div key={key} className={type==='textarea'?styles.wide:undefined}>
      <label>{label}{required?<span aria-hidden="true"> *</span>:null}
       {type==='select'
        ?<select aria-required={required||undefined} value={answers[key]??''} onChange={e=>update(key,e.target.value)}><option value="">Select…</option>{options.map(option=><option key={option} value={option}>{option==='insured'?'I have insurance':option==='self-pay'?'Self-pay / no insurance':option==='unsure'?'I’m not sure':option}</option>)}</select>
        :type==='textarea'
         ?<textarea aria-required={required||undefined} rows={6} maxLength={8000} value={answers[key]??''} onChange={e=>update(key,e.target.value)}/>
         :<input aria-required={required||undefined} type={type} maxLength={8000} inputMode={cost?'decimal':undefined} disabled={cost&&answers[key]==='I don’t know'} value={answers[key]??''} onChange={e=>update(key,e.target.value)}/>}
      </label>
      {cost&&<label className={styles.checkRow}><input type="checkbox" checked={answers[key]==='I don’t know'} onChange={e=>update(key,e.target.checked?'I don’t know':'')}/> I don’t know</label>}
     </div>;
    })}</div>
   </section>

   <footer className={styles.actions}>
    <p><span aria-hidden="true">*</span> Required to submit. {dirty?'You have unsaved changes.':'Saved answers will reload if this page is refreshed.'}</p>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {message&&<p className={styles.success} role="status">{message}</p>}
    <div className={styles.actionRow}>
     <button type="button" className={styles.secondary} disabled={busy||sectionIndex===0} onClick={()=>setSectionIndex(i=>Math.max(0,i-1))}>Previous</button>
     <button type="button" className={styles.secondary} disabled={busy} onClick={()=>void save(false)}>{busy?'Saving…':'Save'}</button>
     {sectionIndex<intakeSections.length-1
      ?<button type="button" disabled={busy} onClick={()=>setSectionIndex(i=>Math.min(intakeSections.length-1,i+1))}>Next</button>
      :<button type="submit" disabled={busy}>Review and Submit</button>}
    </div>
   </footer>

   {confirm&&<section className={styles.confirm} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
    <div>
     <h2 id="confirm-title">Submit this questionnaire?</h2>
     <p>Submission makes this questionnaire and its signed acknowledgments available to authorized Indian Creek Psychological Services personnel.</p>
     <p>You may return to any section and edit your answers before confirming.</p>
     <div className={styles.actionRow}>
      <button type="button" className={styles.secondary} disabled={busy} onClick={()=>setConfirm(false)}>Return and Edit</button>
      <button type="button" disabled={busy} onClick={()=>void save(true)}>{busy?'Submitting…':'Confirm Submission'}</button>
     </div>
    </div>
   </section>}
  </form>
 </main>;
}
