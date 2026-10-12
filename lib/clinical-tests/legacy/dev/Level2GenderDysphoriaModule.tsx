"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module from "./Level2Shared";
import type { GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "gender_dysphoria",
  storageKey: "asq_level2_gender_dysphoria_answers",
  pageTitle: "Level 2 — Gender-Related Distress Check",
  introText: "This is a self-check to understand gender-related distress or incongruence. It is not a diagnosis.",
  mainHeader: "Gender-related experience",
  durationField: {
    id: "duration_persistent",
    title: "Duration",
    text: "These experiences have been persistent rather than brief or passing.",
    threshold: 3,
  },
  impactField: {
    id: "impairment",
    title: "Distress / Impact",
    text: "These experiences cause distress, discomfort, impairment, or major strain in life.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "social_safety_context",
      title: "Safety or social pressure context?",
      text: "Is some of the distress strongly linked to rejection, lack of safety, or pressure from others rather than only internal incongruence?",
      label: "Possibly",
    },
    {
      id: "support_desire",
      title: "Support wanted?",
      text: "Would additional supportive discussion with a knowledgeable clinician likely be helpful in exploring this area?",
      label: "Yes",
    },
  ],
  symptoms: [
    { id: "incongruence", title: "Internal mismatch", text: "I experience a significant mismatch between my internal sense of gender and my body or assigned/socially expected gender." },
    { id: "body_distress", title: "Body-related distress", text: "Parts of my body or physical sex characteristics cause significant distress or discomfort." },
    { id: "social_role_distress", title: "Social-role distress", text: "Being treated as a gender that does not fit me causes strong distress or discomfort." },
    { id: "wish_other_gender", title: "Wish for different embodiment", text: "I strongly wish aspects of my body or social gendered experience were different." },
    { id: "identity_consistency", title: "Persistent identity concern", text: "This is not just occasional questioning; it has felt meaningful and persistent." },
    { id: "avoidance", title: "Avoidance", text: "I avoid mirrors, clothing, social roles, intimacy, or settings that intensify this discomfort." },
    { id: "mood_impact", title: "Mood impact", text: "This pattern contributes to sadness, anxiety, shame, or emotional distress." },
  ],
  evaluate: ({ presence, presentCount, durationOk, impairmentOk }) => {
    const core = presence.incongruence || presence.body_distress || presence.social_role_distress;
    const strong = core && presentCount >= 4 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!core) notes.push("A central gender-related incongruence or distress core was not strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 gender-related symptom areas crossed threshold.");
    if (!durationOk) notes.push("Persistence over time was not clearly endorsed.");
    if (!impairmentOk) notes.push("Distress or impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong gender-related distress pattern that may benefit from discussion with a knowledgeable clinician."
        : core
          ? "Your answers suggest meaningful gender-related distress or incongruence, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad gender-dysphoria-related pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Gender-distress core", value: core ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 7` },
        { label: "Persistent over time", value: durationOk ? "Yes" : "No" },
        { label: "Distress / impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
    };
  },
};

export default function Level2GenderDysphoriaModule() {
  return <GenericLevel2Module config={config} />;
}