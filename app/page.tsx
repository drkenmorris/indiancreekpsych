import Image from "next/image";
import Link from "next/link";
import PublicHeader from "./components/PublicHeader";
import PublicFooter from "./components/PublicFooter";

const specialtyPreview = [
  ["Anxiety","Find relief, build coping skills, and regain a sense of calm.","/specialties/anxiety"],
  ["Depression","Move toward greater hope, motivation, and well-being.","/specialties/depression"],
  ["Trauma & PTSD","Trauma-informed treatment paced to the individual.","/specialties/trauma-ptsd"],
  ["Substance Use & Recovery","Support for recovery, relapse prevention, and lasting change.","/specialties/substance-use-recovery"],
  ["ADHD","Practical support for attention, executive functioning, and emotional regulation.","/specialties/adhd"],
  ["Autism","Respectful, neurodiversity-informed counseling and family support.","/specialties/autism"],
];

export default function Home() {
  return (
    <div className="publicSite">
      <PublicHeader />
      <main>
        <section className="mockHero homeMockHero">
          <Image className="heroLogoOverlay" src="/images/indian-creek-logo.webp" alt="Indian Creek Psychological Services" width={620} height={240} priority />
          <div className="heroScrim">
            <p className="eyebrow">Compassionate • Experienced • Focused on You</p>
            <h1>A Calmer Tomorrow Starts Here.</h1>
            <p>Compassionate, evidence-informed psychological care for a more fulfilling life.</p>
            <div className="heroActions">
              <Link className="primaryButton" href="/appointments">Schedule an Appointment</Link>
              <Link className="secondaryButton" href="/services">Explore Our Services</Link>
            </div>
          </div>
        </section>

        <section className="homePillars">
          <article><span>01</span><h2>Compassionate Care</h2><p>A safe, supportive space for meaningful change.</p></article>
          <article><span>02</span><h2>Evidence-Informed Approach</h2><p>Proven methods tailored to your goals and circumstances.</p></article>
          <article><span>03</span><h2>Lasting Growth</h2><p>Tools for healthier relationships, clearer choices, and a brighter future.</p></article>
        </section>

        <section className="homeIntro">
          <p className="eyebrow">Indian Creek Psychological Services</p>
          <h2>Clinical depth with genuine human connection.</h2>
          <p>We work with individuals, couples, and families facing complex real-life concerns. Care is organized around the whole person—history, relationships, strengths, symptoms, environment, and the outcomes that matter most to you.</p>
          <div className="heroActions">
            <Link className="secondaryButton" href="/about">About the Practice</Link>
            <Link className="secondaryButton" href="/meet-the-therapist">Meet Dr. Ken Morris</Link>
          </div>
        </section>

        <section className="previewSection">
          <div className="sectionHeading">
            <p className="eyebrow">Areas of specialization</p>
            <h2>Focused expertise for life&apos;s unique challenges.</h2>
          </div>
          <div className="previewGrid">
            {specialtyPreview.map(([title,text,href]) => (
              <Link href={href} className="previewCard" key={title}>
                <h3>{title}</h3><p>{text}</p><span>Learn more →</span>
              </Link>
            ))}
          </div>
          <div className="centerAction"><Link className="primaryButton" href="/specialties">View All Specialties</Link></div>
        </section>

        <section className="appointmentAccess" id="appointments">
          <div>
            <p className="eyebrow">Patient appointment access</p>
            <h2>Request and manage appointments through your secure patient account.</h2>
            <p>New patients can create a Patient account, verify their email, complete required security setup and intake, and then use the secure appointment calendar. Returning patients can sign in and go directly to Appointments.</p>
            <div className="heroActions">
              <Link className="primaryButton" href="/appointments">Open Appointments</Link>
              <Link className="secondaryButton" href="/register">Create Patient Account</Link>
              <Link className="secondaryButton" href="/login?next=/appointments">Patient Sign In</Link>
            </div>
          </div>
          <div className="appointmentSteps">
            <article><span>1</span><h3>Create or sign in</h3><p>Select Patient when registering, or sign in to your existing account.</p></article>
            <article><span>2</span><h3>Complete secure setup</h3><p>Verify your email and complete required security and intake steps.</p></article>
            <article><span>3</span><h3>Choose an appointment</h3><p>Use the secure appointment area to view available times and manage visits.</p></article>
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
