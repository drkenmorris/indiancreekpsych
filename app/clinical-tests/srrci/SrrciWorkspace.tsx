"use client";
import { useState } from "react";
import SRRCIRegistrationPage from "@/lib/clinical-tests/legacy/src/features/assessments/srrci/pages/SRRCIRegistrationPage";
import SRRCIAssessmentPage from "@/lib/clinical-tests/legacy/src/features/assessments/srrci/pages/SRRCIAssessmentPage";
import SRRCIResultsPage from "@/lib/clinical-tests/legacy/src/features/assessments/srrci/pages/SRRCIResultsPage";
type Tab = "register" | "assess" | "results";
export default function SrrciWorkspace() {
 const [tab,setTab] = useState<Tab>("register");
 return <section>
  <nav aria-label="SRRCI stages" style={{display:"flex",gap:8,marginBottom:20}}>
   {([["register","Registration"],["assess","Assessment"],["results","Scoring and results"]] as const)
    .map(([k,label])=><button key={k} type="button" onClick={()=>setTab(k)} aria-pressed={tab===k}
     style={{padding:"8px 12px",border:"1px solid #94a3b8",borderRadius:8,background:tab===k?"#dbeafe":"#fff"}}>{label}</button>)}
  </nav>
  {tab==="register" && <SRRCIRegistrationPage onRegistrationComplete={()=>setTab("assess")} />}
  {tab==="assess" && <SRRCIAssessmentPage onAssessmentComplete={()=>setTab("results")} />}
  {tab==="results" && <SRRCIResultsPage />}
 </section>;
}
