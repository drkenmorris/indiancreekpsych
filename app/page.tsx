const specialties = [
  {
    title: "Substance Use & Recovery",
    text: "Support for people working through alcohol or substance use concerns, relapse patterns, recovery planning, and the emotional work that supports lasting change.",
  },
  {
    title: "Trauma Therapy",
    text: "A thoughtful, paced approach to trauma, difficult life experiences, and the ways the nervous system can remain affected long after an event has passed.",
  },
  {
    title: "Marriage & Family Therapy",
    text: "Counseling for couples and families who want healthier communication, stronger connection, clearer boundaries, and practical ways to navigate conflict.",
  },
  {
    title: "Mood Disorders",
    text: "Support for depression, anxiety, emotional dysregulation, and related concerns that can affect relationships, work, sleep, motivation, and quality of life.",
  },
  {
    title: "Autism",
    text: "Respectful counseling for autistic individuals and families, with attention to communication, identity, relationships, stress, sensory needs, and day-to-day functioning.",
  },
  {
    title: "ADHD",
    text: "Practical and compassionate support for attention, organization, impulsivity, emotional regulation, relationships, and the challenges ADHD can create across adulthood and family life.",
  },
];

const futureTools = [
  "Online appointment scheduling",
  "Secure client account access",
  "Assessments and questionnaires",
  "Educational resources and events",
  "Online store and selected resources",
  "Secure access to appropriate records",
];

export default function Home() {
  return (
    <div className="icp-shell">
      <header className="icp-top-menu">
        <div className="icp-top-menu-left">
          <a className="icp-brand" href="#top" aria-label="Indian Creek Psychological Services home">
            <span className="icp-brand-mark">IC</span>
            <span className="icp-brand-copy">
              <strong>Indian Creek</strong>
              <small>Psychological Services</small>
            </span>
          </a>
        </div>
        <div className="icp-top-menu-right">
          <span className="icp-top-tagline">Counseling • Recovery • Relationships • Mental Health</span>
        </div>
      </header>

      <main className="icp-shell-center">
        <section className="hero" id="top">
          <div className="heroCopy">
            <p className="eyebrow">Counseling • Recovery • Relationships • Mental Health</p>
            <h1>Care that meets you where you are and helps you move forward.</h1>
            <p className="heroText">
              Indian Creek Psychological Services provides professional counseling for individuals,
              couples, and families, with focused expertise in substance use and recovery, trauma,
              relationship concerns, mood disorders, autism, and ADHD.
            </p>
            <div className="heroActions">
              <a className="primaryButton" href="#contact">Request information</a>
              <a className="secondaryButton" href="#services">Explore services</a>
            </div>
            <p className="microcopy">
              This website is informational and is not intended for emergency or crisis care.
            </p>
          </div>
          <div className="heroPanel" aria-label="Practice focus areas">
            <div className="heroPanelInner">
              <span className="quietLabel">Focused care for</span>
              <ul>
                <li>Recovery and substance use concerns</li>
                <li>Trauma and difficult life experiences</li>
                <li>Couples and family relationships</li>
                <li>Depression, anxiety, and mood concerns</li>
                <li>Autism and ADHD</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="trustStrip" aria-label="Practice values">
          <div><strong>Respectful</strong><span>Care centered on the whole person</span></div>
          <div><strong>Practical</strong><span>Tools that translate into daily life</span></div>
          <div><strong>Collaborative</strong><span>Treatment built with you, not around you</span></div>
        </section>

        <section className="section" id="services">
          <div className="sectionHeading">
            <p className="eyebrow">Areas of focus</p>
            <h2>Specialized support for complex, real-life concerns.</h2>
            <p>
              Counseling is individualized to the person, relationship, or family rather than reduced
              to a diagnosis. These are some of the primary areas around which treatment may be organized.
            </p>
          </div>
          <div className="cardGrid">
            {specialties.map((item) => (
              <article className="serviceCard" key={item.title}>
                <div className="cardAccent" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section splitSection" id="approach">
          <div>
            <p className="eyebrow">Our approach</p>
            <h2>Therapy should be clinically sound and genuinely human.</h2>
          </div>
          <div className="bodyCopy">
            <p>
              Effective counseling begins with understanding what is happening in the context of your
              life—not simply identifying symptoms. Work may involve insight, skill development,
              communication, behavior change, recovery support, relationship patterns, and the practical
              decisions that affect everyday functioning.
            </p>
            <p>
              The goal is to create a therapeutic process that is clear, respectful, useful, and aligned
              with the outcomes that matter to you.
            </p>
          </div>
        </section>

        <section className="futureSection" id="resources">
          <div>
            <p className="eyebrow">Coming to the site</p>
            <h2>A growing digital home for care and resources.</h2>
            <p>
              The first version of IndianCreekPsych.com is designed to expand into a secure client
              experience as additional services are brought online.
            </p>
          </div>
          <div className="futureGrid">
            {futureTools.map((tool) => <span key={tool}>{tool}</span>)}
          </div>
        </section>

        <section className="contactSection" id="contact">
          <div>
            <p className="eyebrow light">Take the next step</p>
            <h2>Looking for counseling or trying to determine whether this practice is a fit?</h2>
            <p>
              Contact information and online appointment requests can be added here as soon as you are
              ready. Until then, this page can serve as your professional public presence.
            </p>
          </div>
          <div className="contactCard">
            <strong>Indian Creek Psychological Services</strong>
            <p>General counseling and specialized behavioral health services.</p>
            <p className="placeholder">Phone, email, office location, and scheduling link can be added next.</p>
          </div>
        </section>

        <footer className="contentFooter">
          <div>
            <strong>Indian Creek Psychological Services</strong>
            <span>Professional counseling and behavioral health services</span>
          </div>
          <p className="legal">
            If you are experiencing an emergency or are in immediate danger, call 911 or go to the nearest
            emergency department. In the United States, you can also call or text 988 for the Suicide & Crisis Lifeline.
          </p>
        </footer>
      </main>

      <nav className="icp-bottom-menu" aria-label="Primary site navigation">
        <a href="#top">Home</a>
        <a href="#services">Services</a>
        <a href="#approach">Approach</a>
        <a href="#resources">Resources</a>
        <a href="#contact">Contact</a>
        <a href="#top" aria-label="Client login coming soon">Login</a>
      </nav>
    </div>
  );
}
