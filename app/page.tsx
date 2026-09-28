const specialties = [
  {
    title: "Substance Use & Recovery",
    text: "Support for people working through alcohol or substance use concerns, relapse patterns, recovery planning, and the emotional work that supports lasting change.",
    href: "/services/substance-use-recovery",
  },
  {
    title: "Trauma Therapy",
    text: "A thoughtful, paced approach to trauma, difficult life experiences, and the ways the nervous system can remain affected long after an event has passed.",
    href: "/services/trauma-therapy",
  },
  {
    title: "Marriage & Family Therapy",
    text: "Counseling for couples and families who want healthier communication, stronger connection, clearer boundaries, and practical ways to navigate conflict.",
    href: "/services/marriage-family-therapy",
  },
  {
    title: "Mood Disorders",
    text: "Support for depression, anxiety, emotional dysregulation, and related concerns that can affect relationships, work, sleep, motivation, and quality of life.",
    href: "/services/mood-disorders",
  },
  {
    title: "Autism",
    text: "Respectful counseling for autistic individuals and families, with attention to communication, identity, relationships, stress, sensory needs, and day-to-day functioning.",
    href: "/services/autism",
  },
  {
    title: "EMDR Therapy",
    text: "Structured trauma-focused treatment designed to help reduce the emotional intensity and present-day impact of distressing memories and PTSD symptoms.",
    href: "/services/emdr",
  },
  {
    title: "Clinical Hypnotherapy",
    text: "Focused-attention therapy using imagery and therapeutic suggestion to support selected goals such as pain management, anxiety reduction, stress, and behavior change.",
    href: "/services/hypnotherapy",
  },
  {
    title: "Neurofeedback Therapy",
    text: "Computerized EEG biofeedback using the Brain-Trainer system to provide real-time feedback while the brain practices patterns of attention, arousal, and self-regulation.",
    href: "/services/neurofeedback",
  },
  {
    title: "ADHD",
    text: "Practical and compassionate support for attention, organization, impulsivity, emotional regulation, relationships, and the challenges ADHD can create across adulthood and family life.",
    href: "/services/adhd",
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
            <img className="icp-brand-logo" src="/images/indian-creek-logo.webp" alt="Indian Creek Psychological Services" />
          </a>
        </div>
        <div className="icp-top-menu-right">
          <span className="icp-top-tagline">Counseling • Recovery • Relationships • Mental Health</span>
        </div>
      </header>

      <main className="icp-shell-center">
        <section className="hero heroScenic" id="top">
          <div className="heroCopy">
            <p className="eyebrow">Compassionate • Experienced • Focused on You</p>
            <h1>A Calmer Tomorrow Starts Here.</h1>
            <p className="heroText">
              Indian Creek Psychological Services provides professional counseling for individuals,
              couples, and families, with focused expertise in substance use and recovery, trauma,
              relationship concerns, mood disorders, autism, and ADHD.
            </p>
            <div className="heroActions">
              <a className="primaryButton" href="/appointments">Schedule an Appointment</a>
              <a className="secondaryButton" href="#services">Explore services</a>
              <a className="secondaryButton" href="/meet-the-therapist">Meet the therapist</a>
            </div>
            <p className="microcopy">
              This website is informational and is not intended for emergency or crisis care.
            </p>
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
              <a className="serviceCard serviceCardLink" href={item.href} key={item.title}>
                <div className="cardAccent" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="serviceCardCta">Learn more →</span>
              </a>
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

        <section className="appointmentAccess" id="appointments">
          <div className="appointmentAccessIntro">
            <p className="eyebrow">Patient appointment access</p>
            <h2>Request and manage appointments through your secure patient account.</h2>
            <p>
              New patients can create a Patient account, verify their email, complete the required
              security setup and intake questionnaire, and then use the secure appointment calendar.
              Returning patients can sign in and go directly to Appointments.
            </p>
            <div className="heroActions">
              <a className="primaryButton" href="/appointments">Open Appointments</a>
              <a className="secondaryButton" href="/register">Create Patient Account</a>
              <a className="secondaryButton" href="/login?next=/appointments">Patient Sign In</a>
            </div>
          </div>
          <div className="appointmentSteps" aria-label="How to access appointments">
            <div><span>1</span><strong>Create or sign in</strong><p>Select Patient when registering, or sign in to your existing account.</p></div>
            <div><span>2</span><strong>Complete secure setup</strong><p>Verify your email and complete any required account-security and intake steps.</p></div>
            <div><span>3</span><strong>Choose an appointment</strong><p>Open the secure appointment area to see available times and manage scheduled visits.</p></div>
          </div>
        </section>

        <section className="contactSection" id="contact">
          <div>
            <p className="eyebrow light">Take the next step</p>
            <h2>Looking for counseling or trying to determine whether this practice is a fit?</h2>
            <p>
              You can use the secure patient portal to request or manage appointments. If you are
              deciding whether the practice is a fit, explore the specialty pages or create a patient
              account to begin the intake and scheduling process.
            </p>
          </div>
          <div className="contactCard">
            <strong>Indian Creek Psychological Services</strong>
            <p>General counseling and specialized behavioral health services.</p>
            <p><a className="contactAppointmentLink" href="/appointments">Open secure appointment scheduling →</a></p>
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
        <a href="/meet-the-therapist">Meet the Therapist</a>
        <a href="#appointments">Appointments</a>
        <a href="#contact">Contact</a>
        <a href="/appointments">Schedule</a>
        <a href="/login">Login</a>
        <a href="/register">Register</a>
      </nav>
    </div>
  );
}
