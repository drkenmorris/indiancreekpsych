"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module from "./Level2Shared";
import type { GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "neurodev",
  storageKey: "asq_level2_neurodevelopmental_answers",
  pageTitle: "Level 2 — Attention, Learning & Social Differences Check",
  introText: "This is a self-check to understand developmental attention, learning, and social-communication patterns. It is not a diagnosis.",
  mainHeader: "Across development",
  durationField: {
    id: "duration_lifelong",
    title: "Long-term pattern",
    text: "These patterns have been present since childhood or early development, not just recently.",
    threshold: 4,
  },
  impactField: {
    id: "impairment",
    title: "Impact",
    text: "These patterns interfere with school, work, relationships, organization, or daily functioning.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "medical_context",
      title: "Medical or neurological context?",
      text: "Could part of this pattern be explained by head injury, seizure disorder, substance effects, sleep deprivation, or another medical issue?",
      label: "Possibly",
    },
    {
      id: "support_history",
      title: "Past support or accommodations?",
      text: "Have you ever received academic accommodations, tutoring, behavioral support, or developmental services related to these patterns?",
      label: "Yes, at some point",
    },
  ],
  symptoms: [
    { id: "inattention", title: "Distractibility", text: "Since childhood, I have had persistent difficulty sustaining attention or staying on task." },
    { id: "organization", title: "Organization", text: "Planning, organizing, prioritizing, and following multi-step tasks has been persistently difficult for me." },
    { id: "forgetfulness", title: "Forgetfulness", text: "I frequently lose track of items, instructions, appointments, or responsibilities." },
    { id: "restlessness", title: "Restlessness", text: "I have often felt unusually restless, fidgety, or unable to stay still when expected." },
    { id: "impulsivity", title: "Impulsivity", text: "I often interrupt, act before thinking, or struggle to wait my turn." },
    { id: "social_cues", title: "Social cues", text: "Understanding social cues, tone, timing, or unspoken rules has often been harder for me than for peers." },
    { id: "rigidity", title: "Rigidity or sameness", text: "Changes in routine, unexpected transitions, or not knowing what to expect can be unusually stressful for me." },
    { id: "sensory", title: "Sensory sensitivity", text: "Noise, textures, lights, touch, or other sensory input can feel overwhelming or unusually intense for me." },
    { id: "learning_pattern", title: "Learning differences", text: "I have had longstanding unevenness in learning, processing speed, reading, writing, math, or communication." },
  ],
  evaluate: ({ presence, presentCount, durationOk, impairmentOk }) => {
    const attentionCore = presence.inattention || presence.organization || presence.forgetfulness;
    const socialDevCore = presence.social_cues || presence.rigidity || presence.sensory;
    const strong = (attentionCore || socialDevCore) && presentCount >= 4 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!(attentionCore || socialDevCore)) notes.push("No major developmental attention or social-communication core was strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 neurodevelopment-related symptom areas crossed threshold.");
    if (!durationOk) notes.push("A clear early-development pattern was not strongly endorsed.");
    if (!impairmentOk) notes.push("Functional impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong developmental attention, learning, or social-communication pattern that may warrant formal evaluation."
        : attentionCore || socialDevCore
          ? "Your answers suggest meaningful developmental differences, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad neurodevelopmental pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Attention/social-development core", value: attentionCore || socialDevCore ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 9` },
        { label: "Long-term developmental pattern", value: durationOk ? "Yes" : "No" },
        { label: "Impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
    };
  },
};

export default function Level2NeurodevelopmentalModule() {
  return <GenericLevel2Module config={config} />;
}