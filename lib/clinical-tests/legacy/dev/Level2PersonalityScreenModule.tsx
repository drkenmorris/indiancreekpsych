"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module from "./Level2Shared";
import type { GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "personality_screen",
  storageKey: "asq_level2_personality_screen_answers",
  pageTitle: "Level 2 — Long-Term Personality Pattern Screen",
  introText: "This is a screening section only. Personality-related patterns are complex, develop over time, and can be difficult to self-evaluate accurately. A fuller personality assessment is recommended when this area screens strongly. This is not a diagnosis.",
  mainHeader: "Long-term relational and coping patterns",
  durationField: {
    id: "duration_years",
    title: "Long-term pattern",
    text: "These patterns have been present across many years rather than only recently.",
    threshold: 4,
  },
  impactField: {
    id: "impairment",
    title: "Impact",
    text: "These patterns repeatedly create problems in relationships, work, identity, coping, or stability.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "trauma_context",
      title: "Trauma-related context?",
      text: "Could part of this pattern be influenced by trauma, chronic invalidation, or prolonged adversity?",
      label: "Possibly",
    },
    {
      id: "full_battery_interest",
      title: "Would a fuller follow-up battery help?",
      text: "Because long-term personality patterns are complex, would a more detailed confirmatory questionnaire likely be useful?",
      label: "Yes",
    },
  ],
  symptoms: [
    { id: "relationship_instability", title: "Relationship instability", text: "My relationships have often been intense, unstable, conflictual, or repeatedly disrupted." },
    { id: "identity_instability", title: "Identity instability", text: "My sense of self, values, or direction can feel unstable or difficult to maintain." },
    { id: "rigidity", title: "Rigidity", text: "I tend to be unusually rigid, controlling, inflexible, or unable to adapt compared with others." },
    { id: "suspiciousness", title: "Suspiciousness", text: "I often feel guarded, mistrustful, or unsure of others’ motives." },
    { id: "emotional_instability", title: "Emotional instability", text: "My emotions can shift intensely or feel difficult to regulate." },
    { id: "avoidant_detached", title: "Detached or avoidant style", text: "I often keep distance, withdraw, or avoid closeness in ways that affect relationships." },
    { id: "attention_validation", title: "Attention or validation seeking", text: "I may strongly seek reassurance, admiration, attention, or emotional confirmation from others." },
    { id: "impulsivity", title: "Impulsivity", text: "I make impulsive choices that repeatedly create problems." },
    { id: "interpersonal_reactivity", title: "Strong interpersonal reactivity", text: "How others respond to me strongly affects my mood, self-image, or behavior." },
  ],
  evaluate: ({ presence, presentCount, durationOk, impairmentOk }) => {
    const core =
      presence.relationship_instability ||
      presence.identity_instability ||
      presence.rigidity ||
      presence.suspiciousness ||
      presence.emotional_instability;
    const strong = core && presentCount >= 5 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!core) notes.push("No major long-term personality-pattern core was strongly endorsed.");
    if (presentCount < 5) notes.push("Fewer than 5 personality-pattern areas crossed threshold.");
    if (!durationOk) notes.push("A clearly long-term, across-years pattern was not strongly endorsed.");
    if (!impairmentOk) notes.push("Repeated life impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong long-term personality-pattern signal. Because personality patterns are complex and can be difficult to self-evaluate accurately, a fuller confirmatory personality assessment is recommended."
        : core
          ? "Your answers suggest meaningful long-term personality-pattern concerns, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad long-term personality-pattern signal based on this screener.",
      notes,
      scoreRows: [
        { label: "Long-term personality-pattern core", value: core ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 9` },
        { label: "Across-years pattern", value: durationOk ? "Yes" : "No" },
        { label: "Repeated impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
      safetyBox: strong
        ? {
            tone: "warning",
            title: "Confirmatory battery recommended",
            text: "Personality patterns are best evaluated with a fuller assessment and clinical discussion. Strong results here should be interpreted cautiously and followed by a more comprehensive tool and a licensed professional.",
          }
        : null,
    };
  },
};

export default function Level2PersonalityScreenModule() {
  return <GenericLevel2Module config={config} />;
}