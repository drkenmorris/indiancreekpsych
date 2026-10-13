import Link from "next/link";
import { notFound } from "next/navigation";
import { patientAccess } from "@/lib/patient/access";
import CogSwitchWorkspace from "./CogSwitchWorkspace";
import ClinicalStageMenu from "../../ClinicalStageMenu";
import { cogSwitchStages } from "@/lib/clinical-tests/menu-catalog";
const allowed=["","assessment","briefing","training","results","reports","settings"];
export default async function CogSwitchPage({params}:{params:Promise<{slug?:string[]}>}){
 await patientAccess(true);
 const {slug}=await params;
 const view=(slug??[]).join("/");
 if(!allowed.includes(view))notFound();
 return <main className="authPage" style={{maxWidth:1100,margin:"auto",padding:24}}>
  <Link href="/clinical-tests">← Clinical testing library</Link><h1>Cognitive-Motor Switching Assessment</h1>
  <p role="alert">Administrator-only synthetic testing. This is a developmental module, not a validated diagnosis or patient record. No responses are stored in Supabase.</p>
  <ClinicalStageMenu label="CogSwitch functional areas" stages={cogSwitchStages} activeKey={view || "home"}/>
  <CogSwitchWorkspace view={view}/>
 </main>;
}
