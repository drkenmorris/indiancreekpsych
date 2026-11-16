'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {ReferenceSearchResponse,ReferenceSearchSource} from '@/lib/emr/diagnosis-search-types';
export default function DiagnosticReferenceSearch({diagnosis}:{diagnosis:string}) {
 const id=useId();
 const [query,setQuery]=useState(diagnosis.slice(0,160));
 const [source,setSource]=useState<ReferenceSearchSource>('all');
 const [data,setData]=useState<ReferenceSearchResponse|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function search(text=query,filter=source,offset=0) {
  controller.current?.abort();
  if(!text.trim()){setData(null);setBusy(false);setError('Enter a diagnosis, symptom, code, or coding instruction.');return;}
  const pending=new AbortController();controller.current=pending;
  setBusy(true);setError('');setData(null);
  try{
   const response=await fetch('/api/emr/diagnoses/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:text.trim(),source:filter,offset}),signal:pending.signal,cache:'no-store'});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Reference search could not be loaded.');
   if(!pending.signal.aborted)setData(result);
  }catch(cause){if(!pending.signal.aborted)setError(cause instanceof Error?cause.message:'Reference search could not be loaded.');}
  finally{if(!pending.signal.aborted)setBusy(false);}
 }
 return <section className="diagnosisSearch">
  <h3 id={id+'-title'}>Search reference library</h3>
  <p id={id+'-help'}>Search the NIMH GAD publication, FY 2027 coding guidelines, or APA update topics. Enter reference terms only. Patient notes are not included in searches.</p>
  <search aria-labelledby={id+'-title'}>
   <div className="diagnosisSearchControls">
    <div><label htmlFor={id+'-query'}>Reference terms</label>
     <input id={id+'-query'} name="referenceQuery" type="search" maxLength={160} value={query} autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="search" aria-describedby={id+'-help'}
      onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing){event.preventDefault();event.stopPropagation();void search();}}}/>
    </div>
    <div><label htmlFor={id+'-source'}>Reference source</label>
     <select id={id+'-source'} name="referenceSource" value={source} onChange={event=>setSource(event.target.value as ReferenceSearchSource)}>
      <option value="all">All three references</option><option value="nimh">NIMH — GAD publication</option><option value="icd">CDC/CMS — coding guidelines</option><option value="apa">APA — update topics only</option>
     </select>
    </div>
    <button type="button" onClick={()=>void search()}>Search references</button>
    <button type="button" onClick={()=>{setQuery(diagnosis.slice(0,160));void search(diagnosis.slice(0,160));}}>Search selected diagnosis</button>
   </div>
   <div className="diagnosisSearchExamples" aria-label="Example reference searches">
    <span>Try:</span>{['GAD','use additional code','outpatient','substance use','bipolar'].map(term=><button type="button" key={term} onClick={()=>{setQuery(term);void search(term);}}>{term}</button>)}
   </div>
  </search>
  <p role="status">{busy?'Searching reference library…':error||(!data?'Choose Search references to see matching passages and topic links.':data.total?`Showing ${data.offset+1}–${Math.min(data.offset+10,data.total)} of ${data.total} matches for “${data.query}”.`:`No matches for “${data.query}” in this reference collection. Try fewer words or another source. A missing result does not rule out a diagnosis or coding instruction.`)}</p>
  {data&&<>
   <p>Results for <strong>{data.query}</strong> · {data.sources.find(item=>item.id===data.source)?.title??'All three references'} · Sources checked {data.checkedOn}. Excerpts may omit surrounding qualifications; open the source for context.</p>
   <ol className="diagnosisSearchResults" start={data.offset+1}>
    {data.results.map(result=><li key={result.id}>
     <h4><a href={result.url} target="_blank" rel="noopener noreferrer">{result.title} ↗</a></h4>
     <p className="treatmentHint">{data.sources.find(item=>item.id===result.source)?.title} · {result.kind==='topic'?'Topic link only':'Source text excerpt'}{result.page?` · PDF page ${result.page}`:''}</p>
     <p>{result.excerpt}</p>
    </li>)}
   </ol>
   {data.total>10&&<div className="diagnosisSearchExamples">
    <button type="button" disabled={data.offset===0} onClick={()=>void search(data.query,data.source,Math.max(0,data.offset-10))}>Previous results</button>
    <button type="button" disabled={data.offset+10>=data.total} onClick={()=>void search(data.query,data.source,data.offset+10)}>Next results</button>
   </div>}
   <details><summary>Sources and search coverage</summary><ul>{data.sources.map(item=><li key={item.id}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a><p>{item.coverage}</p><p>{item.attribution}</p></li>)}</ul></details>
  </>}
  <p className="diagnosisSearchExamples">Open original reference:
   <a href="https://www.nimh.nih.gov/health/publications/generalized-anxiety-disorder-gad" target="_blank" rel="noopener noreferrer">NIMH GAD publication ↗</a>
   <a href="https://www.cms.gov/files/document/fy-2027-icd-10-cm-coding-guidelines.pdf" target="_blank" rel="noopener noreferrer">FY 2027 coding guidelines ↗</a>
   <a href="https://www.psychiatry.org/getmedia/b68a5776-f88c-45c7-9535-fd219d7aa5cb/APA-DSM5TR-Update-September-2025.pdf" target="_blank" rel="noopener noreferrer">APA September 2025 update ↗</a>
  </p>
  <p className="treatmentHint">APA search covers September 2025 update topics only, not full DSM criteria. Source links open a new tab. PDF page navigation depends on your browser; use the displayed page number if needed.</p>
 </section>;
}
