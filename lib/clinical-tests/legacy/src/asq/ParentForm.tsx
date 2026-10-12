"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/asq/ParentForm.tsx

import React, { useMemo, useState } from "react";
import { parentItems } from "./parentItems";
import { LikertQuestion } from "./LikertQuestion";
import type { LikertValue } from "./LikertQuestion";

import {
  buildInformantNarrative,
  type DomainMean,
  type InformantProfile,
} from "./narrativeEngine";

import {
  getCurrentStudentId,
  setCurrentStudentId,
  upsertStudent,
  getStudentById,
  type StudentRecord,
} from "./studentStore";

// NOTE: ParentForm currently saves to this key. Your ResultsPage uses a different key pattern.
// We are leaving this unchanged to avoid breaking existing saved parent profiles.
// If you want, item #2 can be unifying key patterns across pages.
const profileKey = (studentId: string) => `asq_profile_parent_${studentId}_v1`;

type ParentResponses = Record<number, LikertValue>;

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "0.75rem",
  background: "#fff",
  marginBottom: "1rem",
};

const progressStyle: React.CSSProperties = {
  marginBottom: "0.75rem",
  padding: "0.5rem 0.75rem",
  borderRadius: 12,
  background: "#eff6ff",
  fontSize: "0.85rem",
};

const reportBoxStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "0.75rem",
  lineHeight: 1.4,
  fontSize: "0.85rem",
};

function computeDomainMeans(items: any[], responses: ParentResponses): DomainMean[] {
  const buckets = new Map<string, { sum: number; count: number }>();

  for (const it of items) {
    const id = it.id as number;
    const v = responses[id];
    if (v === undefined || v === null) continue;

    const domain = String(it.domain ?? it.construct ?? it.subscale ?? "Overall");
    const scored = it.reverse ? (3 - v) : v;

    const b = buckets.get(domain) ?? { sum: 0, count: 0 };
    b.sum += scored;
    b.count += 1;
    buckets.set(domain, b);
  }

  return Array.from(buckets.entries())
    .map(([domain, b]) => ({
      domain,
      answeredCount: b.count,
      mean: b.count ? b.sum / b.count : null,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}

export const ParentForm: React.FC = () => {
  const items = useMemo(() => parentItems, []);
  const totalCount = items.length;

  const [responses, setResponses] = useState<ParentResponses>({});
  const [reportText, setReportText] = useState<string>("");

  // ✅ Student selector state (mirrors ResultsPage behavior)
  const [studentNameInput, setStudentNameInput] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Current student (re-read whenever refreshKey changes)
  const currentStudentId = useMemo(() => {
    void refreshKey;
    return getCurrentStudentId();
  }, [refreshKey]);

  const currentStudent = useMemo<StudentRecord | null>(() => {
    void refreshKey;
    return currentStudentId ? getStudentById(currentStudentId) : null;
  }, [refreshKey, currentStudentId]);

  function handleCreateOrSelectStudent() {
    const rec = upsertStudent(studentNameInput);
    setStudentNameInput("");
    setReportText(""); // optional: clear narrative when switching student
    setCurrentStudentId(rec.id);
    setRefreshKey((k) => k + 1);
  }

  function clearCurrentStudent() {
    setCurrentStudentId("");
    setReportText("");
    setRefreshKey((k) => k + 1);
  }

  const handleChange = (id: string | number, value: LikertValue) => {
    const numericId = typeof id === "string" ? Number(id) : id;
    if (!Number.isFinite(numericId)) return;
    setResponses((prev) => ({ ...prev, [numericId]: value }));
  };

  const answeredCount = items.filter(
    (it: any) => responses[it.id] !== undefined && responses[it.id] !== null
  ).length;

  const handleScore = () => {
    const sid = getCurrentStudentId();
    if (!sid) {
      alert("No student selected. Create/select a student first.");
      return;
    }

    const domains = computeDomainMeans(items as any[], responses);

    const profile: InformantProfile = {
      informant: "Parent",
      answeredCount,
      totalCount,
      domains,
    };

    clinicalSessionStore.setItem(profileKey(sid), JSON.stringify(profile));

    // Optional: tell ResultsPage to refresh if it's open
    window.dispatchEvent(new Event("asq_profiles_updated"));

    const narrative = buildInformantNarrative(profile);
    setReportText(narrative);
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>
        Parent Questionnaire
      </h2>

      {/* ✅ REPLACED: Create/Select Student control (like ResultsPage) */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Student</div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <input
            value={studentNameInput}
            onChange={(e) => setStudentNameInput(e.target.value)}
            placeholder="Enter student name (e.g., 'A. Smith')"
            style={{
              flex: "1 1 260px",
              padding: "0.45rem 0.6rem",
              borderRadius: 10,
              border: "1px solid #d1d5db",
            }}
          />

          <button
            onClick={handleCreateOrSelectStudent}
            disabled={!studentNameInput.trim()}
            type="button"
          >
            Create/Select Student
          </button>

          <button onClick={clearCurrentStudent} type="button" style={{ opacity: 0.9 }}>
            Clear Selection
          </button>
        </div>

        <div style={{ marginTop: "0.25rem", fontSize: "0.92rem", opacity: 0.9 }}>
          Current student: <b>{currentStudent?.displayName ?? "(none selected)"}</b>
        </div>
      </div>

      <div style={progressStyle}>
        Answered {answeredCount} of {totalCount} items.
      </div>

      {items.map((item: any) => (
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
          Score Parent &amp; Generate Narrative (Save to Selected Student)
        </button>

        {/* Optional: quick manual refresh in case other pages changed selection */}
        <button type="button" onClick={() => setRefreshKey((k) => k + 1)} style={{ opacity: 0.9 }}>
          Refresh Student Selection
        </button>
      </div>

      {reportText ? (
        <div style={{ marginTop: "1rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            Parent Narrative Output
          </h3>
          <pre style={reportBoxStyle}>{reportText}</pre>
        </div>
      ) : null}
    </div>
  );
};
