"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module, { type GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "neurocognitive",
  storageKey: "asq_level2_neurocognitive_answers",
  pageTitle: "Level 2 — Memory & Thinking Changes Check",
  introText: "This is a self-check to understand noticeable changes in memory and thinking compared with your earlier baseline. It is not a diagnosis.",
  mainHeader: "Cognitive-change pattern",
  durationField: {
    id: "duration_pattern",
    title: "Duration",
    text: "These changes have been persistent enough to stand out over time rather than only briefly.",
    threshold: 3,
  },
  impactField: {
    id: "impairment",
    title: "Impact",
    text: "These changes affect finances, medication management, driving, work, safety, or daily functioning.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "medical_context",
      title: "Medical context?",
      text: "Could this be related to medical illness, head injury, sleep apnea, medication effects, substances, or neurological conditions?",
      label: "Possibly",
    },
    {
      id: "others_noticed",
      title: "Others noticed changes?",
      text: "Have people close to you also noticed these memory or thinking changes?",
      label: "Yes",
    },
  ],
  symptoms: [
    { id: "memory_decline", title: "Memory decline", text: "My memory feels noticeably worse than it used to be." },
    { id: "attention_decline", title: "Attention decline", text: "I am less able to sustain attention or keep track of tasks than before." },
    { id: "word_finding", title: "Word-finding difficulty", text: "I more often struggle to find words or keep language clear." },
    { id: "executive_decline", title: "Planning/executive difficulty", text: "Planning, judgment, sequencing, or problem-solving feels harder than before." },
    { id: "orientation_confusion", title: "Disorientation", text: "I sometimes feel more confused about time, place, or what I was doing." },
    { id: "slowed_thinking", title: "Slowed thinking", text: "My thinking feels slower or less efficient than it used to be." },
    { id: "daily_task_errors", title: "Errors in daily tasks", text: "I make more mistakes in normal daily tasks than I used to." },
    { id: "function_drop", title: "Drop in functioning", text: "My independence or overall functioning has dropped because of these changes." },
  ],
  evaluate: ({ answers, presence, presentCount, durationOk, impairmentOk }) => {
    const core = presence.memory_decline || presence.executive_decline || presence.daily_task_errors || presence.function_drop;
    const strong = core && presentCount >= 4 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!core) notes.push("A central cognitive-change core was not strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 neurocognitive symptom areas crossed threshold.");
    if (!durationOk) notes.push("Persistent change over time was not clearly endorsed.");
    if (!impairmentOk) notes.push("Daily-life impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong memory or thinking-change pattern that may benefit from prompt medical and/or neuropsychological evaluation."
        : core
          ? "Your answers suggest meaningful cognitive concerns, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad neurocognitive pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Cognitive-change core", value: core ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 8` },
        { label: "Persistent over time", value: durationOk ? "Yes" : "No" },
        { label: "Impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
      safetyBox:
        (answers.function_drop as number) >= 4 || (answers.orientation_confusion as number) >= 4
          ? {
              tone: "danger",
              title: "Medical follow-up note",
              text: "Your answers suggest potentially significant cognitive-function concerns. Medical or neuropsychological follow-up is recommended, especially if safety or independence is affected.",
            }
          : null,
    };
  },
};

export default function Level2NeurocognitiveModule() {
  return <GenericLevel2Module config={config} />;
}