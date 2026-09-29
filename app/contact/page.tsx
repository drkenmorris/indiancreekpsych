import Link from "next/link";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

export default function ContactPage(){
 return <div className="publicSite"><PublicHeader/><main>
  <section className="mockHero contactMockHero">
   
   <div className="heroScrim compact"><p className="eyebrow">Get in touch</p><h1>We&apos;re here to help you take the next step.</h1><p>Whether you have questions about our services, want to schedule an appointment, or simply want to learn more, we&apos;d be glad to help.</p></div>
  </section>
  <section className="contactPageGrid">
   <div className="contactDetails"><h2>Indian Creek Psychological Services</h2><p><strong>Phone</strong><a href="tel:+19136365657">913-636-5657</a></p><p><strong>Address</strong><span>15022 W. 128th St.<br/>Olathe, KS 66062</span></p><div className="heroActions"><Link className="primaryButton" href="/appointments">Schedule an Appointment</Link><Link className="secondaryButton" href="/login?next=/appointments">Patient Sign In</Link></div><p className="microcopy">The phone number shown here is the practice&apos;s current number and may be updated in the future.</p></div>
   <div className="contactCallout"><p className="eyebrow">Secure scheduling</p><h2>Existing and prospective patients can start online.</h2><p>Create a Patient account or sign in to access the secure scheduling process. Patient accounts may require email verification, security setup, and intake completion before appointment access.</p><Link className="primaryButton" href="/register">Create Patient Account</Link></div>
  </section>
 </main><PublicFooter/></div>
}
