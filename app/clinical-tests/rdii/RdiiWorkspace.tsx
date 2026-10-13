"use client";
import { useState } from "react";
import ClinicalStageMenu from "../ClinicalStageMenu";
import DevRDII from "@/lib/clinical-tests/legacy/src/dev/DevRDII";
import DevRDIIWithReport from "@/lib/clinical-tests/legacy/src/dev/DevRDII_withReport";
import RDIIResultsPage from "@/lib/clinical-tests/legacy/src/assessments/rdii/UI/RDIIResultsPage";
type Tab="test"|"results"|"report";
export default function RdiiWorkspace(){
 const [tab,setTab]=useState<Tab>("test");
 return <section><ClinicalStageMenu label="RDII test stages" stages={[
  {key:"test",label:"Questionnaire"},{key:"results",label:"Results"},
  {key:"report",label:"Narrative report / development"}
 ]} activeKey={tab} onSelect={key=>setTab(key as Tab)}/>
 {tab==="test"&&<DevRDII/>}
 {tab==="results"&&<RDIIResultsPage/>}
 {tab==="report"&&<DevRDIIWithReport/>}
 </section>;
}
