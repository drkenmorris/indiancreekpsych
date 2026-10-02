import Link from "next/link";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

const services = [
 ["Individual Therapy","A safe, supportive space to explore challenges, develop new perspectives, and create lasting change.","/services/individual-therapy","/images/service-individual-therapy.webp","center"],
 ["Couples Therapy","Strengthen communication, rebuild connection, and navigate challenges together.","/services/couples-therapy","/images/service-couples-therapy.webp","center"],
 ["Family Therapy","Support for healthier relationships and stronger family dynamics.","/services/family-therapy","/images/service-child-family-therapy.webp","center"],
 ["Psychological Assessment","Comprehensive, compassionate evaluation to better understand your needs.","/services/psychological-assessment","/images/service-child-family-therapy.webp","center"],
 ["Consultation Services","Professional support for individuals, families, and other providers.","/services/consultation-services","/images/service-individual-therapy.webp","center"],
 ["Telehealth Services","Accessible, high-quality care from the comfort of your home.","/services/telehealth-services","/images/service-telehealth.webp","center"],
 ["EMDR Therapy","Structured trauma-focused treatment for distressing memories and PTSD symptoms.","/services/emdr","/images/service-individual-therapy.webp","center"],
 ["Clinical Hypnotherapy","Focused-attention therapy using imagery and therapeutic suggestion for selected goals.","/services/hypnotherapy","/images/service-individual-therapy.webp","center"],
 ["Neurofeedback Therapy","Computerized EEG biofeedback using the Brain-Trainer system to support self-regulation.","/services/neurofeedback","/images/service-child-family-therapy.webp","center"],
];

export default function ServicesPage(){
 return <div className="publicSite"><PublicHeader/><main>
  <section className="mockHero servicesMockHero">
   <div className="heroScrim compact"><p className="eyebrow">Evidence-informed care</p><h1>Our Services</h1><p>Professional psychological services designed to support mental health, personal growth, relationships, recovery, and overall well-being.</p></div>
  </section>
  <section className="serviceCatalog">
   <div className="serviceCatalogGrid">{services.map(([title,text,href,image,position])=><Link className="serviceCatalogCard" href={href} key={title}><div className="serviceCardImage" style={{backgroundImage:`linear-gradient(180deg,rgba(8,41,67,.02),rgba(8,41,67,.12)),url("${image}")`,backgroundPosition:position}}/><div><h2>{title}</h2><p>{text}</p><span>Learn More →</span></div></Link>)}</div>
  </section>
 </main><PublicFooter/></div>
}