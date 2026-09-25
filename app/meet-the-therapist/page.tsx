import Link from "next/link";

export default function MeetTheTherapistPage() {
  return (
    <div className="icp-shell">
      <header className="icp-top-menu">
        <div className="icp-top-menu-left">
          <Link className="icp-brand" href="/" aria-label="Indian Creek Psychological Services home">
            <span className="icp-brand-mark">IC</span>
            <span className="icp-brand-copy">
              <strong>Indian Creek</strong>
              <small>Psychological Services</small>
            </span>
          </Link>
        </div>
        <div className="icp-top-menu-right">
          <span className="icp-top-tagline">Welcome • Clinical depth • Human connection</span>
        </div>
      </header>

      <main className="icp-shell-center therapistPage">
        <section className="therapistHero">
          <div className="therapistHeroCopy">
            <p className="eyebrow">Meet the therapist</p>
            <h1>Welcome to Indian Creek Psychological Services.</h1>
            <p className="therapistLead">
              I&apos;m Dr. Ken Morris. My aim is to offer counseling that is clinically serious,
              personally respectful, and useful in the real circumstances of your life.
            </p>
            <p>
              People rarely arrive in therapy with only one neatly defined problem. Stress can affect
              relationships. Trauma can shape mood and decision-making. ADHD or autism can change how
              someone experiences expectations, communication, and daily demands. Substance use may
              become part of a larger effort to cope. Effective care begins by understanding how those
              pieces fit together for the individual person, couple, or family.
            </p>
            <div className="heroActions">
              <Link className="primaryButton" href="/#contact">Start a conversation</Link>
              <Link className="secondaryButton" href="/#services">Explore specialties</Link>
            </div>
          </div>

          <aside className="therapistPhotoFrame" aria-label="Therapist photograph placeholder">
            <div
              className="therapistPhotoPlaceholder"
              style={{ backgroundImage: 'linear-gradient(180deg, rgba(15,42,36,.02), rgba(15,42,36,.24)), url("/images/therapist-placeholder.png")' }}
            >
              <div className="therapistPhotoLabel">
                <span>Photo placement reserved for Dr. Ken Morris</span>
                <small>The current visual is a design placeholder and is not represented as Dr. Morris.</small>
              </div>
            </div>
          </aside>
        </section>

        <section className="therapistIntro">
          <div>
            <p className="eyebrow">A thoughtful place to begin</p>
            <h2>Therapy should help you understand what is happening—and give you a practical way forward.</h2>
          </div>
          <div className="bodyCopy">
            <p>
              My approach is built around careful assessment, clear communication, and treatment that
              reflects the whole person rather than reducing someone to a diagnosis. That means paying
              attention to symptoms, history, relationships, strengths, environment, goals, and the
              practical realities that can either support change or make it harder.
            </p>
            <p>
              The therapeutic relationship should be collaborative. You should understand what we are
              working on, why it matters, and how the work connects to the outcomes that are important
              to you.
            </p>
          </div>
        </section>

        <section className="therapistPrinciples">
          <article>
            <span>01</span>
            <h2>Clinical depth</h2>
            <p>
              Complex concerns deserve more than generic advice. Treatment is organized around the
              patterns, risks, strengths, relationships, and co-occurring concerns that shape your
              actual experience.
            </p>
          </article>
          <article>
            <span>02</span>
            <h2>Respect for the person</h2>
            <p>
              Therapy works best when people are treated as active participants in their own care.
              Your preferences, values, pace, and goals matter throughout the process.
            </p>
          </article>
          <article>
            <span>03</span>
            <h2>Practical change</h2>
            <p>
              Insight is valuable, but it should translate into daily life: healthier decisions,
              stronger relationships, more effective coping, clearer boundaries, and improved
              functioning.
            </p>
          </article>
        </section>

        <section className="therapistWelcome">
          <div>
            <p className="eyebrow light">A personal welcome</p>
            <h2>You do not need to have everything figured out before you begin.</h2>
          </div>
          <div>
            <p>
              Sometimes the first useful step is simply having a serious conversation about what is
              happening, what has already been tried, what is getting in the way, and what you want to
              be different. From there, we can determine whether Indian Creek Psychological Services
              is the right fit and what a thoughtful next step might look like.
            </p>
            <p>
              Additional professional biography, education, licensure, areas of advanced training,
              and practice history can be added here once the exact wording you want published is
              available. I have intentionally left those details unfilled rather than inventing them.
            </p>
          </div>
        </section>

        <footer className="contentFooter">
          <div>
            <strong>Indian Creek Psychological Services</strong>
            <span>Professional counseling and behavioral health services</span>
          </div>
          <p className="legal">
            This website provides general information and does not establish a therapist-client
            relationship. If you are experiencing an emergency or are in immediate danger, call 911
            or go to the nearest emergency department. In the United States, you can also call or
            text 988 for the Suicide & Crisis Lifeline.
          </p>
        </footer>
      </main>

      <nav className="icp-bottom-menu" aria-label="Primary site navigation">
        <Link href="/">Home</Link>
        <Link href="/#services">Services</Link>
        <Link href="/meet-the-therapist">Meet the Therapist</Link>
        <Link href="/#approach">Approach</Link>
        <Link href="/#contact">Contact</Link>
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
      </nav>
    </div>
  );
}
