import Link from "next/link";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

export default function AboutPage() {
 return <div className="publicSite">
  <PublicHeader/>
  <main>
   <section className="aboutSupport aboutPracticeIntroduction" aria-labelledby="about-practice-heading">
    <img
     className="aboutPracticePhoto"
     src="/images/service-individual-therapy.webp"
     alt="Indian Creek Psychological Services therapy portrait"
    />
    <div className="aboutPracticeCopy">
     <h1 id="about-practice-heading">What we&apos;re about</h1>
     <h2>We strive to provide you with a space that supports real change and where care feels both professional and human.</h2>
     <p>We provide a warm, confidential, and nonjudgmental environment where you can feel safe exploring challenges, building on strengths, and creating a healthier, more fulfilling life.</p>
     <p>Our approach integrates evidence-informed practices with genuine care, helping you move toward meaningful and lasting change.</p>
     <div className="aboutPracticeActions">
      <Link className="primaryButton" href="/meet-the-therapist">Meet Dr. Ken Morris</Link>
      <Link className="secondaryButton" href="/specialties">Our Specialties</Link>
     </div>
    </div>
   </section>
   <section className="homePillars"><article><span>♡</span><h2>Client-Centered</h2><p>Your goals guide our work.</p></article><article><span>✓</span><h2>Evidence-Informed</h2><p>Proven methods for real results.</p></article><article><span>✦</span><h2>Inclusive & Respectful</h2><p>Individualized care for the whole person.</p></article></section>
  </main><PublicFooter/>
 </div>
}
