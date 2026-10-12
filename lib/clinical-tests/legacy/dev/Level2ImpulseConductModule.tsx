"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module from "./Level2Shared";
import type { GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "impulse_conduct",
  storageKey: "asq_level2_impulse_conduct_answers",
  pageTitle: "Level 2 — Impulse, Anger & Conduct Check",
  introText: "This is a self-check to understand persistent problems with anger, aggression, impulsive acts, or rule-breaking. It is not a diagnosis.",
  mainHeader: "Impulse and conduct pattern",
  durationField: {
    id: "duration_pattern",
    title: "Duration",
    text: "This pattern has been present for a substantial period of time rather than only briefly.",
    threshold: 3,
  },
  impactField: {
    id: "impairment",
    title: "Impact",
    text: "This pattern creates legal, relational, work, school, safety, or daily-life problems.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "substance_context",
      title: "Substance context?",
      text: "Could substances, medications, or intoxication be strongly contributing to this pattern?",
      label: "Possibly",
    },
    {
      id: "mania_context",
      title: "High-energy mood-state context?",
      text: "Does this pattern happen mainly during periods of unusually high energy, very little sleep, or major activation?",
      label: "Possibly",
    },
  ],
  symptoms: [
    { id: "anger_outbursts", title: "Anger outbursts", text: "I have repeated anger outbursts that feel excessive for the situation." },
    { id: "aggression", title: "Aggression", text: "I become verbally or physically aggressive in ways I later regret." },
    { id: "property_damage", title: "Damaging things", text: "I have damaged property, thrown things, or become physically destructive during anger or impulse states." },
    { id: "rule_breaking", title: "Rule-breaking", text: "I knowingly break important rules, boundaries, or expectations despite consequences." },
    { id: "deceit_manipulation", title: "Deceit or manipulation", text: "I use deception, concealment, or manipulation in ways that create problems." },
    { id: "low_frustration_tolerance", title: "Low frustration tolerance", text: "I become intensely frustrated or reactive more quickly than seems typical." },
    { id: "remorse_after", title: "Regret afterward", text: "Afterward I often feel regret, shame, or recognize I reacted badly." },
    { id: "risk_impulses", title: "Risky impulses", text: "I act impulsively in ways that create conflict, danger, or serious consequences." },
  ],
  evaluate: ({ answers, presence, presentCount, durationOk, impairmentOk }) => {
    const core = presence.anger_outbursts || presence.aggression || presence.risk_impulses;
    const strong = core && presentCount >= 4 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!core) notes.push("A central anger/aggression/impulse-control core was not strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 impulse/conduct symptom areas crossed threshold.");
    if (!durationOk) notes.push("Longer duration was not clearly endorsed.");
    if (!impairmentOk) notes.push("Functional or consequence-based impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong impulse-control, anger, or conduct-related pattern that may benefit from professional evaluation."
        : core
          ? "Your answers suggest meaningful impulse-control or anger-related concerns, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad impulse-control or conduct-related pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Impulse/anger core", value: core ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 8` },
        { label: "Duration", value: durationOk ? "Yes" : "No" },
        { label: "Impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
      safetyBox:
        (answers.aggression as number) >= 4 || (answers.property_damage as number) >= 4
          ? {
              tone: "danger",
              title: "Safety / violence-risk note",
              text: "Your answers suggest severe aggression or destructive behavior. If there is any current risk to you or others, urgent professional help is recommended.",
            }
          : null,
    };
  },
};

export default function Level2ImpulseConductModule() {
  return <GenericLevel2Module config={config} />;
}