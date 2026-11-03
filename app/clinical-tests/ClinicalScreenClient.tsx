"use client";
import {useEffect,useState,useSyncExternalStore,type ComponentType} from "react";
import Link from "next/link";
import ClarificationScreen from "./ClarificationScreen";
import StructuredEvidenceScreen from "./StructuredEvidenceScreen";
import DifferentialScreen from "./DifferentialScreen";
import TierTwoFinalReport from "./TierTwoFinalReport";
import TierOneScreen from "./TierOneScreen";
import {clinicalSessionStore} from "@/lib/clinical-tests/clinicalSessionStore";
import {activePlan} from "@/lib/clinical-tests/dsm/tier-two-progress";

const modules: Record<string, ComponentType> = {
  "level1": TierOneScreen,
  "summary": TierTwoFinalReport,
};

export default function ClinicalScreenClient({ screenKey }: { screenKey: string }) {
  const [ready,setReady]=useState(false);
  useEffect(()=>{setReady(true);},[]);
  useSyncExternalStore(clinicalSessionStore.subscribe,clinicalSessionStore.revision,()=>0);
  const plan=activePlan();
  const allowed=ready&&plan?.profile.id==='adult'&&plan.handoff.domains.some(d=>d.path===screenKey&&plan.handoff.routedDomains.includes(d.id));
  if(screenKey==="tier6")return <ClarificationScreen/>;
  if(["tier3","tier4","tier5"].includes(screenKey))return <DifferentialScreen stage={Number(screenKey.slice(-1)) as 3|4|5}/>;
  if(screenKey!=='level1'&&screenKey!=='summary'&&!allowed)return <section><h2>Start with Tier 1</h2><p>This domain is not selected by the current completed Tier 1 plan. Complete or review Tier 1 to continue with the appropriate domains. Unselected domains are not ruled out.</p><Link href="/clinical-tests/dev/level1">Open Tier 1 screening</Link></section>;
  if(screenKey.startsWith("level2/")&&plan){const d=plan.handoff.domains.find(d=>d.path===screenKey);if(d)return <StructuredEvidenceScreen key={d.id} domain={d.id}/>;}
  const Component = modules[screenKey];
  if (!Component) return <p>That module is unavailable.</p>;
  return <Component />;
}
