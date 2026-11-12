'use client';
import IntakeRiskScreening from '@/app/components/IntakeRiskScreening';
import DsmVersionChoice from '@/app/components/DsmVersionChoice';
import {DSM_INTAKE_VERSION_KEY} from '@/lib/clinical-tests/dsm/entry-choice';
import IntakeCommunicationPreferences from '@/app/components/IntakeCommunicationPreferences';
import {communicationFieldKeys} from '@/lib/patient/intake';
import IntakeTraumaHistory from '@/app/components/IntakeTraumaHistory';
import {FormEvent,useEffect,useMemo,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import IntakeLegalDirectory from '@/app/components/IntakeLegalDirectory';
import {LEGAL_ROUTING_KEY,legalRoutingResults} from '@/lib/patient/legal-routing';
import LegalFormCopy from '@/app/components/LegalFormCopy';
import IntakeMedicalSubstance from '@/app/components/IntakeMedicalSubstance';
import IntakeMedications from '@/app/components/IntakeMedications';
import IntakeTreatmentHistory from '@/app/components/IntakeTreatmentHistory';
import IntakeAssignmentDocuments from '@/app/components/IntakeAssignmentDocuments';
import LegalSectionDocument from '@/app/components/LegalSectionDocument';
import {LEGAL_PACKET_VERSION,prepareLegalDraft} from '@/lib/patient/legal-documents';
import {costFields,intakeSections,intakeSectionsForVersion,IntakeAnswers,IntakeRecord,validateIntake} from '@/lib/patient/intake';

export default function IntakeForm({userId,initial,defaults,preview=false}:{userId:string;initial:IntakeRecord|null;defaults:IntakeAnswers;preview?:boolean}){
 const supabase=useMemo(()=>preview?null:createClient(),[preview]);
 const [record,setRecord]=useState(initial),[answers,setAnswers]=useState<IntakeAnswers>(prepareLegalDraft(initial?.answers??defaults,initial?.status==='submitted'));
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[confirm,setConfirm]=useState(false),[dirty,setDirty]=useState(false);
 const [sectionIndex,setSectionIndex]=useState(0);
 const formRef=useRef<HTMLFormElement|null>(null);
 const submitted=!preview&&record?.status==='submitted';
 const sections=submitted?intakeSectionsForVersion(record?.answers.legal_packet_version||''):intakeSections;
 const section=sections[sectionIndex];
 const showCommunication=sectionIndex===1&&section.fields.some(field=>field[0]==='comm_phone_calls');

 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 useEffect(()=>{
  // The site's fixed shell and intakePage use independent scrollports.
  const scrollRoot=formRef.current?.closest('.intakePage');
  if(scrollRoot instanceof HTMLElement)scrollRoot.scrollTop=0;
 },[sectionIndex]);

 const update=(key:string,value:string)=>{setAnswers(a=>({...a,[key]:value}));setDirty(true);setConfirm(false);setMessage('');};
 async function save(submit:boolean){
  if(busy||submitted)return;
  setError('');
  if(preview){setMessage(submit?'Preview mode: submission is disabled; no information was sent.':'The fields are responding to input. Preview mode never saves data to Supabase.');return;}
  if(!supabase){setError('Database connection unavailable.');return;}
  const invalid=validateIntake(answers,submit);if(invalid){setError(invalid);return;}
  setBusy(true);
  try{
   const payload={answers:{...answers,legal_packet_version:LEGAL_PACKET_VERSION},status:submit?'submitted':'draft'};
   const q=record?supabase.from('patient_intakes').update(payload).eq('patient_id',userId).eq('version',record.version):supabase.from('patient_intakes').insert({patient_id:userId,...payload});
   const {data,error:saveError}=await q.select().abortSignal(AbortSignal.timeout(20000)).single();
   if(saveError||!data)throw new Error('Your save could not be confirmed. Keep this page open and check your account in another tab before retrying. A newer version may already be saved.');
   setRecord(data);setDirty(false);setMessage(submit?'Your questionnaire has been submitted to the practice.':'Draft saved securely.');setConfirm(false);
  }catch(e){setError(e instanceof Error?e.message:'Unable to save. Your answers remain on this page.');}finally{setBusy(false);}
 }
 function submit(e:FormEvent){e.preventDefault();if(preview){setMessage('Preview only: this form cannot be submitted. Start a new office intake to test secure saving.');return;}
  const invalid=validateIntake(answers,true);if(invalid){setError(invalid);return;}setError('');setConfirm(true);}
 const next=()=>{setError('');setMessage('');setSectionIndex(i=>Math.min(i+1,sections.length-1));};
 const previous=()=>{setError('');setMessage('');setSectionIndex(i=>Math.max(i-1,0));};

 return <form ref={formRef} onSubmit={submit} className="authForm intakeWizard" autoComplete="off">
  <section className="intakeProgress" aria-label="Questionnaire progress">
   <div><strong>Section {sectionIndex+1} of {sections.length}</strong><span>{Math.round(((sectionIndex+1)/sections.length)*100)}% complete</span></div>
   <progress max={sections.length} value={sectionIndex+1}/>
   <div className="intakeSectionTabs" role="tablist" aria-label="Intake sections">
    {sections.map((item,index)=><button key={item.title} type="button" role="tab" aria-selected={index===sectionIndex} disabled={busy} onClick={()=>setSectionIndex(index)}>{index+1}</button>)}
   </div>
  </section>

  {record?.status==='draft'&&record.answers.legal_packet_version&&record.answers.legal_packet_version!==LEGAL_PACKET_VERSION&&<p className="intakePreviewNotice">The legal statements were revised. Review the current statements and re-enter the separate decisions, signatures and dates before submitting; other intake information is retained.</p>}
  {preview&&<section className="intakePreviewNotice" role="status"><strong>Editable staff preview — testing only.</strong> Type into any field and switch sections. This page never stores answers or signatures; use fictional information only. Use <a href="/admin/intake-kiosk">Start office intake</a> to test real saving to Supabase.</section>}
  {submitted&&<section className="intakeSubmittedNotice" role="status"><strong>This questionnaire was submitted on {record?.submitted_at?new Date(record.submitted_at).toLocaleDateString():'an earlier date'}.</strong> Signed submissions are intentionally locked to protect the original record. To make a correction or complete a new questionnaire, contact the practice at 913-636-5657.</section>}

  <fieldset disabled={busy||submitted} className="appointmentPanel intakeSectionCard" aria-labelledby="intake-current-section">
   <p className="eyebrow">Patient intake</p>
   <h2 id="intake-current-section">{section.title}</h2>
   {section.description&&<p className="intakeSectionDescription">{section.description}</p>}
   {section.title==='Insurance and benefits information'&&<p className="intakeHelp">Enter the information shown on your card or benefits statement. Amounts are patient-reported estimates, not a guarantee of coverage. Choose “I don’t know” when unsure. Leave insurance fields blank if you are self-pay.</p>}
   {section.title==='Safety and risk screening'&&<p className="intakeUrgentNotice"><strong>Urgent safety notice:</strong> This form is not continuously monitored. If you are in immediate danger or believe you may act on thoughts of harming yourself or someone else, contact emergency services or seek immediate crisis assistance.</p>}
   {section.title==='Authorization to share health information'&&<p className="intakeHelp">This optional authorization covers the information you specifically describe below. It does not include separately maintained psychotherapy notes. You may leave this authorization as “No” and still receive care.</p>}
   {section.title==='Separate authorization for psychotherapy notes'&&<p className="intakeHelp">This optional authorization is intentionally separate from the general release because psychotherapy notes receive additional privacy protection.</p>}

   {sectionIndex>=10&&answers[LEGAL_ROUTING_KEY]&&<p className="intakeHelp"><strong>Page 10 guide:</strong> {legalRoutingResults(answers[LEGAL_ROUTING_KEY])?.find(f=>f.section===section.title)?.status||'Office review needed'}. <button type="button" onClick={()=>setSectionIndex(9)}>Return to the form directory</button></p>}
   <LegalSectionDocument sectionTitle={section.title} version={submitted?(record?.answers.legal_packet_version||'legacy-unversioned'):LEGAL_PACKET_VERSION}/>
   <div className="intakeFields">{section.title==='Safety and risk screening'?<IntakeRiskScreening answers={answers} onChange={update} readOnly={submitted} disabled={busy}/>:section.fields.map(field=>{
    const [key,label,type]=field;if(type==='dsm-version')return null;if(showCommunication&&communicationFieldKeys.includes(key))return null;const required=field.length>3&&field[3];const options=(field.length>4?field[4]:[])??[];const cost=costFields.includes(key);
    if(type==='legal-routing')return <div key={key} className="intakeWide"><IntakeLegalDirectory value={answers[key]??''} onChange={v=>update(key,v)} onOpen={page=>setSectionIndex(page-1)} readOnly={submitted} preview={preview}/></div>;
    if(type==='trauma-history')return <div key={key} className="intakeWide"><IntakeTraumaHistory value={answers[key]??''} onChange={v=>update(key,v)} legacyAnswers={answers} readOnly={submitted}/></div>;
    if(type==='medical-substance')return <div key={key} className="intakeWide"><IntakeMedicalSubstance value={answers[key]??''} onChange={v=>update(key,v)} legacyAnswers={answers} readOnly={submitted}/></div>;
    if(type==='medications')return <div key={key} className="intakeWide"><IntakeMedications value={answers[key]??''} onChange={v=>update(key,v)} readOnly={submitted}/></div>;
    if(type==='treatment-history')return <div key={key} className="intakeWide"><IntakeTreatmentHistory value={answers[key]??''} onChange={v=>update(key,v)} readOnly={submitted}/></div>;
    return <div key={key} className={type==='textarea'?'intakeWide':''}><label>{label}{required?' *':''}
     {type==='select'?<select value={answers[key]??''} onChange={e=>update(key,e.target.value)}><option value="">Select…</option>{answers[key]&&!options.includes(answers[key])&&<option value={answers[key]}>Previously saved: {answers[key]}</option>}{options.map(o=><option key={o} value={o}>{o==='insured'?'I have insurance':o==='self-pay'?'Self-pay / no insurance':o==='unsure'?'I’m not sure':o}</option>)}</select>
     :type==='textarea'?<textarea rows={5} maxLength={key==='medication_allergy_notes'?4000:8000} value={answers[key]??''} onChange={e=>update(key,e.target.value)}/>
     :<input type={type} maxLength={8000} value={answers[key]??''} inputMode={cost?'decimal':undefined} disabled={cost&&answers[key]==='I don’t know'} onChange={e=>update(key,e.target.value)}/>}
    </label>{cost&&<label className="checkRow"><input type="checkbox" checked={answers[key]==='I don’t know'} onChange={e=>update(key,e.target.checked?'I don’t know':'')}/> I don’t know</label>}</div>;
   })}</div>
  </fieldset>
  {sectionIndex>=10&&<LegalFormCopy sectionTitle={section.title} answers={answers} submitted={submitted} version={submitted?(record?.answers.legal_packet_version||'legacy-unversioned'):LEGAL_PACKET_VERSION} reference={record?`Patient account intake ${userId} / version ${record.version}`:'Draft / non-saving preview'} submittedAt={record?.submitted_at}/> }
  {sectionIndex===1&&<IntakeAssignmentDocuments patientId={userId} preview={preview} readOnly={submitted} disabled={busy} onBusy={setBusy}/>}
  {showCommunication&&<IntakeCommunicationPreferences answers={answers} onChange={update} disabled={busy||submitted}/>}

  {sectionIndex===sections.length-1&&(!submitted||!!answers[DSM_INTAKE_VERSION_KEY])&&<DsmVersionChoice value={answers[DSM_INTAKE_VERSION_KEY]??''} onChange={v=>update(DSM_INTAKE_VERSION_KEY,v)} dob={answers.date_of_birth} disabled={busy} readOnly={submitted}/>}

  {!submitted&&<section className="intakeWizardActions">
   <p>* Required to submit. Save draft on each page to share your saved answers with the practice before final submission. {dirty?'You have unsaved changes.':''}</p>
   <div className="intakeActionRow">
    <button className="secondaryAction" type="button" disabled={busy||sectionIndex===0} onClick={previous}>← Previous</button>
    <button className="secondaryAction" type="button" disabled={busy} onClick={()=>void save(false)}>{preview?'Check inputs (no save)':'Save draft'}</button>
    {sectionIndex<sections.length-1
      ?<button type="button" disabled={busy} onClick={next}>Next →</button>
      :preview?<button type="button" disabled={busy} onClick={()=>setMessage('All questionnaire sections are available. This preview does not submit patient information.')}>Finish preview</button>
      :<button type="submit" disabled={busy}>Review and submit</button>}
   </div>
  </section>}

  {confirm&&<section className="appointmentPanel intakeConfirm"><h2>Submit this questionnaire?</h2><p>Your answers and signed acknowledgments will be available to authorized practice personnel. Review any section using the numbered buttons above before submitting.</p><button type="button" disabled={busy} onClick={()=>void save(true)}>Confirm submission</button><button type="button" disabled={busy} onClick={()=>setConfirm(false)}>Keep editing</button></section>}
  {message&&<p className="authMessage" role="status">{message}</p>}{error&&<p className="calendarError" role="alert">{error}</p>}
 </form>;
}
