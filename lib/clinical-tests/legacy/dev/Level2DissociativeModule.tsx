"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module from "./Level2Shared";
import type { GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "dissociative",
  storageKey: "asq_level2_dissociative_answers",
  pageTitle: "Level 2 — Detachment & Memory Gaps Check",
  introText: "This is a self-check to understand detachment, unreality, and memory-gap patterns. It is not a diagnosis. Because dissociative symptoms can be difficult to self-evaluate accurately, a fuller follow-up assessment is recommended when this area screens strongly.",
  mainHeader: "Detachment and discontinuity",
  durationField: {
    id: "duration_pattern",
    title: "Duration",
    text: "This pattern has happened repeatedly over time rather than only once.",
    threshold: 3,
  },
  impactField: {
    id: "impairment",
    title: "Impact",
    text: "These experiences interfere with memory, functioning, relationships, work, or daily life.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "trauma_link",
      title: "Trauma-linked pattern?",
      text: "Do these experiences seem connected to overwhelming stress, trauma reminders, or feeling unsafe?",
      label: "Possibly",
    },
    {
      id: "medical_ruleout",
      title: "Medical or neurological context?",
      text: "Could part of this pattern be related to seizures, head injury, substances, sleep issues, or another medical condition?",
      label: "Possibly",
    },
  ],
  symptoms: [
    { id: "depersonalization", title: "Detached from self", text: "At times I feel detached from myself, as if I am observing myself from outside." },
    { id: "derealization", title: "World feels unreal", text: "At times the world around me feels unreal, dreamlike, foggy, or distant." },
    { id: "memory_gaps", title: "Memory gaps", text: "I have gaps in memory for things I should likely remember." },
    { id: "lost_time", title: "Lost time", text: "I sometimes lose track of time or realize more time passed than I can account for." },
    { id: "identity_shift", title: "Identity discontinuity", text: "At times I feel like different parts of me take over in ways that affect memory, behavior, or continuity." },
    { id: "numbing_shutdown", title: "Numbing or shutdown", text: "When overwhelmed, I can go numb, blank, or mentally shut down." },
    { id: "stress_triggered", title: "Stress-triggered", text: "These experiences tend to become stronger under stress, conflict, or trauma reminders." },
    { id: "confusion_after", title: "Confusion afterward", text: "After these experiences, I may feel confused, disoriented, or uncertain about what happened." },
    { id: "function_disruption", title: "Function disruption", text: "These experiences have disrupted work, relationships, safety, or daily responsibilities." },
  ],
  evaluate: ({ answers, presence, presentCount, durationOk, impairmentOk }) => {
    const core = presence.depersonalization || presence.derealization || presence.memory_gaps || presence.lost_time;
    const strong = core && presentCount >= 4 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!core) notes.push("No major detachment or memory-discontinuity core was strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 dissociation-related symptom areas crossed threshold.");
    if (!durationOk) notes.push("The pattern was not clearly endorsed as recurring over time.");
    if (!impairmentOk) notes.push("Functional impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong dissociation-related pattern. A fuller dissociative follow-up assessment is recommended because these symptoms can be difficult to evaluate accurately by self-report alone."
        : core
          ? "Your answers suggest meaningful dissociative symptoms, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad dissociative pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Detachment/memory-gap core", value: core ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 9` },
        { label: "Recurring over time", value: durationOk ? "Yes" : "No" },
        { label: "Impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
      safetyBox:
        (answers.memory_gaps as number) >= 4 || (answers.lost_time as number) >= 4
          ? {
              tone: "warning",
              title: "Dissociation follow-up note",
              text: "Your answers suggest severe memory or continuity concerns. A clinician-guided follow-up assessment is recommended, especially if safety, orientation, or daily functioning are affected.",
            }
          : null,
    };
  },
};

export default function Level2DissociativeModule() {
  return <GenericLevel2Module config={config} />;
}