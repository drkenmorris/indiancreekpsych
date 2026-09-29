import Image from "next/image";
import Link from "next/link";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

export default function MeetTheTherapistPage() {
  return (
    <div className="publicSite">
      <PublicHeader />
      <main>
        <section className="mockHero aboutMockHero">
          <Image className="heroLogoOverlay" src="/images/indian-creek-logo.webp" alt="Indian Creek Psychological Services" width={620} height={240} priority />
          <div className="heroScrim">
            <p className="eyebrow">Meet the therapist</p>
            <h1>Welcome to Indian Creek Psychological Services.</h1>
            <p>I&apos;m Dr. Ken Morris. My aim is to offer counseling that is clinically serious, personally respectful, and useful in the real circumstances of your life.</p>
            <div className="heroActions">
              <Link className="primaryButton" href="/appointments">Schedule an Appointment</Link>
              <Link className="secondaryButton" href="/specialties">Explore Specialties</Link>
            </div>
          </div>
        </section>

        <section className="aboutSupport">
          <div className="aboutPhoto" role="img" aria-label="Warm counseling office" />
          <div>
            <p className="eyebrow">A thoughtful place to begin</p>
            <h2>Therapy should help you understand what is happening—and give you a practical way forward.</h2>
            <p>People rarely arrive in therapy with one neatly defined problem. Stress can affect relationships. Trauma can shape mood and decision-making. ADHD or autism can change how someone experiences expectations, communication, and daily demands. Substance use may become part of a larger effort to cope.</p>
            <p>My approach is built around careful assessment, clear communication, and treatment that reflects the whole person rather than reducing someone to a diagnosis.</p>
          </div>
        </section>

        <section className="homePillars">
          <article><span>01</span><h2>Clinical Depth</h2><p>Complex concerns deserve more than generic advice.</p></article>
          <article><span>02</span><h2>Respect for the Person</h2><p>Your values, preferences, pace, and goals matter throughout treatment.</p></article>
          <article><span>03</span><h2>Practical Change</h2><p>Insight should translate into healthier decisions, stronger relationships, and improved functioning.</p></article>
        </section>

        <section className="detailNote">
          <h2>You do not need to have everything figured out before you begin.</h2>
          <p>Sometimes the first useful step is a serious conversation about what is happening, what has already been tried, what is getting in the way, and what you want to be different.</p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
