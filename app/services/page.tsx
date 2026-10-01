import Link from "next/link";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

const goldPortrait = "/images/dr-ken-gold-site.webp";
const redPortrait = "/images/dr-ken-red-site.webp";

const services = [
 {title:"Individual Therapy",text:"A safe, supportive space to explore challenges, develop new perspectives, and create lasting change.",href:"/services/individual-therapy",image:goldPortrait,position:"68% center"},
 {title:"Couples Therapy",text:"Strengthen communication, rebuild connection, and navigate challenges together.",href:"/services/couples-therapy",image:redPortrait,position:"68% center"},
 {title:"Family Therapy",text:"Support for healthier relationships and stronger family dynamics.",href:"/services/family-therapy",image:goldPortrait,position:"66% center"},
 {title:"Psychological Assessment",text:"Comprehensive, compassionate evaluation to better understand your needs.",href:"/services/psychological-assessment",image:"/images/autism.png",position:"center"},
 {title:"Consultation Services",text:"Professional support for individuals, families, and other providers.",href:"/services/consultation-services",image:redPortrait,position:"70% center"},
 {title:"Telehealth Services",text:"Accessible, high-quality care from the comfort of your home.",href:"/services/telehealth-services",image:goldPortrait,position:"70% center"},
 {title:"EMDR Therapy",text:"Structured trauma-focused treatment for distressing memories and PTSD symptoms.",href:"/services/emdr",image:"/images/trauma-therapy.png",position:"center"},
 {title:"Clinical Hypnotherapy",text:"Focused-attention therapy using imagery and therapeutic suggestion for selected goals.",href:"/services/hypnotherapy",image:redPortrait,position:"68% center"},
 {title:"Neurofeedback Therapy",text:"Computerized EEG biofeedback using the Brain-Trainer system to support self-regulation.",href:"/services/neurofeedback",image:"/images/adhd.png",position:"center"},
];

export default function ServicesPage(){
 return <div className="publicSite"><PublicHeader/><main>
  <section className="mockHero servicesMockHero">
   
   <div className="heroScrim compact"><p className="eyebrow">Evidence-informed care</p><h1>Our Services</h1><p>Professional psychological services designed to support mental health, personal growth, relationships, recovery, and overall well-being.</p></div>
  </section>
  <section className="serviceCatalog">
   <div className="serviceCatalogGrid">{services.map(({title,text,href,image,position})=><Link className="serviceCatalogCard" href={href} key={title}><div className="serviceCardImage" style={{backgroundImage:`linear-gradient(180deg,rgba(8,41,67,.02),rgba(8,41,67,.12)),url("${image}")`,backgroundPosition:position}}/><div><h2>{title}</h2><p>{text}</p><span>Learn More →</span></div></Link>)}</div>
  </section>
 </main><PublicFooter/></div>
}
