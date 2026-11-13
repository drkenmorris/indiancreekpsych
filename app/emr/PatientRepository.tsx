'use client';
import {useCallback,useEffect,useRef,useState} from 'react';import Link from 'next/link';import './central-emr.css';
import {demographicFields} from '@/lib/emr/demographics';
import {intakeContactPrefill} from '@/lib/emr/intake-contact-prefill';
import IntakeMedications from '@/app/components/IntakeMedications';
import IntakeTreatmentHistory from '@/app/components/IntakeTreatmentHistory';
import IntakeMedicalSubstance from '@/app/components/IntakeMedicalSubstance';
import PatientGroupHistory from './PatientGroupHistory';
import PatientProgressNotes from './PatientProgressNotes';
import PatientLegalPacket from './PatientLegalPacket';
import IntakeMedicationReconciliation from './IntakeMedicationReconciliation';
import IntakeMedicalSubstanceReconciliation from './IntakeMedicalSubstanceReconciliation';
import IntakeAllergyReconciliation from './IntakeAllergyReconciliation';
import IntakeTraumaHistoryReconciliation from './IntakeTraumaHistoryReconciliation';
import PatientBpsIntakeReview from './PatientBpsIntakeReview';
import {MEDICATION_ENTRIES_KEY} from '@/lib/patient/medications';
import {MEDICAL_SUBSTANCE_KEY} from '@/lib/patient/medical-substance';
import {TREATMENT_HISTORY_KEY} from '@/lib/patient/treatment-history';
type Patient={id:string;account_id:string|null;revision:number;demographics:Record<string,string>;profiles:{full_name?:string}|{full_name?:string}[]|null};
type RecordRow={id:string;label:string;revision:number;updated_at:string};
const name=(p:Patient)=>[p.demographics.first_name,p.demographics.last_name].filter(Boolean).join(' ')||(Array.isArray(p.profiles)?p.profiles[0]?.full_name:p.profiles?.full_name)||'Patient account — demographics pending';
const displayCode=(p:Patient)=>p.demographics.first_name&&p.demographics.last_name&&p.demographics.dob?p.demographics.first_name[0].toUpperCase()+p.demographics.last_name[0].toUpperCase()+p.demographics.dob.slice(5,7)+p.demographics.dob.slice(8,10)+p.demographics.dob.slice(0,4):'Pending reviewed name and birth date';
const label=(key:string)=>({dob:'Birth date',address1:'Street address 1',address2:'Street address 2',postal_code:'Postal code'}[key]??key.replaceAll('_',' ').replace(/^./,s=>s.toUpperCase()));
const clinicianReviewAnchors=new Set(['emr-intake-medication-review','emr-intake-allergy-review',
 'emr-intake-medical-review','emr-intake-trauma-review','emr-intake-treatment-history-review']);
export default function PatientRepository(){const [emailEditing,setEmailEditing]=useState(false);
 const [patients,setPatients]=useState<Patient[]>([]),[selected,setSelected]=useState<Patient|null>(null),[draft,setDraft]=useState<Record<string,string>>({}),[filter,setFilter]=useState(''),[records,setRecords]=useState<RecordRow[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[recordLabel,setRecordLabel]=useState('DSM assessment'),[intake,setIntake]=useState<{status:string;updated_at:string;answers?:Record<string,string>}|null>(null);
 const requestGeneration=useRef(0);
 const load=useCallback(async()=>{const r=await fetch('/api/emr/patients',{cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.error);setPatients(data.patients);return data.patients as Patient[];},[]);useEffect(()=>{load().then(rows=>{const id=new URLSearchParams(window.location.search).get('patient');const p=rows.find(p=>p.id===id);if(p)void open(p);}).catch(e=>setMessage(e.message));},[load]);
 async function open(p:Patient){const generation=++requestGeneration.current;setBusy(true);setSelected(p);setEmailEditing(false);setDraft(p.demographics);setRecords([]);setIntake(null);setMessage('');try{const [r,i]=await Promise.all([fetch('/api/emr/dsm-records?patient='+p.id,{cache:'no-store'}),fetch('/api/emr/patients?id='+p.id,{cache:'no-store'})]);const rd=await r.json(),id=await i.json();if(!r.ok||!i.ok)throw Error(rd.error||id.error);if(generation!==requestGeneration.current)return;setSelected(id.patients[0]);setDraft(id.patients[0].demographics);setRecords(rd.records);setIntake(id.intake);}catch(e){if(generation===requestGeneration.current)setMessage(e instanceof Error?e.message:'Record unavailable.');}finally{if(generation===requestGeneration.current)setBusy(false);}}
 useEffect(()=>{
  if(!selected||busy)return;
  const id=selected.id;
  const generation=requestGeneration.current;
  let active=true,pending=false;
  async function refreshIntake(){
   if(pending||document.visibilityState!=='visible')return;
   pending=true;
   try{
    const response=await fetch('/api/emr/patients?id='+encodeURIComponent(id),{cache:'no-store'});
    if(!active||generation!==requestGeneration.current)return;
    if(response.status===401||response.status===403){setIntake(null);return;}
    if(!response.ok)return;
    const value=await response.json();
    if(active&&generation===requestGeneration.current&&value.patients?.[0]?.id===id)
     setIntake(previous=>previous?.updated_at===value.intake?.updated_at?previous:value.intake);
   }catch{/* The next refresh retries transient failures. */}
   finally{pending=false;}
  }
  const timer=window.setInterval(refreshIntake,5000);
  window.addEventListener('focus',refreshIntake);
  return ()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',refreshIntake);};
 },[selected?.id,busy]);
 // A browser fragment can be lost during clinic sign-in/MFA, and an anchor can
 // render only after this patient's protected chart and intake have loaded.
 // The whitelisted review target is therefore retained in the query string.
 useEffect(()=>{
  if(!selected||busy)return;
  const params=new URLSearchParams(window.location.search);
  if(params.get('patient')!==selected.id)return;
  const target=params.get('review');
  if(!target||!clinicianReviewAnchors.has(target))return;
  document.getElementById(target)?.scrollIntoView?.({block:'start'});
 },[selected?.id,busy]);
 function prefillIntakeContact(){if(!selected||!intake?.answers)return;const result=intakeContactPrefill(draft,intake.answers);if(!result.fields.length){setMessage('No blank supported contact fields are available to fill.');return;}setDraft(result.draft);setMessage('Copied '+result.fields.length+' patient-reported contact field(s) into this UNSAVED draft. Review each field before selecting Save central demographics. Existing chart values were preserved.');}
 async function save(){setBusy(true);try{const r=await fetch('/api/emr/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected?.id,expectedRevision:selected?.revision,demographics:draft})}),data=await r.json();if(!r.ok)throw Error(data.error);const rows=await load(),p=rows.find(p=>p.id===data.id);if(p)await open(p);setMessage('Central patient demographics saved.');}catch(e){setMessage(e instanceof Error?e.message:'Save was not confirmed.');}finally{setBusy(false);}}
 async function createAssessment(){if(!selected)return;setBusy(true);try{const r=await fetch('/api/emr/dsm-records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',patientId:selected.id,label:recordLabel})}),data=await r.json();if(!r.ok)throw Error(data.error);window.location.assign('/clinical-tests/dev/level1?record='+data.record.id);}catch(e){setMessage(e instanceof Error?e.message:'Record creation failed.');setBusy(false);}}
 return <><header><p>Indian Creek Psychological Services</p><h1>EMR — Central patient records</h1><p>Website patient accounts and this EMR use the same patient repository and account security. Clinical assessments remain working records requiring clinician review.</p><nav><Link href="/emr/treatment-planners">Manage Treatment Planner</Link><Link href="/emr/groups">Group sessions and attendance</Link><Link href="/emr/descriptor-library">Manage shared Strengths / Challenges table</Link><Link href="/account">Account</Link><Link href="/clinical-tests">Assessment library</Link><Link href="/admin/intakes">Patient intake records</Link><Link href="/admin/assign-test">Assign assessments</Link></nav></header><p role="status">{message}</p><div className="centralGrid"><section className="centralCard"><h2>Find or add patient</h2><label>Search patient names<input value={filter} onChange={e=>setFilter(e.target.value)}/></label><button disabled={busy} onClick={()=>{requestGeneration.current++;setSelected(null);setEmailEditing(false);setDraft({});setRecords([]);setIntake(null);}}>Add patient</button><ul className="centralPatients">{patients.filter(p=>name(p).toLowerCase().includes(filter.toLowerCase())).sort((a,b)=>(a.demographics.last_name||name(a)).localeCompare(b.demographics.last_name||name(b))).map(p=><li key={p.id}><button disabled={busy} aria-pressed={p.id===selected?.id} onClick={()=>open(p)}>{name(p)}<br/><small>{p.account_id?'Linked patient account':'No patient account linked'}</small></button></li>)}</ul></section><section><article className="centralCard"><h2>{selected?name(selected):'New central patient record'}</h2>{selected&&<p>Patient display ID: {displayCode(selected)}<br/>Central patient ID: {selected.id}<br/>{selected.account_id?'Linked to the website patient account.':'Patient account not linked; no name/email matching is performed.'}</p>}<form autoComplete="off" onSubmit={e=>{e.preventDefault();save();}}><div className="centralFields">{demographicFields.map(key=><label key={key}>{label(key)}<input type={key==='dob'?'date':key==='email'?'email':'text'} autoComplete="off" readOnly={key==='email'&&!emailEditing} maxLength={300} required={key==='first_name'||key==='last_name'} value={draft[key]??''} onChange={e=>{if(key!=='email'||emailEditing)setDraft({...draft,[key]:e.target.value});}}/>{key==='email'&&!emailEditing&&<button type="button" onClick={()=>setEmailEditing(true)}>Edit patient email</button>}</label>)}</div><button disabled={busy}>Save central demographics</button></form></article>{selected&&<><article className="centralCard"><h2>Patient intake source</h2><p>{intake?`A ${intake.status} intake is stored against this patient's linked website account.`:'No linked intake is available.'}</p><p>Patient-reported source information is retained separately from clinician-reviewed demographics.</p>{intake?.answers&&<div><button type="button" disabled={busy||!intakeContactPrefill(draft,intake.answers).fields.length} onClick={prefillIntakeContact}>Fill blank contact fields in unsaved demographics form</button><p>Only blank address and email fields are eligible. This does not automatically save, overwrite an existing value, transfer names or birth dates, or assume a phone number is mobile or home. Check the source and every draft field before saving.</p></div>}{intake?.answers&&<dl>{Object.entries(intake.answers).filter(([key,value])=>value&&!['medication_entries','medical_substance_history','medication_allergy_status','medication_allergy_notes','treatment_history_entries'].includes(key)).map(([key,value])=><div key={key}><dt>{label(key)}</dt><dd>{value}</dd></div>)}</dl>}
{intake?.answers&&[MEDICATION_ENTRIES_KEY,MEDICAL_SUBSTANCE_KEY,'medication_allergy_status','medication_allergy_notes'].some(key=>intake.answers?.[key]?.trim())&&
 <details><summary>Patient-reported medication, allergy, and medical/substance history — read-only</summary>
 <p>This information comes from the linked website intake, including drafts. It has not been independently verified, reconciled with clinical chart records, or added to the clinical record. Review the source with the patient before any clinical use. Opening this section never saves or changes the EMR.</p>
 {intake.answers[MEDICATION_ENTRIES_KEY]&&<IntakeMedications value={intake.answers[MEDICATION_ENTRIES_KEY]} readOnly/>}
 {(intake.answers.medication_allergy_status||intake.answers.medication_allergy_notes)&&<section><h3>Patient-reported medication allergies</h3><p>Status: {intake.answers.medication_allergy_status||'Not yet reviewed'}</p>{intake.answers.medication_allergy_notes&&<p>Reactions / notes: {intake.answers.medication_allergy_notes}</p>}</section>}
 {intake.answers[MEDICAL_SUBSTANCE_KEY]&&<IntakeMedicalSubstance value={intake.answers[MEDICAL_SUBSTANCE_KEY]} readOnly legacyAnswers={intake.answers}/>}
 </details>}
<section id="emr-intake-medication-review" aria-label="Clinician medication reconciliation">
 {intake?.answers?.prior_psychiatric_medications&&<section><h3>Medications that helped in the past</h3><p>{intake.answers.prior_psychiatric_medications}</p></section>}
 {intake?.answers?.[MEDICATION_ENTRIES_KEY]?<IntakeMedicationReconciliation key={selected.id} patientId={selected.id} intakeJson={intake.answers[MEDICATION_ENTRIES_KEY]} intakeUpdatedAt={intake.updated_at}/>:<p>No linked patient-reported medication entries are available for reconciliation.</p>}
 </section>
<section id="emr-intake-medical-review" aria-label="Clinician medical and substance history reconciliation">
 {intake?.answers?.[MEDICAL_SUBSTANCE_KEY]?<IntakeMedicalSubstanceReconciliation key={selected.id} patientId={selected.id} sourceJson={intake.answers[MEDICAL_SUBSTANCE_KEY]} sourceUpdatedAt={intake.updated_at}/>:<p>No linked patient-reported medical and substance-use history is available for reconciliation.</p>}
 </section>
<section id="emr-intake-allergy-review" aria-label="Clinician medication allergy reconciliation">
 {(intake?.answers?.medication_allergy_status||intake?.answers?.medication_allergy_notes)?<IntakeAllergyReconciliation key={selected.id} patientId={selected.id} sourceStatus={intake?.answers?.medication_allergy_status||''} sourceNotes={intake?.answers?.medication_allergy_notes||''} sourceUpdatedAt={intake?.updated_at||''}/>:<p>No linked patient-reported medication allergy entries are available for reconciliation.</p>}
 </section>
<section id="emr-intake-trauma-review" aria-label="Clinician trauma history reconciliation">
 {intake?.answers?.trauma_history_checklist?<IntakeTraumaHistoryReconciliation key={'trauma-'+selected.id} patientId={selected.id} sourceJson={intake.answers.trauma_history_checklist} sourceStatus={intake.status} sourceUpdatedAt={intake.updated_at}/>:<p>No linked structured trauma checklist is available for reconciliation.</p>}
 </section>
<section id="emr-intake-treatment-history-review" aria-label="Protected counseling and psychiatric treatment history review">
  <h3>Review patient-reported prior counseling and psychiatric treatment</h3>
  <p>These entries are displayed from this central patient’s explicitly linked website intake. They are patient reports, not verified clinician findings. Opening this section does not copy them into the clinical chart, approve a diagnosis or create a clinical record.</p>
  {intake?.answers?.[TREATMENT_HISTORY_KEY]?<IntakeTreatmentHistory key={'treatment-'+selected.id} value={intake.answers[TREATMENT_HISTORY_KEY]} readOnly/>:<p>No linked structured counseling/psychiatric treatment history is available for review.</p>}
 </section>
 <Link href="/admin/intakes">Open protected intake review</Link></article><PatientBpsIntakeReview key={'bps-'+selected.id} patientId={selected.id}/><PatientGroupHistory key={selected.id} patientId={selected.id}/><PatientProgressNotes key={selected.id} patientId={selected.id}/><PatientLegalPacket key={'legal-'+selected.id} patientId={selected.id}/><article className="centralCard"><h2>EMR workspace and assessments</h2><p><Link href={'/emr/treatment-plan?patient='+selected.id}>Build / print treatment plan</Link></p><p><Link href={'/admin/assign-test?test=dsm&patient='+selected.id}>DSM recipient assignment</Link> · <Link href={'/emr/dsm?patient='+selected.id}>DSM recipient results and evaluation</Link></p><p><Link href={'/admin/assign-test?test=asq&patient='+selected.id}>ASQ / ASEQ recipient assignments</Link> · <Link href={'/emr/asq?patient='+selected.id}>ASQ / ASEQ results and evaluations</Link></p><p><Link href={"/emr?patient="+encodeURIComponent(selected.id)}>Open original biopsychosocial EMR and clinical modules</Link></p><p>Records below belong to this central patient ID and your authorized clinic account. Another provider does not gain access merely by using the same patient name.</p><label>New assessment label<input value={recordLabel} maxLength={140} onChange={e=>setRecordLabel(e.target.value)}/></label><button onClick={createAssessment} disabled={busy||!recordLabel.trim()}>Start DSM assessment for this patient</button><ul>{records.map(r=><li key={r.id}><Link href={'/clinical-tests/dev/level1?record='+r.id}>{r.label} — revision {r.revision}</Link> · <Link href={'/clinical-tests/dev/summary?record='+r.id}>Report</Link></li>)}</ul></article></>}</section></div></>;
}
