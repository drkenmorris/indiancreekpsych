"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/asq/SelfForm.tsx

import { useMemo, useState, useEffect } from "react";
import { AUTISM_ITEMS_SELF } from "../assessments/autism/items/autismItemsSelf";
import { LikertQuestion } from "./LikertQuestion";
import type { LikertValue } from "./LikertQuestion";

import {
  buildInformantNarrative,
  type DomainMean,
  type InformantProfile,
} from "./narrativeEngine";

import { getCurrentStudentId } from "./studentStore";

type SelfResponses = Record<string, LikertValue>;

const LS_SELF_RESPONSES = "asq_self_responses_v1";
const profileKey = (studentId: string) => `asq_profile_student_${studentId}_v1`;

function safeParseResponses(raw: string | null): SelfResponses {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    return obj as SelfResponses;
  } catch {
    return {};
  }
}

function computeDomainMeans(
  items: { id: string; domain: string; reverse?: boolean }[],
  responses: SelfResponses
): DomainMean[] {
  const buckets = new Map<string, { sum: number; count: number }>();

  for (const it of items) {
    const v = responses[it.id];
    if (v === undefined || v === null) continue;

    const scored = it.reverse ? 3 - v : v;

    const b = buckets.get(it.domain) ?? { sum: 0, count: 0 };
    b.sum += scored;
    b.count += 1;
    buckets.set(it.domain, b);
  }

  return Array.from(buckets.entries())
    .map(([domain, b]) => ({
      domain,
      answeredCount: b.count,
      mean: b.count ? b.sum / b.count : null,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}

export const SelfForm = () => {
  const selfItems = useMemo(() => AUTISM_ITEMS_SELF, []);
  const totalCount = selfItems.length;

  const [responses, setResponses] = useState<SelfResponses>({});
  const [reportText, setReportText] = useState<string>("");

  useEffect(() => {
    setResponses(safeParseResponses(clinicalSessionStore.getItem(LS_SELF_RESPONSES)));
  }, []);

  useEffect(() => {
    clinicalSessionStore.setItem(LS_SELF_RESPONSES, JSON.stringify(responses));
  }, [responses]);

  const answeredCount = selfItems.filter(
    (item) => responses[item.id] !== undefined && responses[item.id] !== null
  ).length;

  const handleChange = (id: string | number, value: LikertValue) => {
    const key = String(id);
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const handleScore = () => {
    const sid = getCurrentStudentId();
    if (!sid) {
      alert(
        "No student selected. Go to Combined Results and Create/Select a student first."
      );
      return;
    }

    const domains = computeDomainMeans(selfItems, responses);

    const profile: InformantProfile = {
      informant: "Student",
      answeredCount,
      totalCount,
      domains,
    };

    clinicalSessionStore.setItem(profileKey(sid), JSON.stringify(profile));

    const narrative = buildInformantNarrative(profile);
    setReportText(narrative);
    clinicalSessionStore.setItem(`asq_narrative_student_${sid}_v1`, narrative);
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
        Student / Self-Report Questionnaire
      </h2>

      <div
        style={{
          marginBottom: "0.75rem",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          backgroundColor: "#ecfdf5",
          fontSize: "0.85rem",
        }}
      >
        Answered {answeredCount} of {totalCount} items.
      </div>

      {selfItems.map((item) => (
        <LikertQuestion
          key={item.id}
          id={item.id}
          text={item.text ?? item.prompt ?? ""}
          value={responses[item.id] ?? null}
          onChange={handleChange}
        />
      ))}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
        <button type="button" onClick={handleScore} disabled={answeredCount === 0}>
          Score Student &amp; Generate Narrative (Save to Selected Student)
        </button>
      </div>

      {reportText ? (
        <div style={{ marginTop: "1rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            Student Narrative Output
          </h3>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: "0.75rem",
              lineHeight: 1.4,
              fontSize: "0.85rem",
            }}
          >
            {reportText}
          </pre>
        </div>
      ) : null}
    </div>
  );
};
