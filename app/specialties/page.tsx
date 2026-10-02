import Link from "next/link";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

const specialties = [
 {title:"Anxiety",text:"Find relief, build coping skills, and regain a sense of calm.",href:"/specialties/anxiety",image:"/images/service-individual-therapy.webp",position:"center"},
 {title:"Depression & Mood Disorders",text:"Move toward greater hope, motivation, stability, and well-being.",href:"/specialties/depression",image:"/images/service-individual-therapy.webp",position:"center"},
 {title:"Trauma & PTSD",text:"Careful, paced trauma treatment focused on safety and recovery.",href:"/specialties/trauma-ptsd",image:"/images/service-individual-therapy.webp",position:"center"},
 {title:"Substance Use & Recovery",text:"Support for recovery, relapse prevention, and sustainable change.",href:"/specialties/substance-use-recovery",image:"/images/service-individual-therapy.webp",position:"center"},
 {title:"ADHD",text:"Practical support for attention, organization, time, emotion, and follow-through.",href:"/specialties/adhd",image:"/images/service-child-family-therapy.webp",position:"center"},
 {title:"Autism",text:"Respectful, neurodiversity-informed counseling for autistic people and families.",href:"/specialties/autism",image:"/images/service-child-family-therapy.webp",position:"center"},
 {title:"Relationship Issues",text:"Improve communication, boundaries, connection, and conflict repair.",href:"/specialties/relationship-issues",image:"/images/service-couples-therapy.webp",position:"center"},
 {title:"Stress Management",text:"Develop practical tools for a healthier, more balanced life.",href:"/specialties/stress-management",image:"/images/service-individual-therapy.webp",position:"center"},
 {title:"Life Transitions",text:"Navigate change, loss, role shifts, and uncertainty with clarity and confidence.",href:"/specialties/life-transitions",image:"/images/service-individual-therapy.webp",position:"center"},
];

export default function SpecialtiesPage(){
 return <div className="publicSite"><PublicHeader/><main>
  <section className="mockHero specialtiesMockHero">
   <div className="heroScrim compact"><p className="eyebrow">Focused expertise</p><h1>Areas of Specialization</h1><p>These pages describe the kinds of concerns, diagnoses, and life challenges in which our practice has focused clinical experience.</p></div>
  </section>
  <section className="specialtyCatalog">
   <div className="specialtyCatalogGrid">{specialties.map(({title,text,href,image,position},i)=><Link className="specialtyTile" href={href} key={title}><div className="specialtyTileImage" style={{backgroundImage:`linear-gradient(180deg,rgba(8,41,67,.02),rgba(8,41,67,.12)),url("${image}")`,backgroundPosition:position}}/><div className="specialtyTileBody"><span>{String(i+1).padStart(2,"0")}</span><h2>{title}</h2><p>{text}</p><b>Learn More →</b></div></Link>)}</div>
  </section>
 </main><PublicFooter/></div>
}