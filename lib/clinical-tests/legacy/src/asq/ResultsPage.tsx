"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/asq/ResultsPage.tsx

import { useEffect, useMemo, useState } from "react";
import {
  buildProfessionalCombinedReport,
  type InformantProfile,
} from "./narrativeEngine";

import {
  getCurrentStudentId,
  setCurrentStudentId,
  upsertStudent,
  getStudentById,
  type StudentRecord,
} from "./studentStore";

const profileKey = (
  studentId: string,
  informant: "student" | "parent" | "teacher"
) => `asq_profile_${informant}_${studentId}_v1`;

function safeParseProfile(raw: string | null): InformantProfile | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    if (!obj.informant || !obj.domains) return null;
    return obj as InformantProfile;
  } catch {
    return null;
  }
}

export default function ResultsPage() {
  const [studentNameInput, setStudentNameInput] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [combinedText, setCombinedText] = useState<string>("");

  // Refresh when any scoring page saves profiles
  useEffect(() => {
    const onUpdate = () => setRefreshKey((k) => k + 1);
    window.addEventListener("asq_profiles_updated", onUpdate);
    return () => window.removeEventListener("asq_profiles_updated", onUpdate);
  }, []);

  const currentStudentId = useMemo(() => {
    void refreshKey;
    return getCurrentStudentId();
  }, [refreshKey]);

  const currentStudent = useMemo<StudentRecord | null>(() => {
    void refreshKey;
    return currentStudentId ? getStudentById(currentStudentId) : null;
  }, [refreshKey, currentStudentId]);

  const profiles = useMemo(() => {
    void refreshKey;
    if (!currentStudentId) return { student: null, parent: null, teacher: null };

    const student = safeParseProfile(
      clinicalSessionStore.getItem(profileKey(currentStudentId, "student"))
    );
    const parent = safeParseProfile(
      clinicalSessionStore.getItem(profileKey(currentStudentId, "parent"))
    );
    const teacher = safeParseProfile(
      clinicalSessionStore.getItem(profileKey(currentStudentId, "teacher"))
    );

    return { student, parent, teacher };
  }, [refreshKey, currentStudentId]);

  function handleCreateOrSelectStudent() {
    const rec = upsertStudent(studentNameInput);
    setStudentNameInput("");
    setCombinedText("");
    setCurrentStudentId(rec.id);
    setRefreshKey((k) => k + 1);
  }

  function clearCurrentStudent() {
    setCurrentStudentId("");
    setCombinedText("");
    setRefreshKey((k) => k + 1);
  }

  function generateCombined() {
    if (!currentStudentId) {
      setCombinedText("No student selected. Create/select a student first.");
      return;
    }

    const studentDisplayName = currentStudent?.displayName ?? "Unnamed Student";

    const report = buildProfessionalCombinedReport(studentDisplayName, {
      student: profiles.student ?? undefined,
      parent: profiles.parent ?? undefined,
      teacher: profiles.teacher ?? undefined,
    });

    setCombinedText(report);
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "1rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>ASQ Results — Combined / Comparative</h1>

      <div style={{ opacity: 0.8, marginBottom: "1rem" }}>
        Create/select a student by name (no student list is shown). Then generate a combined report
        using Student/Parent/Teacher profiles saved for that student.
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "0.75rem",
          background: "#fff",
          marginBottom: "1rem",
        }}
      >
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
          <button onClick={handleCreateOrSelectStudent} disabled={!studentNameInput.trim()} type="button">
            Create/Select Student
          </button>

          <button onClick={clearCurrentStudent} type="button" style={{ opacity: 0.9 }}>
            Clear Selection
          </button>
        </div>

        <div style={{ marginTop: "0.25rem", fontSize: "0.92rem", opacity: 0.9 }}>
          Current student: <b>{currentStudent?.displayName ?? "(none selected)"}</b>
        </div>

        <div style={{ marginTop: "0.5rem", fontSize: "0.9rem", opacity: 0.85 }}>
          Saved profiles for this student:
          <ul style={{ marginTop: "0.25rem" }}>
            <li>Student: {profiles.student ? "✅" : "—"}</li>
            <li>Parent: {profiles.parent ? "✅" : "—"}</li>
            <li>Teacher: {profiles.teacher ? "✅" : "—"}</li>
          </ul>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button onClick={() => setRefreshKey((k) => k + 1)} type="button">
          Refresh
        </button>
        <button onClick={generateCombined} disabled={!currentStudentId} type="button">
          Generate Combined Report
        </button>
      </div>

      {combinedText ? (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "0.9rem",
            lineHeight: 1.45,
            fontSize: "0.88rem",
          }}
        >
          {combinedText}
        </pre>
      ) : (
        <div style={{ opacity: 0.7 }}>
          Click <b>Generate Combined Report</b> to produce the comparative + extensive narrative.
        </div>
      )}
    </div>
  );
}
