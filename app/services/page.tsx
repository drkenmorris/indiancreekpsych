import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import ScrollingCatalog, { type ScrollingCatalogItem } from "../components/ScrollingCatalog";

const services: ScrollingCatalogItem[] = [
  { title: "Individual Therapy", text: "A safe, supportive space to explore challenges, develop new perspectives, and create lasting change.", href: "/services/individual-therapy", image: "/images/service-individual-therapy.webp" },
  { title: "Couples Therapy", text: "Strengthen communication, rebuild connection, and navigate challenges together.", href: "/services/couples-therapy", image: "/images/service-couples-therapy.webp" },
  { title: "Family Therapy", text: "Support for healthier relationships and stronger family dynamics.", href: "/services/family-therapy", image: "/images/service-child-family-therapy.webp" },
  { title: "Psychological Assessment", text: "Comprehensive, compassionate evaluation to better understand your needs.", href: "/services/psychological-assessment", image: "/images/service-individual-therapy.webp" },
  { title: "Consultation Services", text: "Professional support for individuals, families, and other providers.", href: "/services/consultation-services", image: "/images/service-consultation.webp" },
  { title: "Telehealth Services", text: "Accessible, high-quality care from the comfort of your home.", href: "/services/telehealth-services", image: "/images/service-telehealth.webp" },
  { title: "EMDR Therapy", text: "Structured trauma-focused treatment for distressing memories and PTSD symptoms.", href: "/services/emdr", image: "/images/service-trauma-anxiety-mood.webp" },
  { title: "Clinical Hypnotherapy", text: "Focused-attention therapy using imagery and therapeutic suggestion for selected goals.", href: "/services/hypnotherapy", image: "/images/service-general-counseling-alt.webp" },
  { title: "Neurofeedback Therapy", text: "Computerized EEG biofeedback using the Brain-Trainer system to support self-regulation.", href: "/services/neurofeedback", image: "/images/service-child-family-therapy.webp" },
];

export default function ServicesPage() {
  return (
    <div className="publicSite servicesImmersivePage">
      <PublicHeader />
      <main className="servicesImmersiveMain">
        <ScrollingCatalog
          title="Explore Our Services"
          description="Browse our services as they move across the screen. Select any picture or description to learn more."
          items={services}
          label="Services"
          appearance="immersive"
        />
      </main>
      <PublicFooter />
    </div>
  );
}
