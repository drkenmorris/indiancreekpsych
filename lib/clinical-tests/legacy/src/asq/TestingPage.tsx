"use client";
// src/asq/TestingPage.tsx

import { useMemo } from "react";
import { getCurrentStudentId, getStudentById } from "./studentStore";

export default function TestingPage({
  onOpenAsqParent,
  onOpenAsqTeacher,
  onOpenAsqResults,
  onOpenStudentAsq,
}: {
  onOpenAsqParent: () => void;
  onOpenAsqTeacher: () => void;
  onOpenAsqResults: () => void;
  onOpenStudentAsq: () => void;
}) {
  const sid = useMemo(() => getCurrentStudentId(), []);
  const student = useMemo(() => (sid ? getStudentById(sid) : null), [sid]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "1rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Testing</h1>
      <div style={{ opacity: 0.8, marginBottom: "1rem" }}>
        Current student: <b>{student?.displayName ?? "(none selected)"}</b>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.75rem", background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: "0.25rem" }}>ASQ — Autism (Student/Parent/Teacher)</div>
        <div style={{ opacity: 0.8, marginBottom: "0.75rem" }}>
          Collects three informant profiles and generates a combined comparative narrative.
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" onClick={onOpenStudentAsq}>Student ASQ</button>
          <button type="button" onClick={onOpenAsqParent}>Parent ASQ</button>
          <button type="button" onClick={onOpenAsqTeacher}>Teacher ASQ</button>
          <button type="button" onClick={onOpenAsqResults}>ASQ Results / Comparison</button>
        </div>
      </div>
    </div>
  );
}
