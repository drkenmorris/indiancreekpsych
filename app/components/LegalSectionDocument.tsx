import {legalDocuments,LEGAL_PACKET_VERSION} from '@/lib/patient/legal-documents';

export default function LegalSectionDocument({sectionTitle,expanded=false}:{sectionTitle:string;expanded?:boolean}){
 const doc=legalDocuments[sectionTitle];
 if(!doc)return null;
 return <article className="legalDocument" aria-label={doc.title}>
  <header className="legalDocumentHeader">
   <p className="eyebrow">Patient document · revision {LEGAL_PACKET_VERSION}</p>
   <h3>{doc.title}</h3>
   <p>{doc.summary}</p>
   {sectionTitle==='Notice of Privacy Practices acknowledgment'&&<p><a href="/privacy" target="_blank" rel="noopener noreferrer">Open full privacy notice in a separate window</a> · Print or request a paper copy from the office.</p>}
  </header>
  <details className="legalDocumentFullText" open={expanded}>
    <summary>Read the complete {doc.title}</summary>
    {doc.parts.map(part=><section key={part.heading} className="legalDocumentPart">
      <h4>{part.heading}</h4>{part.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
    </section>)}
  </details>
  <p className="legalDocumentClosing">Read this complete document before signing below. Your answer applies to this document only. Optional releases and telehealth choices are independent. Contact the office with questions.</p>
 </article>;
}
