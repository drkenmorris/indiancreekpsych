"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module, { type GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "elimination",
  storageKey: "asq_level2_elimination_answers",
  pageTitle: "Level 2 — Bladder & Bowel Control Check",
  introText: "This is a self-check to understand recurring bladder or bowel control concerns where control would normally be expected. It is not a diagnosis.",
  mainHeader: "Control pattern",
  durationField: {
    id: "duration_months",
    title: "Duration",
    text: "This pattern has been occurring repeatedly over time rather than only briefly.",
    threshold: 3,
  },
  impactField: {
    id: "impairment",
    title: "Impact",
    text: "This pattern causes distress, embarrassment, avoidance, disruption, or daily-life problems.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "medical_context",
      title: "Medical context?",
      text: "Could these issues be explained by infection, gastrointestinal conditions, neurological issues, medication effects, pregnancy, or another medical cause?",
      label: "Possibly",
    },
    {
      id: "sleep_only",
      title: "Mostly during sleep?",
      text: "Does this happen mostly during sleep rather than in daytime waking situations?",
      label: "Mostly during sleep",
    },
  ],
  symptoms: [
    { id: "urine_accidents", title: "Urine accidents", text: "I have repeated problems with bladder control when control would normally be expected." },
    { id: "bowel_accidents", title: "Bowel accidents", text: "I have repeated problems with bowel control when control would normally be expected." },
    { id: "urgency", title: "Urgency", text: "I feel strong urgency that is hard to control before accidents or near-accidents." },
    { id: "avoidance", title: "Avoidance", text: "I avoid travel, activities, sleepovers, work, or social situations because of fear of accidents." },
    { id: "embarrassment", title: "Embarrassment", text: "This pattern causes strong embarrassment, shame, or secrecy." },
    { id: "planning_around_bathroom", title: "Planning around bathrooms", text: "My routines are heavily shaped by needing immediate access to bathrooms or extra precautions." },
    { id: "sleep_disruption", title: "Sleep disruption", text: "This pattern disrupts sleep, bedding, or overnight comfort." },
  ],
  evaluate: ({ presence, presentCount, durationOk, impairmentOk }) => {
    const core = presence.urine_accidents || presence.bowel_accidents;
    const strong = core && presentCount >= 3 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!core) notes.push("The core elimination-control concern was not strongly endorsed.");
    if (presentCount < 3) notes.push("Fewer than 3 elimination-related symptom areas crossed threshold.");
    if (!durationOk) notes.push("Recurring duration was not clearly endorsed.");
    if (!impairmentOk) notes.push("Distress or impairment was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong recurrent elimination-control pattern that may warrant medical and/or clinical evaluation."
        : core
          ? "Your answers suggest meaningful elimination-control concerns, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad elimination-related pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Control-concern core", value: core ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 7` },
        { label: "Recurring duration", value: durationOk ? "Yes" : "No" },
        { label: "Impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
    };
  },
};

export default function Level2EliminationModule() {
  return <GenericLevel2Module config={config} />;
}