import Link from "next/link";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

export default function Home() {
  return (
    <div className="publicSite">
      <PublicHeader />
      <main>
        <section className="mockHero homeMockHero homeLandingHero">
          
          <div className="heroScrim homeLandingHeroCopy">
            <p className="eyebrow">Compassionate • Experienced • Focused on You</p>
            <h1>Welcome to Indian Creek Psychological Services where you will experience compassionate care that is focused on you.</h1>
            <p>Compassionate, evidence-informed psychological care for a more fulfilling life.</p>
            <div className="heroActions">
              <Link className="primaryButton" href="/make-an-appointment">Schedule an Appointment</Link>
              <Link className="secondaryButton" href="/services">Explore Our Services</Link>
            </div>
          </div>
        </section>

        <section className="homeIntro homeLandingIntro">
          <p className="eyebrow">Indian Creek Psychological Services</p>
          <h2>Clinical depth with genuine human connection.</h2>
          <p>We work with individuals, couples, and families facing complex real-life concerns. Care is organized around the whole person—history, relationships, strengths, symptoms, environment, and the outcomes that matter most to you.</p>
          <div className="heroActions">
            <Link className="secondaryButton" href="/about">About the Practice</Link>
            <Link className="secondaryButton" href="/meet-the-therapist">Meet Dr. Ken Morris</Link>
          </div>
        </section>

        <section className="contactBand">
          <div><p className="eyebrow light">Get in touch</p><h2>We&apos;re here to help you take the next step.</h2></div>
          <div><strong>15022 W. 128th St.</strong><span>Olathe, KS 66062</span><strong>913-636-5657</strong><Link href="/contact">Contact Indian Creek →</Link></div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
