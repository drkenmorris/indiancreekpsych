"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module from "./Level2Shared";
import type { GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "eating",
  storageKey: "asq_level2_eating_answers",
  pageTitle: "Level 2 — Eating, Weight & Body Image Check",
  introText: "This is a self-check to understand eating, weight, and body-image patterns. It is not a diagnosis.",
  mainHeader: "Eating and body-image pattern",
  durationField: {
    id: "duration_pattern",
    title: "Duration",
    text: "This pattern has been present for a substantial period of time rather than only briefly.",
    threshold: 3,
  },
  impactField: {
    id: "impairment",
    title: "Impact",
    text: "This pattern affects health, mood, daily functioning, relationships, or normal life.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "medical_weight_context",
      title: "Medical or training context?",
      text: "Could some of this pattern be influenced by medical conditions, prescribed diet changes, or intense athletic/body-building demands?",
      label: "Possibly",
    },
    {
      id: "significant_weight_change",
      title: "Noticeable weight change?",
      text: "Has this pattern led to a meaningful change in weight, nutrition, or physical health?",
      label: "Yes",
    },
  ],
  symptoms: [
    { id: "restriction", title: "Restriction", text: "I restrict food, calories, or eating in ways that feel hard to control or increasingly rigid." },
    { id: "fear_weight_gain", title: "Fear of weight gain", text: "Fear of gaining weight strongly influences my eating or behavior." },
    { id: "body_preoccupation", title: "Body image preoccupation", text: "My self-worth is strongly affected by weight, shape, or body image." },
    { id: "bingeing", title: "Binge-like eating", text: "I sometimes eat a large amount in a way that feels out of control." },
    { id: "compensation", title: "Compensatory behavior", text: "I use unhealthy strategies to compensate for eating, such as purging, over-exercise, or strict correction afterward." },
    { id: "guilt_after_eating", title: "Guilt or shame after eating", text: "After eating, I often feel intense guilt, shame, disgust, or panic." },
    { id: "ritualized_eating", title: "Food rituals", text: "My eating has become unusually ritualized, rigid, rule-bound, or fear-driven." },
    { id: "avoid_social_eating", title: "Avoiding eating with others", text: "I avoid meals, restaurants, or social eating situations because of anxiety, shame, or control concerns." },
    { id: "health_consequence", title: "Physical consequences", text: "This pattern has affected my energy, mood, body functioning, or health." },
  ],
  evaluate: ({ presence, presentCount, durationOk, impairmentOk }) => {
    const core = presence.restriction || presence.bingeing || presence.body_preoccupation || presence.fear_weight_gain;
    const strong = core && presentCount >= 4 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!core) notes.push("The eating/body-image core was not strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 eating-related symptom areas crossed threshold.");
    if (!durationOk) notes.push("Longer duration was not clearly endorsed.");
    if (!impairmentOk) notes.push("Functional or health impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong eating, weight, or body-image pattern that may benefit from professional evaluation."
        : core
          ? "Your answers suggest meaningful eating or body-image concerns, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad eating-disorder-related pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Eating/body-image core", value: core ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 9` },
        { label: "Duration", value: durationOk ? "Yes" : "No" },
        { label: "Impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
    };
  },
};

export default function Level2EatingModule() {
  return <GenericLevel2Module config={config} />;
}