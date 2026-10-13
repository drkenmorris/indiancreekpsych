import Link from "next/link";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import ContactMessageComposer from "../components/ContactMessageComposer";

export default function ContactPage() {
  return (
    <div className="publicSite compactContactPage">
      <PublicHeader />
      <main className="compactContactMain">
        <section className="mockHero contactMockHero compactContactHero">
          <div className="heroScrim compact">
            <p className="eyebrow">Get in touch</p>
            <h1>We&apos;re here to help you take the next step.</h1>
            <p>Whether you have questions about our services, want to schedule an appointment, or simply want to learn more, we&apos;d be glad to help.</p>
          </div>
        </section>
        <section className="contactPageGrid compactContactGrid">
          <div className="contactDetails compactContactDetails">
            <h2>Indian Creek Psychological Services</h2>
            <p><strong>Phone</strong><a href="tel:+19133536116">913-353-6116</a></p>
            <p><strong>Address</strong><span>15022 W. 128th St., Olathe, KS 66062</span></p>
            <div className="heroActions">
              <Link className="primaryButton" href="/appointments">Schedule an Appointment</Link>
              <Link className="secondaryButton" href="/login?next=/appointments">Patient Sign In</Link>
            </div>
            <div className="contactEmail">
              <strong>Email</strong>
              <a href="mailto:drkenmorris@indiancreekpsych.com">drkenmorris@indiancreekpsych.com</a>
            </div>
          </div>
          <div className="contactCallout compactContactCallout">
            <ContactMessageComposer />
            <div className="contactSecureAccess">
              <strong>Secure patient scheduling</strong>
              <span>Create a Patient account or sign in for scheduling, security setup, and intake.</span>
              <Link href="/register">Create Patient Account →</Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
