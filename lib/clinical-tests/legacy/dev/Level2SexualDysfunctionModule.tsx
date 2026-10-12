"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module from "./Level2Shared";
import type { GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "sexual_dysfunction",
  storageKey: "asq_level2_sexual_dysfunction_answers",
  pageTitle: "Level 2 — Sexual Well-Being Check",
  introText: "This is a self-check to understand sexual functioning concerns that cause distress or relationship strain. It is not a diagnosis.",
  mainHeader: "Sexual-function pattern",
  durationField: {
    id: "duration_months",
    title: "Duration",
    text: "These concerns have been present for a substantial period of time rather than only briefly.",
    threshold: 3,
  },
  impactField: {
    id: "impairment",
    title: "Impact",
    text: "These concerns cause personal distress, relationship strain, or avoidance.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "medical_medication_context",
      title: "Medical or medication context?",
      text: "Could these difficulties be influenced by hormones, pain, medical conditions, medication effects, or substances?",
      label: "Possibly",
    },
    {
      id: "relationship_context",
      title: "Relationship-specific context?",
      text: "Do these concerns appear strongly connected to relationship conflict, safety, trust, or emotional disconnection?",
      label: "Possibly",
    },
  ],
  symptoms: [
    { id: "low_desire", title: "Low desire", text: "I have persistent difficulty with sexual desire or interest compared with what feels normal for me." },
    { id: "arousal_difficulty", title: "Arousal difficulty", text: "I have persistent difficulty becoming mentally or physically aroused." },
    { id: "orgasm_difficulty", title: "Orgasm difficulty", text: "I have persistent difficulty reaching orgasm or climax." },
    { id: "pain_discomfort", title: "Pain or discomfort", text: "Sexual activity is affected by pain, discomfort, or strong physical difficulty." },
    { id: "avoidance", title: "Avoidance", text: "I avoid sexual contact or intimacy because of these concerns." },
    { id: "distress", title: "Distress", text: "These concerns cause me meaningful frustration, sadness, shame, or distress." },
    { id: "relationship_strain", title: "Relationship strain", text: "These concerns have created strain, misunderstanding, or conflict in my relationship(s)." },
  ],
  evaluate: ({ presence, presentCount, durationOk, impairmentOk }) => {
    const core = presence.low_desire || presence.arousal_difficulty || presence.orgasm_difficulty || presence.pain_discomfort;
    const strong = core && presentCount >= 4 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!core) notes.push("A central sexual-function difficulty was not strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 sexual-function symptom areas crossed threshold.");
    if (!durationOk) notes.push("Longer duration was not clearly endorsed.");
    if (!impairmentOk) notes.push("Distress or relationship impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong sexual-function concern pattern that may benefit from professional evaluation."
        : core
          ? "Your answers suggest meaningful sexual-function concerns, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad sexual-dysfunction pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Sexual-function core", value: core ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 7` },
        { label: "Duration", value: durationOk ? "Yes" : "No" },
        { label: "Impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
    };
  },
};

export default function Level2SexualDysfunctionModule() {
  return <GenericLevel2Module config={config} />;
}