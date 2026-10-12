import Link from 'next/link';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import LegalSectionDocument from '../components/LegalSectionDocument';

export const metadata={title:'HIPAA Notice of Privacy Practices | Indian Creek Psychological Services',description:'Your HIPAA privacy rights, permitted uses and disclosures, and additional mental-health and substance-use privacy protections.'};

export default function PrivacyPage(){
 return <div className="publicSite"><PublicHeader/><main className="publicLegalPage">
  <div className="publicLegalInner">
   <Link href="/contact">← Contact the practice</Link>
   <h1>Patient privacy and legal documents</h1>
   <p>This is our patient-facing Notice of Privacy Practices. For questions, alternative formats or paper copies, contact Indian Creek Psychological Services at 913-636-5657.</p>
   <LegalSectionDocument sectionTitle="Notice of Privacy Practices acknowledgment" expanded/>
   <div className="legalReferences">
    <h2>Additional official guidance</h2>
    <p><a href="https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/privacy-practices-health-care-provider/index.html" target="_blank" rel="noopener noreferrer">HHS model HIPAA notice</a> · <a href="https://www.hhs.gov/hipaa/part-2/index.html" target="_blank" rel="noopener noreferrer">Substance-use record privacy (42 CFR Part 2)</a> · <a href="https://www.hhs.gov/hipaa/filing-a-complaint/index.html" target="_blank" rel="noopener noreferrer">File an HHS privacy complaint</a></p>
   </div>
  </div>
 </main><PublicFooter/></div>;
}
