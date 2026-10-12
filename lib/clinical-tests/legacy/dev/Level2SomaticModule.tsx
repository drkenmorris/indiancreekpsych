"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import GenericLevel2Module from "./Level2Shared";
import type { GenericLevel2Config } from "./Level2Shared";

const config: GenericLevel2Config = {
  currentDomain: "somatic",
  storageKey: "asq_level2_somatic_answers",
  pageTitle: "Level 2 — Body Concerns & Health Worry Check",
  introText: "This is a self-check to understand distress related to physical symptoms, bodily sensations, and health worry. It is not a diagnosis.",
  mainHeader: "Body and health-focus pattern",
  durationField: {
    id: "duration_months",
    title: "Duration",
    text: "This pattern has been present for a substantial period of time rather than only briefly.",
    threshold: 3,
  },
  impactField: {
    id: "impairment",
    title: "Impact",
    text: "This pattern interferes with daily life, relationships, work, reassurance-seeking, or mental peace.",
    threshold: 2,
  },
  contextCards: [
    {
      id: "medical_condition_present",
      title: "Real medical issue also present?",
      text: "Do you have a genuine medical condition or symptoms that are real, but the level of worry and preoccupation may still be unusually high?",
      label: "Possibly",
    },
    {
      id: "multiple_reassurance_sources",
      title: "Repeated reassurance-seeking?",
      text: "Have you repeatedly checked symptoms, searched online, or sought reassurance from multiple people or providers?",
      label: "Yes",
    },
  ],
  symptoms: [
    { id: "body_preoccupation", title: "Body preoccupation", text: "Physical symptoms or body sensations become a major focus of my attention." },
    { id: "health_worry", title: "Health worry", text: "I often worry that normal sensations or minor symptoms could mean something serious." },
    { id: "checking", title: "Checking", text: "I repeatedly monitor, inspect, or check my body for signs of illness." },
    { id: "internet_research", title: "Searching for answers", text: "I spend significant time researching symptoms or illnesses online." },
    { id: "reassurance", title: "Reassurance-seeking", text: "I repeatedly seek reassurance from others or providers about my health." },
    { id: "catastrophic_interpretation", title: "Catastrophic interpretation", text: "I tend to quickly assume bodily symptoms could mean something severe or dangerous." },
    { id: "avoidance", title: "Avoidance", text: "I avoid activities, foods, exercise, travel, or responsibilities because I fear symptoms or illness." },
    { id: "distress_about_symptoms", title: "Distress", text: "Even when others are not alarmed, my symptoms cause me intense distress or fear." },
    { id: "time_cost", title: "Time cost", text: "Health-related worry or checking takes a large amount of time or mental energy." },
  ],
  evaluate: ({ presence, presentCount, durationOk, impairmentOk }) => {
    const core = presence.body_preoccupation || presence.health_worry || presence.distress_about_symptoms;
    const strong = core && presentCount >= 4 && durationOk && impairmentOk;
    const notes: string[] = [];
    if (!core) notes.push("The body-concern/health-worry core was not strongly endorsed.");
    if (presentCount < 4) notes.push("Fewer than 4 somatic symptom-related areas crossed threshold.");
    if (!durationOk) notes.push("Longer duration was not clearly endorsed.");
    if (!impairmentOk) notes.push("Functional impact was not clearly endorsed.");

    return {
      summary: strong
        ? "Your answers suggest a strong pattern of distress focused on symptoms, health worry, or bodily sensations that may benefit from professional evaluation."
        : core
          ? "Your answers suggest meaningful body-concern or health-worry symptoms, though they do not reach the strongest threshold in this screener."
          : "Your answers do not strongly suggest a broad somatic symptom-related pattern based on this screener.",
      notes,
      scoreRows: [
        { label: "Body-concern core", value: core ? "Yes" : "No" },
        { label: "Symptoms crossing threshold", value: `${presentCount} / 9` },
        { label: "Duration", value: durationOk ? "Yes" : "No" },
        { label: "Impact", value: impairmentOk ? "Yes" : "No" },
        { label: "Pattern", value: strong ? "Strong" : "Not strong" },
      ],
    };
  },
};

export default function Level2SomaticModule() {
  return <GenericLevel2Module config={config} />;
}