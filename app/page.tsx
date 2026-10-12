import Link from "next/link";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

export default function Home() {
  return (
    <div className="publicSite">
      <PublicHeader />
      <main>
        <section className="mockHero homeMockHero homeLandingHero">
          <img
            className="homeLandingHeroPhoto"
            src="/images/home-hero-dr-ken-mountain.webp"
            alt="Full scenic Indian Creek Psychological Services photograph featuring Dr. Ken Morris"
          />
          <div className="heroScrim homeLandingHeroCopy">
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

      </main>
      <PublicFooter />
    </div>
  );
}
