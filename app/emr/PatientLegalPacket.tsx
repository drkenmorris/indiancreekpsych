'use client';
import {useEffect,useState} from 'react';
import SubmittedLegalForms from '@/app/components/SubmittedLegalForms';

type Packet={
 version:string;
 submittedAt:string;
 knownRevision:boolean;
 reference?:string;
 answers?:Record<string,string>;
};
type Result={patientId:string;packet:Packet|null;reason?:'unlinked'|'not_submitted';error?:string};

export default function PatientLegalPacket({patientId}:{patientId:string}){
 const [result,setResult]=useState<Result|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  setResult(null);setError('');
  void (async()=>{
   try{
    const response=await fetch('/api/emr/legal-packet?patient='+encodeURIComponent(patientId),{
     cache:'no-store',signal:controller.signal,
    });
    const value=await response.json() as Result;
    if(!response.ok)throw Error(value.error||'Legal packet could not be loaded.');
    if(value.patientId!==patientId)throw Error('Legal packet patient identity mismatch.');
    if(!controller.signal.aborted)setResult(value);
   }catch(reason){
    if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:'Legal packet unavailable.');
   }
  })();
  return ()=>controller.abort();
 },[patientId]);
 return <article className="centralCard" aria-label="Submitted patient legal documents">
  <h2>Submitted legal notices and authorization records</h2>
  <p>This is a read-only view of the legal packet submitted by the <strong>explicitly linked patient account</strong>.
   Patient drafts and office kiosk packets are not automatically attached to this chart.
   A recorded signature or consent choice is not independent verification of legal authority.</p>
  {error?<p role="alert">Legal documents could not be verified: {error}</p>:
   !result?<p role="status">Loading submitted legal packet…</p>:
   !result.packet?<p role="status">{result.reason==='unlinked'?
    'No website patient account is linked. Legal packets cannot be matched by name or birth date.':
    'No submitted legal packet is available for the linked patient account. Drafts are not displayed as signed records.'}</p>:
   !result.packet.knownRevision?<p role="alert">A submitted legal packet exists, but its document revision ({result.packet.version}) is not available in the current document library. No later form text or authorization status will be substituted. Open protected intake review to examine the historical responses.</p>:
   <details>
    <summary>Review submitted legal packet · {result.packet.version} · {new Date(result.packet.submittedAt).toLocaleDateString()}</summary>
    <p>Submitted: {new Date(result.packet.submittedAt).toLocaleString()}. No patient, consent, authorization or clinical record is changed by opening or printing these copies.</p>
    <SubmittedLegalForms
     answers={result.packet.answers??{}}
     reference={result.packet.reference??'Linked submitted intake'}
     submittedAt={result.packet.submittedAt}
    />
   </details>}
  <p><a href="/admin/intakes">Open protected full intake and kiosk review</a></p>
 </article>;
}
