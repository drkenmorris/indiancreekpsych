// src/asq/narrativeEngine.ts

export type SeverityBand = "Low" | "Moderate" | "Elevated" | "—";

export type DomainMean = {
  domain: string;
  answeredCount: number;
  mean: number | null;
};

export type InformantLabel = "Student" | "Parent" | "Teacher";

export type InformantProfile = {
  informant: InformantLabel;
  answeredCount: number;
  totalCount: number;
  domains: DomainMean[];
};

export type CrossInformantInput = {
  student?: InformantProfile;
  parent?: InformantProfile;
  teacher?: InformantProfile;
};

export function interpretMean(mean: number | null): SeverityBand {
  if (mean === null || Number.isNaN(mean)) return "—";
  if (mean < 1.0) return "Low";
  if (mean < 2.0) return "Moderate";
  return "Elevated";
}

function fmtMean(mean: number | null): string {
  return mean === null || Number.isNaN(mean) ? "—" : mean.toFixed(2);
}

type DomainTemplate = {
  description: string;
  low: string;
  moderate: string;
  elevated: string;
  lifeImpact: string[];
  supports: string[];
};

const DOMAIN_TEMPLATES: Record<string, DomainTemplate> = {
  Social: {
    description: "Social reciprocity, peer connection, reading cues, adapting behavior across contexts.",
    low: "Social reciprocity appears generally typical in this rating context.",
    moderate: "Social reciprocity may be inconsistent; difficulties emerge with nuance, perspective-taking, or unstructured settings.",
    elevated: "Social reciprocity concerns are prominent and likely impact peer relationships or social adaptation across settings.",
    lifeImpact: [
      "Misreading peer intent (sarcasm/teasing/subtle cues).",
      "Difficulty joining groups or sustaining friendships without structure.",
      "Stress in fast-moving social environments (lunch/recess/group projects).",
    ],
    supports: [
      "Structured social coaching (role-play, video modeling, guided practice).",
      "Facilitated peer groups / buddy supports.",
      "Teach repair scripts + self-advocacy (clarification requests).",
    ],
  },

  Communication: {
    description: "Pragmatic language: inference, conversational pacing, indirect language, repair strategies.",
    low: "Pragmatic communication appears generally typical in this rating context.",
    moderate: "Pragmatic challenges may show up under complex demands (inference, open-ended questions, pacing).",
    elevated: "Pragmatic communication concerns are prominent and likely impact functional dialogue across settings.",
    lifeImpact: [
      "Literal interpretation; missing implied meaning.",
      "Difficulty knowing when/how to ask for clarification.",
      "Conversation may become one-sided or stuck on preferred topics.",
    ],
    supports: [
      "Speech-language therapy focused on pragmatic language/inference.",
      "Visual conversation supports (topic map, turn-taking cues).",
      "Reduce multi-step verbal demands; provide processing time.",
    ],
  },

  RRB: {
    description: "Restricted interests, repetitive behaviors, rigidity, preference for sameness.",
    low: "Less evidence of rigidity/repetitive patterns impacting daily functioning.",
    moderate: "Rigidity/repetitive patterns may appear under stress or change; interests may narrow attention at times.",
    elevated: "Rigidity/repetitive patterns meaningfully impact flexibility, transitions, or engagement across demands.",
    lifeImpact: [
      "Distress with unexpected change or schedule shifts.",
      "Difficulty transitioning away from preferred activities.",
      "Intense focus may crowd out other tasks.",
    ],
    supports: [
      "Predictable routines + preview of changes (visual schedule).",
      "Flexibility training in small steps (planned variations + coping plan).",
      "Transition supports (timers, countdowns, first/then).",
    ],
  },

  Sensory: {
    description: "Sensory sensitivity or sensory-seeking (sound, light, textures, movement).",
    low: "Sensory reactivity appears manageable in this rating context.",
    moderate: "Sensory sensitivities/seeking may occur in specific environments and affect comfort/attention.",
    elevated: "Sensory processing concerns are prominent and may drive distress, avoidance, or dysregulation.",
    lifeImpact: [
      "Overload in noisy/crowded environments; fatigue after school.",
      "Avoidance of certain textures/clothing/foods or environments.",
      "Seeking movement/deep pressure for regulation.",
    ],
    supports: [
      "OT evaluation for sensory profile + regulation plan.",
      "Environmental supports (headphones, lighting, sensory breaks).",
      "Teach early warning signs + coping menu.",
    ],
  },

  Regulation: {
    description: "Emotional/behavioral regulation under stress, uncertainty, fatigue, demand.",
    low: "Regulation appears generally stable in this rating context.",
    moderate: "Regulation may be variable; stress/load can increase withdrawal, irritability, or escalation.",
    elevated: "Regulation concerns are prominent; overwhelm may lead to frequent meltdowns/shutdowns.",
    lifeImpact: [
      "Escalation when demands pile up (multi-step tasks/transitions).",
      "Shutdown/withdrawal after sustained effort or masking.",
      "Long recovery time after stressful events.",
    ],
    supports: [
      "Trigger map + upstream load reduction (reduce demands earlier).",
      "Co-regulation plan → self-regulation skills over time.",
      "CBT/DBT-informed coping strategies adapted for neurodiversity.",
    ],
  },

  Executive: {
    description: "Initiation, organization, planning, working memory, shifting between tasks.",
    low: "Executive functioning appears generally typical in this rating context.",
    moderate: "Executive skills may be inconsistent—especially initiation and transitions.",
    elevated: "Executive challenges are prominent and affect independence/completion under real-world load.",
    lifeImpact: [
      "Difficulty starting tasks without prompts.",
      "Losing track of steps; incomplete output despite ability.",
      "Stuck when plans change or tasks are ambiguous.",
    ],
    supports: [
      "Externalize steps (checklists, templates, visual instructions).",
      "Chunk tasks; reduce working memory load.",
      "Initiation supports (start cue, 2-minute entry task).",
    ],
  },

  Classroom: {
    description: "Functional impact at school: group work, participation, output under classroom load.",
    low: "Classroom functional impact appears limited in the rating pattern.",
    moderate: "Classroom impact may be present under load (group work, help-seeking, pragmatic demands).",
    elevated: "Classroom impact is prominent and affects engagement, participation, and academic output.",
    lifeImpact: [
      "More variable performance in groups vs one-to-one.",
      "Avoidance due to uncertainty/processing load.",
      "Reduced tolerance later in the day (fatigue).",
    ],
    supports: [
      "Preferential seating + reduced-distraction workspace.",
      "Clear rubrics/examples + predictable routines.",
      "Alternative output options when appropriate (typed/oral).",
      "Embedded breaks and sensory supports.",
    ],
  },

  Strengths: {
    description: "Protective factors and strengths to leverage in supports/planning.",
    low: "Strength indicators were not strongly captured in the current rating pattern.",
    moderate: "Several protective factors appear present and can be leveraged.",
    elevated: "Strong protective factors appear present; supports should intentionally build from strengths.",
    lifeImpact: [
      "When strengths are used, regulation and performance typically improve.",
      "Clear structure can convert stress into competence.",
    ],
    supports: [
      "Design supports around strengths (visual learning, deep interests).",
      "Use interests strategically to increase persistence and confidence.",
      "Provide structured leadership/helper roles aligned to strengths.",
    ],
  },
};

function domainTemplate(domain: string): DomainTemplate {
  return (
    DOMAIN_TEMPLATES[domain] ?? {
      description: `Domain "${domain}" is present but not mapped to a template yet.`,
      low: `${domain} indicators appear limited in the current pattern.`,
      moderate: `${domain} indicators are present intermittently and may emerge under stress.`,
      elevated: `${domain} indicators are prominent and likely impact functioning.`,
      lifeImpact: ["Add life-impact bullets for this domain once finalized."],
      supports: ["Add supports/therapies for this domain once finalized."],
    }
  );
}

function domainNarrative(domain: string, band: SeverityBand): string {
  const t = domainTemplate(domain);
  if (band === "Low") return t.low;
  if (band === "Moderate") return t.moderate;
  if (band === "Elevated") return t.elevated;
  return "Insufficient data to interpret this domain.";
}

export function buildInformantNarrative(profile: InformantProfile): string {
  const lines: string[] = [];
  lines.push(`${profile.informant} Report — Answered ${profile.answeredCount} of ${profile.totalCount}.`);
  lines.push("");

  const domains = [...profile.domains].sort((a, b) => a.domain.localeCompare(b.domain));

  if (!domains.length) {
    lines.push("No domain means available (no items answered).");
    return lines.join("\n");
  }

  lines.push("Domain Summary:");
  for (const d of domains) {
    const band = interpretMean(d.mean);
    lines.push(`• ${d.domain}: mean ${fmtMean(d.mean)} (${band}), answered ${d.answeredCount}`);
  }

  lines.push("");
  lines.push("Domain Narratives:");
  for (const d of domains) {
    const band = interpretMean(d.mean);
    lines.push(`${d.domain} (${band}): ${domainNarrative(d.domain, band)}`);
  }

  lines.push("");
  lines.push("Composite Behavioral Profile:");
  const ranked = domains
    .filter((d) => d.domain !== "Strengths")
    .filter((d) => typeof d.mean === "number")
    .sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1))
    .slice(0, 3);

  if (!ranked.length) {
    lines.push("• Insufficient domain data to form a composite profile.");
  } else {
    lines.push(
      `• Primary signal domains: ${ranked
        .map((d) => `${d.domain} (${fmtMean(d.mean)}; ${interpretMean(d.mean)})`)
        .join(", ")}.`
    );
    lines.push(
      "• Patterns tend to show most clearly during transitions, unstructured social demands, sensory load, and high executive load."
    );
  }

  return lines.join("\n");
}

function unionDomains(input: CrossInformantInput): string[] {
  const present = [input.student, input.parent, input.teacher].filter(Boolean) as InformantProfile[];
  const set = new Set<string>();
  for (const p of present) for (const d of p.domains) set.add(d.domain);
  return [...set].sort((a, b) => a.localeCompare(b));
}

function consensusTopDomains(input: CrossInformantInput, topN: number): { domain: string; mean: number }[] {
  const present = [input.student, input.parent, input.teacher].filter(Boolean) as InformantProfile[];
  if (!present.length) return [];

  const domainSet = new Set<string>();
  for (const p of present) for (const d of p.domains) domainSet.add(d.domain);

  const out: { domain: string; mean: number }[] = [];
  for (const dom of domainSet) {
    const vals: number[] = [];
    for (const p of present) {
      const m = p.domains.find((d) => d.domain === dom)?.mean;
      if (typeof m === "number") vals.push(m);
    }
    if (!vals.length) continue;
    out.push({ domain: dom, mean: vals.reduce((a, b) => a + b, 0) / vals.length });
  }

  return out.sort((a, b) => b.mean - a.mean).slice(0, topN);
}

function supportsForDomains(domains: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const dom of domains) {
    for (const s of domainTemplate(dom).supports) {
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
      if (out.length >= max) return out;
    }
  }
  return out;
}

// ✅ THIS IS THE EXPORT YOU WERE MISSING
export function buildProfessionalCombinedReport(
  studentDisplayName: string,
  input: CrossInformantInput
): string {
  const lines: string[] = [];

  lines.push("AUTISM ASSESSMENT — COMBINED REPORT");
  lines.push(`Student: ${studentDisplayName || "Unnamed Student"}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");
  lines.push(
    "Disclaimer: This report summarizes questionnaire rating patterns. It is not a standalone diagnosis. Interpret alongside interview, developmental history, observation, and functional impact."
  );
  lines.push("");
  lines.push("=".repeat(72));
  lines.push("");

  // Completion
  lines.push("SECTION 1 — COMPLETION STATUS");
  for (const p of [input.student, input.parent, input.teacher]) {
    if (!p) continue;
    lines.push(`• ${p.informant}: answered ${p.answeredCount} of ${p.totalCount}`);
  }
  lines.push("");

  // Definitions
  lines.push("SECTION 2 — DOMAIN DEFINITIONS");
  const domains = unionDomains(input);
  if (!domains.length) {
    lines.push("No domains available yet (score at least one questionnaire).");
    return lines.join("\n");
  }
  for (const dom of domains) lines.push(`• ${dom}: ${domainTemplate(dom).description}`);
  lines.push("");

  // Per-informant
  lines.push("SECTION 3 — INFORMANT REPORTS");
  lines.push("");
  if (input.student) {
    lines.push("STUDENT REPORT");
    lines.push("-".repeat(24));
    lines.push(buildInformantNarrative(input.student));
    lines.push("");
  } else lines.push("STUDENT REPORT: not yet generated.\n");

  if (input.parent) {
    lines.push("PARENT REPORT");
    lines.push("-".repeat(24));
    lines.push(buildInformantNarrative(input.parent));
    lines.push("");
  } else lines.push("PARENT REPORT: not yet generated.\n");

  if (input.teacher) {
    lines.push("TEACHER REPORT");
    lines.push("-".repeat(24));
    lines.push(buildInformantNarrative(input.teacher));
    lines.push("");
  } else lines.push("TEACHER REPORT: not yet generated.\n");

  lines.push("=".repeat(72));
  lines.push("");

  // Consensus + life impact
  lines.push("SECTION 4 — CONSENSUS DOMAINS & LIFE IMPACT");
  const top = consensusTopDomains(input, 4);
  if (!top.length) {
    lines.push("Insufficient overlapping data across informants to compute a consensus.");
    lines.push("");
  } else {
    for (const d of top) {
      const band = interpretMean(d.mean);
      const t = domainTemplate(d.domain);
      lines.push(`${d.domain} (consensus ${d.mean.toFixed(2)}; ${band}):`);
      lines.push(`  ${domainNarrative(d.domain, band)}`);
      lines.push("  Common manifestations:");
      for (const b of t.lifeImpact) lines.push(`  • ${b}`);
      lines.push("");
    }
  }

  // Supports
  lines.push("SECTION 5 — SUGGESTED SUPPORTS / THERAPIES (GENERAL OPTIONS)");
  const supportDomains = top.map((d) => d.domain);
  const supports = supportsForDomains(supportDomains, 18);
  if (!supports.length) {
    lines.push("Add supports once domains are established.");
  } else {
    for (const s of supports) lines.push(`• ${s}`);
  }
  lines.push("");
  lines.push("Implementation notes:");
  lines.push("• Start with predictability + environmental supports (fastest payoff).");
  lines.push("• Teach skills proactively when regulated, not mid-escalation.");
  lines.push("• Track 2–3 measurable outcomes weekly (meltdowns/shutdowns, peer conflict, work completion).");
  lines.push("");

  // Final summary
  lines.push("SECTION 6 — FINAL INTEGRATED SUMMARY (EXTENSIVE)");
  lines.push(
    "Across informants, patterns are best interpreted as context-dependent responses to social-communication demands, sensory load, transitions, and executive demands. Variability is common: skills may look stronger in predictable/structured settings and weaker when tasks are ambiguous, social density is high, or fatigue accumulates. Differences across informants often reflect home vs school contexts, masking/compensation, and differences in exposure to triggers."
  );
  lines.push(
    "A strong plan typically combines (1) upstream load reduction (predictability, clarity, sensory supports), (2) explicit skill teaching (communication repair scripts, pragmatic coaching, self-advocacy), and (3) executive external supports (visual steps, chunking, initiation cues). The goal is practical functioning: helping the student feel safe, regulated, and successful across settings."
  );

  return lines.join("\n");
}
