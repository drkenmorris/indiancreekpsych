"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module from "./Level2Shared";
import type { GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "sleep",
  storageKey: "asq_level2_sleep_answers",
  pageTitle: "Level 2 — Sleep & Daytime Energy Check",
  introText: "This is a self-check to understand persistent sleep and wakefulness problems. It is not a diagnosis.",
  mainHeader: "Sleep and wake pattern",
  durationField: {
    id: "duration_months",
    title: "Duration",
    text: "This sleep pattern has been present for a substantial period of time rather than only briefly.",
    threshold: 3,
  },
  impactField: {
    id: "impairment",
    title: "Impact",
    text: "This pattern affects energy, concentration, mood, safety, work, or daily functioning.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "schedule_context",
      title: "Schedule-related context?",
      text: "Could this be mainly due to shift work, irregular scheduling, parenting demands, or lifestyle rhythm disruptions?",
      label: "Possibly",
    },
    {
      id: "medical_sleep_context",
      title: "Medical sleep context?",
      text: "Could this relate to pain, breathing problems, medications, substances, or another medical issue?",
      label: "Possibly",
    },
  ],
  symptoms: [
    { id: "falling_asleep", title: "Trouble falling asleep", text: "I often have significant trouble falling asleep." },
    { id: "staying_asleep", title: "Trouble staying asleep", text: "I often wake during the night and struggle to return to sleep." },
    { id: "early_waking", title: "Waking too early", text: "I often wake too early and cannot return to sleep." },
    { id: "too_much_sleep", title: "Sleeping too much", text: "I may sleep far more than expected and still not feel restored." },
    { id: "unrefreshing", title: "Unrefreshing sleep", text: "Even when I sleep enough hours, the sleep often does not feel refreshing." },
    { id: "daytime_sleepiness", title: "Daytime sleepiness", text: "I struggle with sleepiness, fatigue, or nodding off during the day." },
    { id: "sleep_anxiety", title: "Anxiety about sleep", text: "Worry about sleep itself has become part of the problem." },
    { id: "safety_risk", title: "Safety or functioning risk", text: "Sleep problems have affected driving, concentration, work, or safety." },
  ],
  evaluate: ({ answers, presence, presentCount, durationOk, impairmentOk }) => {
    const core = presence.falling_asleep || presence.staying_asleep || presence.early_waking || presence.daytime_sleepiness || presence.too_much_sleep;
    const strong = core && presentCount >= 4 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!core) notes.push("The core sleep/wake concern was not strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 sleep-related symptom areas crossed threshold.");
    if (!durationOk) notes.push("Longer duration was not clearly endorsed.");
    if (!impairmentOk) notes.push("Functional impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong sleep or wakefulness pattern that may benefit from professional evaluation."
        : core
          ? "Your answers suggest meaningful sleep-related concerns, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad sleep-wake pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Sleep/wake core", value: core ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 8` },
        { label: "Duration", value: durationOk ? "Yes" : "No" },
        { label: "Impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
      safetyBox:
        (answers.safety_risk as number) >= 4
          ? {
              tone: "warning",
              title: "Sleep safety note",
              text: "Your answers suggest sleep may be affecting concentration, driving, or daily safety. A professional sleep or medical evaluation may be important.",
            }
          : null,
    };
  },
};

export default function Level2SleepModule() {
  return <GenericLevel2Module config={config} />;
}