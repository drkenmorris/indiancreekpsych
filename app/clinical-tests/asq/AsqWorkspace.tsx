"use client";
import { useState } from "react";
import ClinicalStageMenu from "../ClinicalStageMenu";
import AsqPersistencePanel from "./AsqPersistencePanel";
import { SelfForm } from "@/lib/clinical-tests/legacy/src/asq/SelfForm";
import { ParentForm } from "@/lib/clinical-tests/legacy/src/asq/ParentForm";
import { TeacherForm } from "@/lib/clinical-tests/legacy/src/asq/TeacherForm";
import ResultsPage from "@/lib/clinical-tests/legacy/src/asq/ResultsPage";
import StudentRecordsPage from "@/lib/clinical-tests/legacy/src/asq/StudentRecordsPage";
import SupportPage from "@/lib/clinical-tests/legacy/src/asq/SupportPage";
import { ParentAutismAssessmentForm } from "@/lib/clinical-tests/legacy/src/assessments/autism/UI/ParentAutismAssessmentForm";

const sections = [
  ["student", "Student / Self"],
  ["parent", "Parent"],
  ["teacher", "Teacher"],
  ["results", "Combined results"],
  ["records", "Student records"],
  ["support", "Support / incidents"],
  ["autism-parent", "Legacy autism parent"]
] as const;
type Section = typeof sections[number][0];

export default function AsqWorkspace() {
  const [section, setSection] = useState<Section>("student");
  const [restoredKey, setRestoredKey] = useState(0);
  const activeIndex = sections.findIndex(([key]) => key === section);
  const moveTo = (index: number) => {
    if (index < 0 || index >= sections.length) return;
    setSection(sections[index][0]);
    document.getElementById("asq-active-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return <div style={{display:"grid",gap:20}}>
    <section aria-label="Assessment overview" style={{padding:"22px 24px",borderRadius:20,color:"#fff",background:"linear-gradient(125deg,#06332a,#0c6652 64%,#18a883)",boxShadow:"0 16px 38px rgba(4,50,41,.15)"}}>
      <p style={{fontSize:12,letterSpacing:2,textTransform:"uppercase",fontWeight:800,margin:"0 0 8px"}}>Indian Creek · Clinical Assessment Studio</p>
      <h2 style={{fontSize:"clamp(1.3rem,3vw,2rem)",margin:"0 0 8px",color:"#fff"}}>ASQ / ASEQ Autism Suite</h2>
      <p style={{margin:0,maxWidth:700,lineHeight:1.55}}>Organized student, family, and teacher assessment workspace with secure synthetic case management and clinician-facing review sections.</p>
      <p style={{margin:"12px 0 0",fontWeight:700,fontSize:13}}>Administrator QA only · Not approved for diagnosis or patient release</p>
    </section>
    <AsqPersistencePanel onRestored={()=>{setSection("student");setRestoredKey(k=>k+1);}}/>
    <div key={restoredKey}>
    <section id="asq-active-section" style={{background:"#fff",border:"1px solid #cde2d8",borderRadius:18,padding:"18px 20px",boxShadow:"0 8px 30px rgba(14,60,45,.06)"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:12}}>
      <div><p style={{margin:0,fontSize:12,color:"#336b5b",fontWeight:800,letterSpacing:1}}>SECTION {String(activeIndex+1).padStart(2,"0")} OF {sections.length}</p><h3 style={{margin:"4px 0",fontSize:"1.3rem"}}>{sections[activeIndex][1]}</h3></div>
      <span style={{borderRadius:999,padding:"7px 12px",background:"#e6f5ed",color:"#14634d",fontWeight:700,fontSize:12}}>Synthetic QA workspace</span>
    </div>
    <div aria-label="Section position" role="progressbar" aria-valuemin={1} aria-valuemax={sections.length} aria-valuenow={activeIndex+1} style={{height:7,borderRadius:999,background:"#e3eee8",overflow:"hidden",marginBottom:16}}><div style={{height:"100%",width:`${((activeIndex+1)/sections.length)*100}%`,background:"#078568",borderRadius:999}}/></div>
    <ClinicalStageMenu label="ASQ assessment sections" stages={sections.map(([key,label])=>({key,label}))}
      activeKey={section} onSelect={key=>setSection(key as Section)}/>
    {section==="student"&&<SelfForm />}
    {section==="parent"&&<ParentForm />}
    {section==="teacher"&&<TeacherForm />}
    {section==="results"&&<ResultsPage />}
    {section==="records"&&<StudentRecordsPage />}
    {section==="support"&&<SupportPage onGoToStudentRecords={()=>setSection("records")}/>}
    {section==="autism-parent"&&<ParentAutismAssessmentForm />}
    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginTop:24,paddingTop:18,borderTop:"1px solid #dbece3"}}>
      <button type="button" disabled={activeIndex===0} onClick={()=>moveTo(activeIndex-1)} style={{padding:"11px 17px",borderRadius:12,border:"1px solid #b4d4c7",background:"#f0faf5",color:"#155d48",fontWeight:700,opacity:activeIndex===0?.45:1}}>← Previous section</button>
      <button type="button" disabled={activeIndex===sections.length-1} onClick={()=>moveTo(activeIndex+1)} style={{padding:"11px 17px",borderRadius:12,border:0,background:"#08745a",color:"white",fontWeight:700,opacity:activeIndex===sections.length-1?.45:1}}>Next section →</button>
    </div>
    </section>
    </div>
  </div>;
}
