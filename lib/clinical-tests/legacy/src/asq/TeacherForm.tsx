"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/asq/TeacherForm.tsx

import React, { useMemo, useState, useEffect } from "react";
import { AUTISM_ITEMS_TEACHER } from "../assessments/autism/items/autismItemsTeacher";
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

type AutismTeacherItem = (typeof AUTISM_ITEMS_TEACHER)[number];

type TeacherResponses = Record<string, LikertValue>;

const LS_TEACHER_RESPONSES = "asq_teacher_responses_v1";
const profileKey = (studentId: string) => `asq_profile_teacher_${studentId}_v1`;

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "0.75rem",
  background: "#fff",
  marginBottom: "1rem",
};

function safeParseResponses(raw: string | null): TeacherResponses {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    return obj as TeacherResponses;
  } catch {
    return {};
  }
}

function computeDomainMeans(
  items: Array<{
    id: string;
    domain: string;
    isScorable?: boolean;
    reverseKey?: boolean;
    reverse?: boolean;
  }>,
  responses: TeacherResponses
): DomainMean[] {
  const buckets = new Map<string, { sum: number; count: number }>();

  for (const it of items) {
    if (it.isScorable === false) continue;

    const v = responses[it.id];
    if (v === undefined || v === null) continue;

    const raw = Number(v);
    if (Number.isNaN(raw) || raw < 0 || raw > 4) continue;

    const reversed = Boolean(it.reverseKey ?? it.reverse);
    const scored = reversed ? (4 - raw) : raw;

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

export const TeacherForm: React.FC = () => {
  const teacherItems = useMemo<AutismTeacherItem[]>(
    () => AUTISM_ITEMS_TEACHER as AutismTeacherItem[],
    []
  );

  const totalCount = teacherItems.length;

  const [responses, setResponses] = useState<TeacherResponses>({});
  const [reportText, setReportText] = useState<string>("");

  // ✅ Student selector state (same pattern as ParentForm update)
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

  useEffect(() => {
    setResponses(safeParseResponses(clinicalSessionStore.getItem(LS_TEACHER_RESPONSES)));
  }, []);

  useEffect(() => {
    clinicalSessionStore.setItem(LS_TEACHER_RESPONSES, JSON.stringify(responses));
  }, [responses]);

  const answeredCount = teacherItems.filter(
    (item) => responses[item.id] !== undefined && responses[item.id] !== null
  ).length;

  const handleChange = (id: string | number, value: LikertValue) => {
    const key = String(id);
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const handleScore = () => {
    const sid = getCurrentStudentId();
    if (!sid) {
      alert("No student selected. Create/select a student first.");
      return;
    }

    const domains = computeDomainMeans(teacherItems, responses);

    const profile: InformantProfile = {
      informant: "Teacher",
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
        Teacher Questionnaire
      </h2>

      {/* ✅ Create/Select Student control (like ResultsPage) */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Student</div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "0.75rem",
          }}
        >
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

      <div
        style={{
          marginBottom: "0.75rem",
          padding: "0.5rem 0.75rem",
          borderRadius: 12,
          backgroundColor: "#eff6ff",
          fontSize: "0.85rem",
        }}
      >
        Answered {answeredCount} of {totalCount} items.
      </div>

      {teacherItems.map((it: AutismTeacherItem) => (
        <LikertQuestion
          key={it.id}
          id={it.id}
          text={it.prompt ?? ""}
          value={responses[it.id] ?? null}
          onChange={handleChange}
        />
      ))}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
        <button type="button" onClick={handleScore} disabled={answeredCount === 0}>
          Score Teacher &amp; Generate Narrative (Save to Selected Student)
        </button>

        {/* Optional: quick manual refresh in case other pages changed selection */}
        <button type="button" onClick={() => setRefreshKey((k) => k + 1)} style={{ opacity: 0.9 }}>
          Refresh Student Selection
        </button>
      </div>

      {reportText ? (
        <div style={{ marginTop: "1rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            Teacher Narrative Output
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
