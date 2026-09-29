import Image from "next/image";
import Link from "next/link";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

export default function AboutPage() {
 return <div className="publicSite">
  <PublicHeader/>
  <main>
   <section className="mockHero aboutMockHero">
    <Image className="heroLogoOverlay" src="/images/indian-creek-logo.webp" alt="Indian Creek Psychological Services" width={620} height={240} priority />
    <div className="heroScrim"><p className="eyebrow">Compassionate • Experienced • Focused on You</p><h1>About Indian Creek</h1><p>Our practice is rooted in compassion, clinical expertise, and a deep respect for each person&apos;s unique journey.</p></div>
   </section>
   <section className="aboutSupport">
    <div className="aboutPhoto" role="img" aria-label="Warm counseling office"/>
    <div><p className="eyebrow">A supportive space for real change</p><h2>Care should feel both professional and human.</h2><p>We provide a warm, confidential, and nonjudgmental environment where you can feel safe exploring challenges, building on strengths, and creating a healthier, more fulfilling life.</p><p>Our approach integrates evidence-informed practices with genuine care, helping you move toward meaningful and lasting change.</p><Link className="primaryButton" href="/meet-the-therapist">Meet Dr. Ken Morris</Link></div>
   </section>
   <section className="homePillars"><article><span>♡</span><h2>Client-Centered</h2><p>Your goals guide our work.</p></article><article><span>✓</span><h2>Evidence-Informed</h2><p>Proven methods for real results.</p></article><article><span>✦</span><h2>Inclusive & Respectful</h2><p>Individualized care for the whole person.</p></article></section>
  </main><PublicFooter/>
 </div>
}
