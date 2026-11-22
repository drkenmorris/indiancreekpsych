'use client';
import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import IntakeMedicalSubstance from '@/app/components/IntakeMedicalSubstance';
import {parseMedicalSubstance,validateMedicalSubstance,type MedicalSubstanceAnswers} from '@/lib/patient/medical-substance';

type MedicalRecord={id:string;kind:string;created:string;selections:Record<string,string[]>;notes:Record<string,string>};
const content=(a:MedicalSubstanceAnswers)=>JSON.stringify({selections:a.selections,notes:a.notes});
const same=(a:MedicalRecord,b:MedicalSubstanceAnswers)=>content(b)===JSON.stringify({selections:a.selections,notes:a.notes});
async function json(response:Response){
 const value=await response.json();
 if(!response.ok)throw Error(value.error||'Central medical history request was not confirmed.');
 return value;
}
async function chart(patientId:string):Promise<{revision:number;records:MedicalRecord[]}>{
 const r=await fetch('/api/emr/workflow',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({patientId,path:'/api/chart?patient='+encodeURIComponent(patientId),method:'GET',expectedRevision:0})});
 const value=await json(r);
 if(!Number.isInteger(value.revision)||!Array.isArray(value.value?.records))throw Error('Central chart response was incomplete.');
 return {revision:value.revision,records:value.value.records.filter((v:MedicalRecord)=>v.kind==='biopsychosocial_medical_substance')};
}
/** Clinician-mediated review of source history; always an append-only EMR record, never a synthetic demo import. */
export default function IntakeMedicalSubstanceReconciliation({patientId,sourceJson,sourceUpdatedAt}:
 {patientId:string;sourceJson:string;sourceUpdatedAt:string}){
 const source=useMemo(()=>{
  try{
   const parsed=parseMedicalSubstance(sourceJson);
   const hasContent=Object.values(parsed.selections).some(v=>v.length>0)||Object.values(parsed.notes).some(v=>v.trim().length>0);
   return {parsed,hasContent,error:''};
  }catch{return {parsed:null,hasContent:false,error:'The patient-reported medical/substance history could not be read. Review the original intake; no transfer is available.'};}
 },[sourceJson]);
 const [records,setRecords]=useState<MedicalRecord[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 // After an attempted chart write, do not permit a second submit until durable readback confirms it.
 const [verificationPending,setVerificationPending]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [draftJson,setDraftJson]=useState('');
 const [reviewed,setReviewed]=useState(false);
 const scope=useRef({patientId,sourceJson,sourceUpdatedAt,generation:0});
 if(scope.current.patientId!==patientId||scope.current.sourceJson!==sourceJson||
    scope.current.sourceUpdatedAt!==sourceUpdatedAt)
  scope.current={patientId,sourceJson,sourceUpdatedAt,generation:scope.current.generation+1};
 const preparedGeneration=useRef<number|null>(null);
 const savingGeneration=useRef<number|null>(null);
 useEffect(()=>{
  let active=true;
  setDraftJson('');setReviewed(false);setError('');setMessage('');setBusy(false);setRecords([]);setLoading(true);setVerificationPending(false);
  chart(patientId).then(value=>{if(active)setRecords(value.records);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Central history unavailable.');})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[patientId,sourceJson,sourceUpdatedAt]);
 const isExactCopy=useMemo(()=>{
  try{const parsed=parseMedicalSubstance(draftJson);return records.some(r=>same(r,parsed));}
  catch{return false;}
 },[draftJson,records]);
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const generation=scope.current.generation;
  const onOriginalScope=()=>scope.current.generation===generation&&scope.current.patientId===patientId&&
   scope.current.sourceJson===sourceJson&&scope.current.sourceUpdatedAt===sourceUpdatedAt;
  if(savingGeneration.current===generation||preparedGeneration.current!==generation||
     verificationPending||!reviewed||!draftJson||source.error||loading||busy||error)return;
  savingGeneration.current=generation;
  setBusy(true);setMessage('');
  try{
   const problem=validateMedicalSubstance(draftJson);
   if(problem)throw Error(problem);
   const parsed=parseMedicalSubstance(draftJson);
   if(!Object.values(parsed.selections).some(v=>v.length>0)&&!Object.values(parsed.notes).some(v=>v.trim()))throw Error('The history draft contains no clinical documentation.');
   if(isExactCopy)throw Error('An identical history snapshot already exists. Review or revise it rather than saving a duplicate.');
   const result=await fetch('/api/emr/patients?id='+encodeURIComponent(patientId),{cache:'no-store'});
   const linked=await json(result);
   if(!onOriginalScope())return;
   if(linked.intake?.status!=='submitted')
    throw Error('Linked intake has not been submitted; medical/substance history cannot be reconciled from a draft.');
   if(linked.patients?.[0]?.id!==patientId||linked.intake?.updated_at!==sourceUpdatedAt||
      linked.intake?.answers?.medical_substance_history!==sourceJson)
      throw Error('The linked intake history changed. Reopen this patient and review the latest source before saving.');
   const latest=await chart(patientId);
   if(!onOriginalScope())return;
   if(latest.records.some(r=>same(r,parsed)))throw Error('This same history was saved in another session. Reopen the chart to review its latest version.');
   // The write may commit even if the response or follow-up chart read fails.
   // Lock retries until verified persistence or a fresh chart reopen.
   if(!onOriginalScope())return;
   setVerificationPending(true);
   const write=await fetch('/api/emr/workflow',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({patientId,path:'/api/save',method:'POST',expectedRevision:latest.revision,
     body:{patient_id:patientId,action:'biopsychosocial_medical_substance',data:{selections:parsed.selections,notes:parsed.notes}}})});
   await json(write);
   if(!onOriginalScope())return;
   const updated=await chart(patientId);
   if(!onOriginalScope())return;
   const priorIds=new Set(latest.records.map(row=>row.id));
   // A pre-existing copy or an unadvanced revision cannot confirm this reviewed write.
   if(updated.revision<=latest.revision||!updated.records.some(row=>
     typeof row.id==='string'&&row.id.trim().length>0&&!priorIds.has(row.id)&&same(row,parsed)))
    throw Error('Medical/substance save was acknowledged, but the exact reviewed history was not verified on chart readback. Reopen the chart before retrying.');
   setVerificationPending(false);
   setRecords(updated.records);setDraftJson('');setReviewed(false);
   setMessage('A new medical/substance history snapshot was recorded in the protected central chart. This does not establish a diagnosis, clinician signature or final treatment decision.');
  }catch(e){if(onOriginalScope())setMessage(e instanceof Error?e.message:'Clinical history save was not confirmed.');}
  finally{if(savingGeneration.current===generation)savingGeneration.current=null;
   if(onOriginalScope())setBusy(false);}
 }
 return <section aria-label="Medical and substance history transfer" className="centralCard">
  <h3>Review medical/substance history into central chart</h3>
  <p>The existing clinic medical-history module uses the same structured choices and fields as the intake, but its central chart keeps independent immutable snapshots. Copy nothing automatically. Review with the patient, correct the draft and explicitly save when appropriate.</p>
  {source.error?<p role="alert">{source.error}</p>:loading?<p role="status">Checking protected central history…</p>:error?<p role="alert">{error}</p>:!source.hasContent?<p>No completed medical/substance source history is available to transfer.</p>:
   <><p>Previously recorded central history snapshots: {records.length}. New saves do not replace existing versions.</p>
    {!draftJson?<button type="button" disabled={busy} onClick={()=>{preparedGeneration.current=scope.current.generation;setDraftJson(sourceJson);setReviewed(false);setMessage('');}}>Prepare clinician draft from intake</button>:
     <form onSubmit={save}><h4>Clinical medical/substance history draft</h4>
      <IntakeMedicalSubstance value={draftJson} onChange={v=>{setDraftJson(v);setReviewed(false);}} disabled={busy}/>
      <label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>
       I reviewed and corrected these patient-reported historical details. I understand saving creates a new documentation snapshot, not a clinical diagnosis, prescribing order or signature.
      </label>
      {isExactCopy&&<p role="alert">An identical history already exists in the chart; do not duplicate it.</p>}
      <button type="submit" disabled={busy||!reviewed||isExactCopy||verificationPending}>Save clinician-reviewed history snapshot</button>
      <button type="button" disabled={busy} onClick={()=>{setDraftJson('');setReviewed(false);}}>Discard unsaved draft</button>
     </form>}
   </>}
  {verificationPending&&<p role="alert">The prior save outcome is not independently verified. Reopen the protected chart and inspect history before another attempt; do not submit a duplicate clinical entry.</p>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
