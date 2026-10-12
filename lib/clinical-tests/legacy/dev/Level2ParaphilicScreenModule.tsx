"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module, { type GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "paraphilic_screen",
  storageKey: "asq_level2_paraphilic_screen_answers",
  pageTitle: "Level 2 — Sexual Interest Pattern Screen",
  introText: "This section is a screening tool only. Sexual interests vary widely, and this section is not intended to label or diagnose based on fantasy or curiosity alone. It screens only for patterns involving distress, loss of control, harm risk, or major life problems. A fuller confirmatory assessment is recommended if this section screens strongly.",
  mainHeader: "Distress, control, and risk pattern",
  durationField: {
    id: "duration_pattern",
    title: "Duration",
    text: "This pattern has been persistent rather than brief or isolated.",
    threshold: 3,
  },
  impactField: {
    id: "impairment",
    title: "Distress / Impact",
    text: "This pattern causes distress, shame, loss of control, secrecy, harm risk, or major problems.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "full_battery_interest",
      title: "Would a fuller follow-up assessment help?",
      text: "Because sexual-interest concerns are sensitive and complex, would a more detailed confidential follow-up questionnaire likely be useful?",
      label: "Yes",
    },
    {
      id: "safety_concern_now",
      title: "Current safety concern?",
      text: "Are you currently worried about your ability to stay fully in control and act safely and lawfully?",
      label: "Yes, I am concerned",
    },
  ],
  symptoms: [
    { id: "distressing_interest", title: "Distressing sexual interests", text: "Some sexual thoughts, fantasies, or urges feel distressing, unwanted, or hard to reconcile with my values." },
    { id: "repetitive_preoccupation", title: "Preoccupation", text: "These thoughts or urges take up a lot of mental space or return repeatedly." },
    { id: "loss_of_control", title: "Loss of control", text: "I feel I may not always have full control over these urges or behaviors." },
    { id: "secrecy_shame", title: "Secrecy or shame", text: "This area is associated with significant secrecy, shame, or fear of exposure." },
    { id: "relationship_impact", title: "Relationship impact", text: "This pattern has affected trust, intimacy, or relationship stability." },
    { id: "functional_impact", title: "Functional impact", text: "This pattern affects work, concentration, daily life, or emotional stability." },
    { id: "boundary_risk", title: "Boundary risk", text: "I worry this pattern could lead to crossing boundaries, acting unsafely, or causing harm." },
  ],
  evaluate: ({ answers, presence, presentCount, durationOk, impairmentOk }) => {
    const core = presence.distressing_interest || presence.loss_of_control || presence.boundary_risk;
    const strong = core && presentCount >= 4 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!core) notes.push("No major distress/control/risk core was strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 sexual-interest concern areas crossed threshold.");
    if (!durationOk) notes.push("Persistence over time was not clearly endorsed.");
    if (!impairmentOk) notes.push("Distress or life impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong sexual-interest distress or control concern pattern. Because this area is sensitive and complex, a fuller confirmatory assessment and professional evaluation are recommended."
        : core
          ? "Your answers suggest meaningful sexual-interest-related concerns, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad sexual-interest distress/control pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Distress/control/risk core", value: core ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 7` },
        { label: "Persistent over time", value: durationOk ? "Yes" : "No" },
        { label: "Distress / impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
      safetyBox:
        !!answers.safety_concern_now || (answers.boundary_risk as number) >= 4
          ? {
              tone: "danger",
              title: "Immediate professional support recommended",
              text: "Your answers suggest current concern about staying in control safely and lawfully. Prompt confidential professional help is recommended.",
            }
          : strong
            ? {
                tone: "warning",
                title: "Confirmatory battery recommended",
                text: "This section is only a screen. Strong results here should be followed by a fuller confidential assessment and professional evaluation.",
              }
            : null,
    };
  },
};

export default function Level2ParaphilicScreenModule() {
  return <GenericLevel2Module config={config} />;
}