"use client";
import { useState } from "react";
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
  return <div>
    <nav aria-label="ASQ test pages" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
      {sections.map(([key,label])=><button key={key} type="button" onClick={()=>setSection(key)}
        aria-pressed={section===key} style={{padding:"8px 12px",borderRadius:8,background:section===key?"#dbeafe":"#f8fafc",border:"1px solid #94a3b8"}}>
        {label}
      </button>)}
    </nav>
    {section==="student"&&<SelfForm />}
    {section==="parent"&&<ParentForm />}
    {section==="teacher"&&<TeacherForm />}
    {section==="results"&&<ResultsPage />}
    {section==="records"&&<StudentRecordsPage />}
    {section==="support"&&<SupportPage onGoToStudentRecords={()=>setSection("records")}/>}
    {section==="autism-parent"&&<ParentAutismAssessmentForm />}
  </div>;
}
