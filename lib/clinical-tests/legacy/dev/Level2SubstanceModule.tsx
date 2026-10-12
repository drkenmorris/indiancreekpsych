"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module from "./Level2Shared";
import type { GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "substance",
  storageKey: "asq_level2_substance_answers",
  pageTitle: "Level 2 — Substance Use & Control Check",
  introText: "This is a self-check to understand alcohol, drug, or compulsive-use patterns. It is not a diagnosis.",
  mainHeader: "Use and control pattern",
  durationField: {
    id: "duration_pattern",
    title: "Duration",
    text: "This pattern has happened repeatedly over time rather than only briefly.",
    threshold: 3,
  },
  impactField: {
    id: "impairment",
    title: "Impact",
    text: "Use has affected work, school, health, safety, relationships, or daily responsibilities.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "prescribed_context",
      title: "Prescribed medication context?",
      text: "Could part of this pattern be related to prescribed medication use that has become difficult to manage?",
      label: "Possibly",
    },
    {
      id: "help_desire",
      title: "Want help cutting down?",
      text: "Would structured support likely help if you decided to cut back or stop?",
      label: "Yes",
    },
  ],
  symptoms: [
    { id: "more_than_intended", title: "More than intended", text: "I use more than I mean to, or for longer than I plan to." },
    { id: "cut_down_failed", title: "Trouble cutting down", text: "I have tried to cut down or stop and found it difficult." },
    { id: "craving", title: "Craving", text: "I experience strong urges or cravings to use." },
    { id: "time_spent", title: "Time spent", text: "A significant amount of time goes into getting, using, recovering, or thinking about use." },
    { id: "role_failure", title: "Responsibilities affected", text: "Use has caused problems in responsibilities or normal roles." },
    { id: "continued_despite_harm", title: "Continued despite harm", text: "I continue despite physical, emotional, or relationship harm." },
    { id: "tolerance", title: "Tolerance", text: "I need more than before to get the same effect, or the same amount affects me less." },
    { id: "withdrawal", title: "Withdrawal or rebound", text: "When I cut down, I have uncomfortable rebound symptoms or feel driven to use again." },
    { id: "unsafe_use", title: "Unsafe use", text: "Use has happened in dangerous, risky, or unsafe situations." },
  ],
  evaluate: ({ answers, presence, presentCount, durationOk, impairmentOk }) => {
    const core = presence.more_than_intended || presence.cut_down_failed || presence.craving;
    const strong = core && presentCount >= 4 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!core) notes.push("The loss-of-control core was not strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 substance-related symptom areas crossed threshold.");
    if (!durationOk) notes.push("A repeated pattern over time was not clearly endorsed.");
    if (!impairmentOk) notes.push("Functional harm or impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong substance-use or loss-of-control pattern that may benefit from professional evaluation."
        : core
          ? "Your answers suggest meaningful substance-related concerns, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad substance-use disorder pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Loss-of-control core", value: core ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 9` },
        { label: "Repeated pattern", value: durationOk ? "Yes" : "No" },
        { label: "Impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
      safetyBox:
        (answers.unsafe_use as number) >= 4 || (answers.withdrawal as number) >= 4
          ? {
              tone: "danger",
              title: "High-risk substance note",
              text: "Your answers suggest severe unsafe use or withdrawal/rebound concerns. Prompt professional or medical support may be important.",
            }
          : null,
    };
  },
};

export default function Level2SubstanceModule() {
  return <GenericLevel2Module config={config} />;
}