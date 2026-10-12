import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import ScrollingCatalog, { type ScrollingCatalogItem } from "../components/ScrollingCatalog";

const specialties: ScrollingCatalogItem[] = [
  { title: "Anxiety", text: "Find relief, build coping skills, and regain a sense of calm.", href: "/specialties/anxiety", image: "/images/service-trauma-anxiety-mood.webp" },
  { title: "Depression & Mood Disorders", text: "Move toward greater hope, motivation, stability, and well-being.", href: "/specialties/depression", image: "/images/service-trauma-anxiety-mood.webp" },
  { title: "Trauma & PTSD", text: "Careful, paced trauma treatment focused on safety and recovery.", href: "/specialties/trauma-ptsd", image: "/images/service-trauma-anxiety-mood.webp" },
  { title: "Substance Use & Recovery", text: "Support for recovery, relapse prevention, and sustainable change.", href: "/specialties/substance-use-recovery", image: "/images/service-support-group.webp" },
  { title: "ADHD", text: "Practical support for attention, organization, time, emotion, and follow-through.", href: "/specialties/adhd", image: "/images/service-child-family-therapy.webp" },
  { title: "Autism", text: "Respectful, neurodiversity-informed counseling for autistic people and families.", href: "/specialties/autism", image: "/images/service-child-family-therapy.webp" },
  { title: "Relationship Issues", text: "Improve communication, boundaries, connection, and conflict repair.", href: "/specialties/relationship-issues", image: "/images/service-couples-therapy.webp" },
  { title: "Stress Management", text: "Develop practical tools for a healthier, more balanced life.", href: "/specialties/stress-management", image: "/images/service-general-counseling-alt.webp" },
  { title: "Life Transitions", text: "Navigate change, loss, role shifts, and uncertainty with clarity and confidence.", href: "/specialties/life-transitions", image: "/images/service-general-counseling-alt.webp" },
];

export default function SpecialtiesPage() {
  return (
    <div className="publicSite">
      <PublicHeader />
      <main>
        <section className="mockHero specialtiesMockHero">
          <div className="heroScrim compact">
            <p className="eyebrow">Focused expertise</p>
            <h1>Areas of Specialization</h1>
            <p>These pages describe the kinds of concerns, diagnoses, and life challenges in which our practice has focused clinical experience.</p>
          </div>
        </section>
        <ScrollingCatalog
          title="Explore Our Specialties"
          description="Browse the specialties as they move across the screen. Select any picture or description to learn more."
          items={specialties}
          label="Specialties"
        />
      </main>
      <PublicFooter />
    </div>
  );
}
