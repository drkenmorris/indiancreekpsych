"use client";
import { useState } from "react";
import ClinicalStageMenu from "../ClinicalStageMenu";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import RtafiIntakePage from "@/lib/clinical-tests/legacy/src/features/psychometrics/rtafi/pages/RtafiIntakePage";
import RtafiHouseholdSetupPage from "@/lib/clinical-tests/legacy/src/features/psychometrics/rtafi/pages/RtafiHouseholdSetupPage";
import RtafiAssessmentPage from "@/lib/clinical-tests/legacy/src/features/psychometrics/rtafi/pages/RtafiAssessmentPage";
import RtafiResultsPage from "@/lib/clinical-tests/legacy/src/features/psychometrics/rtafi/pages/RtafiResultsPage";
import type { RtafiAssessmentResult } from "@/lib/clinical-tests/legacy/src/features/psychometrics/rtafi/types/rtafiTypes";
type Tab="intake"|"setup"|"assessment"|"results";
export default function RtafiWorkspace() {
 const [tab,setTab]=useState<Tab>("intake");
 const raw=clinicalSessionStore.getItem("rtafi-last-result");
 let result: RtafiAssessmentResult | null = null;
 try {result=raw?JSON.parse(raw) as RtafiAssessmentResult:null;}catch{result=null;}
 return <section>
  <ClinicalStageMenu label="RTAFI test stages" stages={[
    {key:"intake",label:"Intake"},{key:"setup",label:"Household setup"},
    {key:"assessment",label:"Assessment"},{key:"results",label:"Results"}
  ]} activeKey={tab} onSelect={key=>setTab(key as Tab)}/>
  {tab==="intake"&&<RtafiIntakePage onContinue={()=>setTab("setup")}/>}
  {tab==="setup"&&<RtafiHouseholdSetupPage onContinue={()=>setTab("assessment")}/>}
  {tab==="assessment"&&<RtafiAssessmentPage onComplete={()=>setTab("results")}/>}
  {tab==="results"&&(result?<RtafiResultsPage result={result}/>:<p>No synthetic scored result yet. Complete the assessment before reviewing results.</p>)}
 </section>;
}
