"use client";
// src/asq/SupportPage.tsx

import { useMemo, useState } from "react";
import { SupportTab } from "./SupportTab";
import { findStudentByName, getCurrentStudentId, getStudentById, setCurrentStudentId } from "./studentStore";

export default function SupportPage({
  onGoToStudentRecords,
}: {
  onGoToStudentRecords: () => void;
}) {
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState<string>("");

  const sid = useMemo(() => getCurrentStudentId(), []);
  const student = useMemo(() => (sid ? getStudentById(sid) : null), [sid]);

  function selectByName() {
    setError("");
    const rec = findStudentByName(nameInput);
    if (!rec) {
      setError("Student not found. Create/select the student in Student Records first.");
      return;
    }
    setCurrentStudentId(rec.id);
    setNameInput("");
    setError("");
    // SupportTab now runs under the selected student context
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Support / Behavior Log</h1>

      <div style={{ opacity: 0.85, marginBottom: "0.75rem" }}>
        Current student: <b>{student?.displayName ?? "(none selected)"}</b>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <button type="button" onClick={onGoToStudentRecords}>
          Go to Student Records
        </button>

        <div style={{ flex: "1 1 360px", display: "flex", gap: "0.5rem" }}>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Type student name to select (exact match)"
            style={{ flex: 1, padding: "0.45rem 0.6rem", borderRadius: 10, border: "1px solid #d1d5db" }}
          />
          <button type="button" onClick={selectByName} disabled={!nameInput.trim()}>
            Select
          </button>
        </div>
      </div>

      {error ? <div style={{ color: "#b91c1c", marginBottom: "0.75rem" }}>{error}</div> : null}

      {!getCurrentStudentId() ? (
        <div style={{ opacity: 0.75 }}>
          No student selected. Select a student above (or in Student Records) before logging behavior incidents.
        </div>
      ) : (
        <SupportTab />
      )}
    </div>
  );
}
