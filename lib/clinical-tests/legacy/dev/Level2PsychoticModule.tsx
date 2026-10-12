"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module from "./Level2Shared";
import type { GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "psychotic",
  storageKey: "asq_level2_psychotic_answers",
  pageTitle: "Level 2 — Unusual Perceptions & Beliefs Check",
  introText: "This is a self-check to understand unusual perception, belief, and thought-organization patterns. It is not a diagnosis.",
  mainHeader: "Reality-perception pattern",
  durationField: {
    id: "duration_recent",
    title: "Duration",
    text: "These experiences have happened more than briefly or only once.",
    threshold: 3,
  },
  impactField: {
    id: "impairment",
    title: "Impact",
    text: "These experiences interfere with functioning, safety, relationships, or clear thinking.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "sleep_substance_context",
      title: "Substance, sleep, or medical context?",
      text: "Could these experiences be related to sleep loss, substances, medication effects, fever, neurological issues, or another medical condition?",
      label: "Possibly",
    },
    {
      id: "trauma_context",
      title: "Trauma-related context?",
      text: "Do these experiences tend to happen mainly during trauma reminders, panic, or extreme stress?",
      label: "Possibly",
    },
  ],
  symptoms: [
    { id: "voices", title: "Hearing things", text: "I have heard voices or sounds that others around me did not seem to hear." },
    { id: "visions", title: "Seeing things", text: "I have seen things, shadows, figures, or visual events that others around me did not seem to see." },
    { id: "strong_beliefs", title: "Fixed beliefs", text: "I have had beliefs that felt completely certain even when others strongly disagreed or said they were unlikely." },
    { id: "suspiciousness", title: "Suspiciousness", text: "I have felt strongly that people were watching me, talking about me, or trying to harm me." },
    { id: "thought_confusion", title: "Thought confusion", text: "My thoughts have at times felt jumbled, hard to organize, or hard to communicate clearly." },
    { id: "thought_influence", title: "Thought influence", text: "I have felt as if thoughts were being inserted, removed, read, or influenced in unusual ways." },
    { id: "flatness_withdrawal", title: "Withdrawal or flatness", text: "I have become markedly withdrawn, emotionally flat, or disconnected from normal life compared to my earlier self." },
    { id: "disorganized_behavior", title: "Disorganized behavior", text: "Others may have seen me as acting very oddly, disorganized, or hard to follow." },
    { id: "function_drop", title: "Drop in functioning", text: "My overall functioning has noticeably dropped during periods when these experiences were stronger." },
  ],
  evaluate: ({ answers, presence, presentCount, durationOk, impairmentOk }) => {
    const perceptionCore = presence.voices || presence.visions;
    const beliefCore = presence.strong_beliefs || presence.suspiciousness || presence.thought_influence;
    const strong = (perceptionCore || beliefCore) && presentCount >= 4 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!(perceptionCore || beliefCore)) notes.push("The unusual perception/belief core was not strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 psychosis-related symptom areas crossed threshold.");
    if (!durationOk) notes.push("The pattern was not clearly endorsed as more than brief or one-time.");
    if (!impairmentOk) notes.push("Functional impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong unusual-perception or belief pattern that may warrant prompt professional evaluation."
        : perceptionCore || beliefCore
          ? "Your answers suggest meaningful unusual perception or belief experiences, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad psychosis-related pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Perception/belief core", value: perceptionCore || beliefCore ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 9` },
        { label: "Duration", value: durationOk ? "Yes" : "No" },
        { label: "Impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
      safetyBox:
        (answers.voices as number) >= 4 || (answers.disorganized_behavior as number) >= 4
          ? {
              tone: "danger",
              title: "Urgent evaluation note",
              text: "Your answers suggest intense unusual-perception or thought-disorganization symptoms. If this is current, worsening, or affecting safety, urgent professional help is recommended.",
            }
          : null,
    };
  },
};

export default function Level2PsychoticModule() {
  return <GenericLevel2Module config={config} />;
}