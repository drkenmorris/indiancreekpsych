import {legalDocuments,LEGAL_PACKET_VERSION} from '@/lib/patient/legal-documents';

export default function LegalSectionDocument({sectionTitle}:{sectionTitle:string}){
 const doc=legalDocuments[sectionTitle];
 if(!doc)return null;
 return <article className="legalDocument" aria-label={doc.title}>
  <header className="legalDocumentHeader">
   <p className="eyebrow">Patient document · revision {LEGAL_PACKET_VERSION}</p>
   <h3>{doc.title}</h3>
   <p>{doc.summary}</p>
   {sectionTitle==='Notice of Privacy Practices acknowledgment'&&<p><a href="/privacy" target="_blank" rel="noopener noreferrer">Open full privacy notice in a separate window</a> · Print or request a paper copy from the office.</p>}
  </header>
  {doc.parts.map(part=><section key={part.heading} className="legalDocumentPart">
   <h4>{part.heading}</h4>{part.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
  </section>)}
  <p className="legalDocumentClosing">Your answer and signature below apply to this document only. Optional disclosures, telehealth and other choices are made independently. Contact the office if you need an explanation before signing.</p>
 </article>;
}
