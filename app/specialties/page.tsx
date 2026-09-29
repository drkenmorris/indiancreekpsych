import Image from "next/image";
import Link from "next/link";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

const specialties = [
 ["Anxiety","Find relief, build coping skills, and regain a sense of calm.","/specialties/anxiety"],
 ["Depression & Mood Disorders","Move toward greater hope, motivation, stability, and well-being.","/specialties/depression"],
 ["Trauma & PTSD","Careful, paced trauma treatment focused on safety and recovery.","/specialties/trauma-ptsd"],
 ["Substance Use & Recovery","Support for recovery, relapse prevention, and sustainable change.","/specialties/substance-use-recovery"],
 ["ADHD","Practical support for attention, organization, time, emotion, and follow-through.","/specialties/adhd"],
 ["Autism","Respectful, neurodiversity-informed counseling for autistic people and families.","/specialties/autism"],
 ["Relationship Issues","Improve communication, boundaries, connection, and conflict repair.","/specialties/relationship-issues"],
 ["Stress Management","Develop practical tools for a healthier, more balanced life.","/specialties/stress-management"],
 ["Life Transitions","Navigate change, loss, role shifts, and uncertainty with clarity and confidence.","/specialties/life-transitions"],
];

export default function SpecialtiesPage(){
 return <div className="publicSite"><PublicHeader/><main>
  <section className="mockHero specialtiesMockHero">
   <Image className="heroLogoOverlay" src="/images/indian-creek-logo.webp" alt="Indian Creek Psychological Services" width={620} height={240} priority />
   <div className="heroScrim compact"><p className="eyebrow">Focused expertise</p><h1>Areas of Specialization</h1><p>These pages describe the kinds of concerns, diagnoses, and life challenges in which our practice has focused clinical experience.</p></div>
  </section>
  <section className="specialtyCatalog">
   <div className="specialtyCatalogGrid">{specialties.map(([title,text,href],i)=><Link className="specialtyTile" href={href} key={title}><span>{String(i+1).padStart(2,"0")}</span><h2>{title}</h2><p>{text}</p><b>Learn More →</b></Link>)}</div>
  </section>
 </main><PublicFooter/></div>
}
