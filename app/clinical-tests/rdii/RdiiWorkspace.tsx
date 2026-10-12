"use client";
import { useState } from "react";
import DevRDII from "@/lib/clinical-tests/legacy/src/dev/DevRDII";
import DevRDIIWithReport from "@/lib/clinical-tests/legacy/src/dev/DevRDII_withReport";
import RDIIResultsPage from "@/lib/clinical-tests/legacy/src/assessments/rdii/UI/RDIIResultsPage";
type Tab="test"|"results"|"report";
export default function RdiiWorkspace(){
 const [tab,setTab]=useState<Tab>("test");
 return <section><nav aria-label="RDII pages" style={{display:"flex",gap:8}}>
  {([["test","Questionnaire"],["results","Results"],["report","Narrative report / development"]] as const)
  .map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{label}</button>)}
 </nav>
 {tab==="test"&&<DevRDII/>}
 {tab==="results"&&<RDIIResultsPage/>}
 {tab==="report"&&<DevRDIIWithReport/>}
 </section>;
}
