'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {bpsNoteDomains,emptyBpsNotes,mapSavedBpsReportedFields,type BpsNotes} from '@/lib/emr/intake-bps';
type Field={key:string;label:string;type:string;value:string;sourceOnly?:boolean;reported?:boolean};
type Section={title:string;domain:string;disposition:'clinical'|'separate-review'|'reference';fields:Field[];answered:number};
type Review={id:string;source_version:number;source_status:string;source_updated_at:string;created_at:string;clinical_answers:Record<string,string>;clinician_notes:BpsNotes;excluded_clinical_fields?:number};
type ResponseData={patientId:string;source:{accountId:string;status:string;version:number;updatedAt:string};sections:Section[];unmappedKeys:string[];reviews:Review[]};
const focusedReviewLinks:Record<string,{label:string;anchor:string}[]>={
 'Mental health treatment history':[
  {label:'Review reported counseling and psychiatric treatment history in the central chart',anchor:'emr-intake-treatment-history-review'}],
 'Medications':[
  {label:'Review reported medications in the central chart',anchor:'emr-intake-medication-review'},
  {label:'Review reported medication allergies in the central chart',anchor:'emr-intake-allergy-review'}],
 'Medical & Substance Use History':[
  {label:'Review medical and substance-use history in the central chart',anchor:'emr-intake-medical-review'}],
 'Trauma, family, social, educational, and occupational history':[
  {label:'Review structured trauma history in the central chart',anchor:'emr-intake-trauma-review'}]
};
const protectedSourceTypes=new Set(['treatment-history','medications','medical-substance','trauma-history','legal-routing','dsm-version']);
const readable=(field:Field,disposition:Section['disposition'])=>
 disposition!=='clinical'||field.sourceOnly!==false||protectedSourceTypes.has(field.type)?
 'Structured questionnaire: use the protected original intake or the dedicated reconciliation module; raw content is not automatically imported.':field.value;
async function json(response:Response){const data=await response.json();if(!response.ok)throw Error(data.error||'Protected BPS request failed.');return data;}
export default function PatientBpsIntakeReview({patientId}:{patientId:string}){
 const [data,setData]=useState<ResponseData|null>(null),[error,setError]=useState(''),[status,setStatus]=useState(''),
 [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[prepared,setPrepared]=useState(false),
 [notes,setNotes]=useState<BpsNotes>(emptyBpsNotes),[reviewed,setReviewed]=useState(false),
 [acknowledgedVersion,setAcknowledgedVersion]=useState<number|null>(null);
 // A save may finish after the clinician switches patients. Never allow its result
 // to update a different chart (including A → B → A navigation).
 const chartScope=useRef({patientId,generation:0});
 // The database allows only one append-only review per clinician, central chart and
 // source version. Show that invariant before another submit, and keep it enforced
 // locally after an acknowledged save even if the read-back request fails.
 const versionAlreadyReviewed=!!data&&(data.reviews.some(review=>review.source_version===data.source.version)||
  acknowledgedVersion===data.source.version);
 async function load(id:string){
  const value=await json(await fetch('/api/emr/bps-intake?patient='+encodeURIComponent(id),{cache:'no-store'}));
  if(value.patientId!==id||!Array.isArray(value.sections)||value.sections.length!==21)throw Error('BPS source did not match the selected chart.');
  return value as ResponseData;
 }
 useEffect(()=>{let active=true;
  if(chartScope.current.patientId!==patientId)chartScope.current={patientId,generation:chartScope.current.generation+1};
  setData(null);setError('');setStatus('');setLoading(true);setPrepared(false);setSaving(false);
  setReviewed(false);setNotes(emptyBpsNotes());setAcknowledgedVersion(null);
  load(patientId).then(value=>{if(active)setData(value);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'BPS intake unavailable.');})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[patientId]);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!data||data.patientId!==patientId||!reviewed||saving||!prepared||versionAlreadyReviewed)return;
  const generation=chartScope.current.generation;
  const stillOnChart=()=>chartScope.current.patientId===patientId&&chartScope.current.generation===generation;
  setSaving(true);setStatus('');
  try{
   const result=await json(await fetch('/api/emr/bps-intake',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({patientId,sourceAccountId:data.source.accountId,sourceVersion:data.source.version,sourceStatus:data.source.status,
     sourceUpdatedAt:data.source.updatedAt,notes,reviewed:true})}));
   if(!stillOnChart())return;
   if(!result.saved)throw Error('The review was not confirmed.');
   // The database has acknowledged this append-only write. A subsequent read failure
   // must never be described as an unsaved review or invite a duplicate save.
   setAcknowledgedVersion(data.source.version);
   setPrepared(false);setReviewed(false);setNotes(emptyBpsNotes());
   setStatus('Clinician-reviewed, unsigned BPS intake snapshot saved in the protected chart. Patient statements remain patient-reported; no diagnosis, authorization, or signature was created.');
   try{
    const next=await load(patientId);
    if(stillOnChart())setData(next);
   }catch{
    if(stillOnChart())setStatus('The clinician-reviewed BPS snapshot WAS saved, but its history could not be reloaded. Reopen this patient chart to check the saved review; do not submit it again.');
   }
  }catch(e){if(stillOnChart())setStatus(e instanceof Error?e.message:'BPS intake save was not confirmed.');}
  finally{if(stillOnChart())setSaving(false);}
 }
 return <article className="centralCard" aria-label="Intake biopsychosocial reconciliation">
  <h2>Biopsychosocial assessment — 21-section intake reconciliation</h2>
  <p>Review the exact linked website patient's patient-reported intake. Clinical history is not an independently verified fact, diagnosis, signed assessment or risk clearance. Legal consent decisions and insurance remain in their own records. Medication, allergy, substance-use and structured trauma entries require their existing dedicated reconciliation modules.</p>
  {loading?<p role="status">Checking protected BPS intake…</p>:error?<p role="alert">{error}</p>:data?.patientId===patientId&&<>
   <p>Source: <strong>{data.source.status==='submitted'?'Submitted intake (immutable source)':'Draft intake (may change)'}</strong> · Version {data.source.version} · Last updated {new Date(data.source.updatedAt).toLocaleString()}</p>
   <p>Sections audited: {data.sections.length}/21 · Saved clinician reviews: {data.reviews.length}.</p>
   {data.unmappedKeys.length>0&&<p role="alert">The source contains {data.unmappedKeys.length} additional historical or unrecognized field(s): {data.unmappedKeys.join(', ')}. These are NOT silently transferred. Review the original intake and resolve their mapping.</p>}
   <nav aria-label="Patient-scoped clinical reconciliation shortcuts">
    <p><strong>Open dedicated clinician reviews for this patient:</strong> These existing central-chart workflows keep medications, allergies, medical/substance-use history and structured trauma separate from unsigned BPS notes. Following a link does not save or approve any patient report.</p>
    {Object.values(focusedReviewLinks).flat().map(target=><a key={target.anchor}
     href={'/emr/patients?patient='+encodeURIComponent(patientId)+'&review='+encodeURIComponent(target.anchor)+'#'+target.anchor}>{target.label}</a>)}
   </nav>
   {data.sections.map((section,i)=><details key={i}>
    <summary>{i+1}. {section.title} — {section.answered}/{section.fields.length} answered · {section.disposition}</summary>
    <p><strong>BPS routing:</strong> {section.domain}. {section.disposition==='reference'?'Reference only; no legal document or administrative decision is copied into BPS.':
       section.disposition==='separate-review'?'Use the existing dedicated medication, medical or structured-history reconciliation; BPS does not silently duplicate these entries.':'Potential clinical history; clinician review is mandatory before any snapshot.'}</p>
    {focusedReviewLinks[section.title]?.length>0&&<nav aria-label={section.title+' clinician reconciliation'}>
     {focusedReviewLinks[section.title].map(target=><a key={target.anchor} href={'/emr/patients?patient='+encodeURIComponent(patientId)+'&review='+encodeURIComponent(target.anchor)+'#'+target.anchor}>{target.label}</a>)}
     <p>Opens the existing clinician-review workflow for this exact central patient. Opening a link never copies, approves or saves patient statements.</p>
    </nav>}
    <dl>{section.fields.filter(field=>typeof field.value==='string'&&field.value.trim()).map(field=><div key={field.key}>
      <dt>{field.label}</dt><dd style={{whiteSpace:'pre-wrap'}}>{readable(field,section.disposition)}</dd>
     </div>)}</dl>{section.answered===0&&<p>No response recorded. Blank is not equivalent to a negative clinical finding.</p>}
   </details>)}
   {data.reviews.length>0&&<details><summary>Previously saved immutable clinician reviews ({data.reviews.length})</summary>
    {data.reviews.map(review=>{
     const frozen=mapSavedBpsReportedFields(review.clinical_answers??{});
     const count=frozen.sections.reduce((sum,section)=>sum+section.fields.length,0);
     return <section key={review.id}>
      <h3>{new Date(review.created_at).toLocaleString()} — source v{review.source_version} ({review.source_status})</h3>
      <p>Linked intake source last updated {new Date(review.source_updated_at).toLocaleString()}. This is an immutable historical snapshot of patient-reported information, not a new import, verified clinical finding, diagnosis or signature.</p>
      {!!review.excluded_clinical_fields&&<p role="alert">{review.excluded_clinical_fields} unapproved or malformed historical field(s) were withheld by the protected server. Review source provenance before clinical use.</p>}
      <details><summary>View saved patient-reported BPS history ({count} clinical fields)</summary>
       {count===0&&<p>No eligible patient-reported clinical history fields were saved in this review. Blank is not a negative clinical finding.</p>}
       {frozen.sections.map(section=><div key={section.title}><h4>{section.domain}</h4>
        <dl>{section.fields.map(field=><div key={field.key}><dt>{field.label} (patient reported)</dt><dd style={{whiteSpace:'pre-wrap'}}>{field.value}</dd></div>)}</dl>
       </div>)}
       {frozen.unmappedKeys.length>0&&<p role="alert">This stored snapshot has {frozen.unmappedKeys.length} unrecognized field(s), intentionally excluded from the BPS view. Review the source mapping before clinical use.</p>}
      </details>
      <h4>Separate clinician contextual notes — unsigned</h4>
      <dl>{Object.entries(review.clinician_notes).filter(([,value])=>value).map(([key,value])=><div key={key}><dt>{bpsNoteDomains[key as keyof BpsNotes]||key}</dt><dd style={{whiteSpace:'pre-wrap'}}>{value}</dd></div>)}</dl>
     </section>;
    })}
   </details>}
   {versionAlreadyReviewed?<p role="status">A clinician-reviewed BPS snapshot for this source version has already been saved. Its immutable history can be reopened above; a second save of the same version is not permitted. If the source changed without a new version, resolve the intake provenance before saving.</p>:!prepared?<button type="button" disabled={saving} onClick={()=>{setPrepared(true);setReviewed(false);setNotes(emptyBpsNotes());setStatus('');}}>Prepare clinician-reviewed BPS intake draft</button>:
    <form onSubmit={save} autoComplete="off">
     <h3>Clinician review and contextual assessment notes</h3>
     <p>The patient source is read-only. Enter your independent observations and follow-up needs here. Safety screening is not a substitute for an immediate clinical risk assessment.</p>
     {(Object.entries(bpsNoteDomains) as [keyof BpsNotes,string][]).map(([key,label])=><label key={key}>{label}
      <textarea rows={3} maxLength={4000} value={notes[key]} onChange={e=>{setNotes({...notes,[key]:e.target.value});setReviewed(false);}}/>
     </label>)}
     <label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>
      I reviewed this intake in the context of the selected patient's chart, distinguished patient reports from clinical findings, and understand that this saves an unsigned, append-only BPS history snapshot rather than a diagnosis, signature or consent.</label>
     <button type="submit" disabled={!reviewed||saving}>Save reviewed BPS history snapshot</button>
     <button type="button" disabled={saving} onClick={()=>{setPrepared(false);setReviewed(false);}}>Discard unsaved draft</button>
    </form>}
   {status&&<p role="status">{status}</p>}
  </>}
 </article>;
}
