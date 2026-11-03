"use client";
import {useEffect,useState,useSyncExternalStore,type ComponentType} from "react";
import Link from "next/link";
import TierTwoFinalReport from "./TierTwoFinalReport";
import TierOneScreen from "./TierOneScreen";
import {clinicalSessionStore} from "@/lib/clinical-tests/clinicalSessionStore";
import {activePlan} from "@/lib/clinical-tests/dsm/tier-two-progress";
import Level2NeurodevelopmentalModule from "@/lib/clinical-tests/legacy/dev/Level2NeurodevelopmentalModule";
import Level2PsychoticModule from "@/lib/clinical-tests/legacy/dev/Level2PsychoticModule";
import Level2BipolarModule from "@/lib/clinical-tests/legacy/dev/Level2BipolarModule";
import Level2DepressionModule from "@/lib/clinical-tests/legacy/dev/Level2DepressionModule";
import Level2AnxietyModule from "@/lib/clinical-tests/legacy/dev/Level2AnxietyModule";
import Level2OcdModule from "@/lib/clinical-tests/legacy/dev/Level2OcdModule";
import Level2TraumaModule from "@/lib/clinical-tests/legacy/dev/Level2TraumaModule";
import Level2DissociativeModule from "@/lib/clinical-tests/legacy/dev/Level2DissociativeModule";
import Level2SomaticModule from "@/lib/clinical-tests/legacy/dev/Level2SomaticModule";
import Level2EatingModule from "@/lib/clinical-tests/legacy/dev/Level2EatingModule";
import Level2EliminationModule from "@/lib/clinical-tests/legacy/dev/Level2EliminationModule";
import Level2SleepModule from "@/lib/clinical-tests/legacy/dev/Level2SleepModule";
import Level2SexualDysfunctionModule from "@/lib/clinical-tests/legacy/dev/Level2SexualDysfunctionModule";
import Level2GenderDysphoriaModule from "@/lib/clinical-tests/legacy/dev/Level2GenderDysphoriaModule";
import Level2ImpulseConductModule from "@/lib/clinical-tests/legacy/dev/Level2ImpulseConductModule";
import Level2SubstanceModule from "@/lib/clinical-tests/legacy/dev/Level2SubstanceModule";
import Level2NeurocognitiveModule from "@/lib/clinical-tests/legacy/dev/Level2NeurocognitiveModule";
import Level2PersonalityScreenModule from "@/lib/clinical-tests/legacy/dev/Level2PersonalityScreenModule";
import Level2ParaphilicScreenModule from "@/lib/clinical-tests/legacy/dev/Level2ParaphilicScreenModule";

const modules: Record<string, ComponentType> = {
  "level1": TierOneScreen,
  "summary": TierTwoFinalReport,
  "level2/neurodevelopmental": Level2NeurodevelopmentalModule,
  "level2/psychotic": Level2PsychoticModule,
  "level2/bipolar": Level2BipolarModule,
  "level2/depression": Level2DepressionModule,
  "level2/anxiety": Level2AnxietyModule,
  "level2/ocd": Level2OcdModule,
  "level2/trauma": Level2TraumaModule,
  "level2/dissociative": Level2DissociativeModule,
  "level2/somatic": Level2SomaticModule,
  "level2/eating": Level2EatingModule,
  "level2/elimination": Level2EliminationModule,
  "level2/sleep": Level2SleepModule,
  "level2/sexual-dysfunction": Level2SexualDysfunctionModule,
  "level2/gender-dysphoria": Level2GenderDysphoriaModule,
  "level2/impulse-conduct": Level2ImpulseConductModule,
  "level2/substance": Level2SubstanceModule,
  "level2/neurocognitive": Level2NeurocognitiveModule,
  "level2/personality": Level2PersonalityScreenModule,
  "level2/paraphilic": Level2ParaphilicScreenModule,
};

export default function ClinicalScreenClient({ screenKey }: { screenKey: string }) {
  const [ready,setReady]=useState(false);
  useEffect(()=>{setReady(true);},[]);
  useSyncExternalStore(clinicalSessionStore.subscribe,clinicalSessionStore.revision,()=>0);
  const plan=activePlan();
  const allowed=ready&&plan?.profile.id==='adult'&&plan.handoff.domains.some(d=>d.path===screenKey&&plan.handoff.routedDomains.includes(d.id));
  if(screenKey!=='level1'&&screenKey!=='summary'&&!allowed)return <section><h2>Start with Tier 1</h2><p>This domain is not selected by the current completed Tier 1 plan. Complete or review Tier 1 to continue with the appropriate domains. Unselected domains are not ruled out.</p><Link href="/clinical-tests/dev/level1">Open Tier 1 screening</Link></section>;
  const Component = modules[screenKey];
  if (!Component) return <p>That module is unavailable.</p>;
  return <Component />;
}
