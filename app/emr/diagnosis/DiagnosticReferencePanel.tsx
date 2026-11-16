'use client';
import {useEffect,useState} from 'react';
import DiagnosticReferenceSearch from './DiagnosticReferenceSearch';
import type {CatalogChoice,DiagnosticReference} from '@/lib/emr/diagnosis-reference';
function RelatedCodePicker({group,onSelect,selectedCode,selectedCodes}:{group:DiagnosticReference['related'][number];onSelect:(choice:CatalogChoice|null)=>void;selectedCode:string;selectedCodes:string[]}) {
 if(!group.choices.length)return <li><strong>{group.expression}</strong> — not selectable in the current EMR catalog. Check the source instruction and current coding reference.</li>;
 return <li>
  <label>{group.expression} — {group.choices.length} available code{group.choices.length===1?'':'s'}
   <select aria-label={'Available related codes for '+group.expression} value={group.choices.some(choice=>choice.code===selectedCode)?selectedCode:''} onChange={event=>onSelect(group.choices.find(choice=>choice.code===event.target.value)??null)}>
    <option value="">Choose a clinically applicable code</option>
    {group.choices.map(choice=><option value={choice.code} key={choice.code} disabled={selectedCodes.includes(choice.code)}>{choice.code} — {choice.label}{selectedCodes.includes(choice.code)?' (already on list)':''}</option>)}
   </select>
  </label>
 </li>;
}
export default function DiagnosticReferencePanel({code,name,onSelectRelated,selectedRelatedCode,selectedCodes}:{code:string;name:string;onSelectRelated:(choice:CatalogChoice|null)=>void;selectedRelatedCode:string;selectedCodes:string[]}) {
 const [reference,setReference]=useState<DiagnosticReference|null>(null);
 const [error,setError]=useState<{code:string;message:string}|null>(null);
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  setReference(null);setError(null);
  async function load(){
   try{
    const response=await fetch('/api/emr/diagnoses/reference?code='+encodeURIComponent(code),{signal:controller.signal,cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'Reference could not be loaded.');
    if(data.code!==code)throw Error('The reference did not match the selected diagnosis.');
    if(!controller.signal.aborted)setReference(data);
   }catch(cause){if(!controller.signal.aborted)setError({code,message:cause instanceof Error?cause.message:'Reference could not be loaded.'});}
  }
  void load();
  return ()=>controller.abort();
 },[code,retry]);
 if(error?.code===code)return <div className="diagnosisReference"><p role="status">{error.message}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>Retry reference</button></div>;
 if(!reference||reference.code!==code)return <p role="status">Loading criteria and coding reference for {code}…</p>;
 const instructions=reference.coding.filter(note=>['codeFirst','useAdditionalCode','codeAlso'].includes(note.kind));
 const other=reference.coding.filter(note=>!['codeFirst','useAdditionalCode','codeAlso'].includes(note.kind));
 return <aside className="diagnosisReference" aria-label={name+' criteria and coding reference'}>
  <div className="diagnosisReferenceColumns">
   <section>
    <h3>Diagnostic criteria overview</h3>
    {reference.criteria?<>
     <p><strong>{reference.criteria.title}</strong>{reference.criteria.scope==='group'?' — diagnostic-group overview':''}</p>
     <p>{reference.criteria.summary}</p>
     {reference.criteria.context&&<p>{reference.criteria.context}</p>}
     <p><a href={reference.criteria.source.url} target="_blank" rel="noopener noreferrer">{reference.criteria.source.title}</a></p>
    </>:<p>{reference.criteriaReason}</p>}
    <p className="treatmentHint">{reference.notice} Source checked {reference.checkedOn}.</p>
   </section>
   <section>
    <h3>Advisory coding instructions</h3>
    <p>Apply instructions only when supported by the chart. Primary/secondary here records clinical priority; it does not set claim-code sequencing.</p>
    {instructions.length?<ul>{instructions.map((note,index)=><li key={index}><strong>{note.title} ({note.scope}):</strong> {note.text}</li>)}</ul>:<p>No explicit “code first,” “use additional code,” or “code also” instruction was found on this code or its parents in the bundled tabular source. This does not rule out other applicable coding rules.</p>}
    {reference.dsmAdvisories.map((advisory,index)=><p key={index}><strong>DSM coding advisory:</strong> {advisory.text} <a href={advisory.source.url} target="_blank" rel="noopener noreferrer">APA source</a></p>)}
    {other.length>0&&<details><summary>Exclusions and other tabular notes ({other.length})</summary>
     <p>Excludes1 generally means the conditions are not coded together; consult the guideline exception for unrelated conditions. Excludes2 permits both when both conditions are present. An exclusion is not an instruction to add a diagnosis.</p>
     <ul>{other.map((note,index)=><li key={index}><strong>{note.title} ({note.scope}):</strong> {note.text}</li>)}</ul>
    </details>}
    <p><a href={reference.codingSource.url} target="_blank" rel="noopener noreferrer">{reference.codingSource.title}</a></p>
    <p><a href="https://ftp.cdc.gov/pub/health_statistics/nchs/Publications/ICD10CM/2027/ICD-10-CM-October-1-2026-FY27-Guidelines.pdf" target="_blank" rel="noopener noreferrer">Official FY2027 coding guidelines</a></p>
   </section>
  </div>
  <DiagnosticReferenceSearch key={code} diagnosis={reference.label}/>
  {reference.related.length>0&&<details><summary>Referenced additional codes and EMR availability ({reference.related.length} references)</summary>
   <p>These are references from the instruction or examples. Select a code only if the condition is independently established and the instruction applies. Choose an available code here, then use its Add button on this diagnosis’s Actions line. That creates an unsaved provisional secondary entry.</p>
   <ul className="diagnosisRelatedCodes">{reference.related.map(group=><RelatedCodePicker key={code+':'+group.expression} group={group} onSelect={onSelectRelated} selectedCode={selectedRelatedCode} selectedCodes={selectedCodes}/>)}</ul>
  </details>}
 </aside>;
}
