"use client";
import { useState } from "react";
import ClinicalStageMenu from "../ClinicalStageMenu";
import SRRCIRegistrationPage from "@/lib/clinical-tests/legacy/src/features/assessments/srrci/pages/SRRCIRegistrationPage";
import SRRCIAssessmentPage from "@/lib/clinical-tests/legacy/src/features/assessments/srrci/pages/SRRCIAssessmentPage";
import SRRCIResultsPage from "@/lib/clinical-tests/legacy/src/features/assessments/srrci/pages/SRRCIResultsPage";
type Tab = "register" | "assess" | "results";
export default function SrrciWorkspace() {
 const [tab,setTab] = useState<Tab>("register");
 return <section>
  <ClinicalStageMenu label="SRRCI test stages" stages={[
    {key:"register",label:"Registration"},{key:"assess",label:"Assessment"},{key:"results",label:"Scoring and results"}
  ]} activeKey={tab} onSelect={key=>setTab(key as Tab)}/>
  {tab==="register" && <SRRCIRegistrationPage onRegistrationComplete={()=>setTab("assess")} />}
  {tab==="assess" && <SRRCIAssessmentPage onAssessmentComplete={()=>setTab("results")} />}
  {tab==="results" && <SRRCIResultsPage />}
 </section>;
}
