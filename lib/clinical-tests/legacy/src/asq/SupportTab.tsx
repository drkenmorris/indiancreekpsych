"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/asq/SupportTab.tsx
import { useEffect, useState } from "react";
import { BehaviorLog } from "./BehaviorLog";
import { getCurrentStudentId, getStudentById } from "./studentStore";

type ViewerMode = "PARENT" | "SCHOOL";

/**
 * "Handoff" so BehaviorLog (and any other module) can read
 * which student is currently active for student-scoped storage.
 */
const ACTIVE_STUDENT_LS_KEY = "sentinel_active_student_id_v1";

function syncActiveStudentKey() {
  const sid = getCurrentStudentId();
  if (sid) clinicalSessionStore.setItem(ACTIVE_STUDENT_LS_KEY, sid);
  else clinicalSessionStore.removeItem(ACTIVE_STUDENT_LS_KEY);

  window.dispatchEvent(new Event("sentinel_active_student_changed"));
  return sid;
}

export const SupportTab = () => {
  const [viewerMode, setViewerMode] = useState<ViewerMode>("PARENT");

  // IMPORTANT: keep sid in state so the component updates when student changes.
  const [sid, setSid] = useState<string>(() => getCurrentStudentId());

  useEffect(() => {
    // On mount, make sure our handoff key matches the selected student.
    setSid(syncActiveStudentKey());

    const onUpdate = () => {
      // Student selection changes elsewhere should refresh this UI.
      setSid(syncActiveStudentKey());
    };

    // You already dispatch this elsewhere in your app.
    window.addEventListener("asq_profiles_updated", onUpdate);

    // And we dispatch this when the active student id key is synced.
    window.addEventListener("sentinel_active_student_changed", onUpdate);

    return () => {
      window.removeEventListener("asq_profiles_updated", onUpdate);
      window.removeEventListener("sentinel_active_student_changed", onUpdate);
    };
  }, []);

  const student = sid ? getStudentById(sid) : null;

  // Hard gate: do not allow logging without a selected student.
  if (!sid || !student) {
    return (
      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}>
          Support / Behavior Log
        </h2>
        <p style={{ fontSize: "0.9rem", color: "#4b5563", marginBottom: "0.75rem" }}>
          No student is currently selected. Go to <b>Student Records</b>, select a student,
          then return here to log incidents.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>
        Support / Behavior Log
      </h2>

      <div style={{ fontSize: "0.9rem", color: "#374151", marginBottom: "0.6rem" }}>
        Current student: <b>{student.displayName}</b>
        {student.dob ? <span style={{ opacity: 0.85 }}> • DOB: {student.dob}</span> : null}
        {student.currentSchoolName ? (
          <span style={{ opacity: 0.85 }}> • School: {student.currentSchoolName}</span>
        ) : null}
      </div>

      <p style={{ fontSize: "0.9rem", color: "#4b5563", marginBottom: "0.75rem" }}>
        Use this view to track incidents for the selected student, see patterns over time,
        and generate printable or PDF reports for school teams or caregivers.
      </p>

      {/* View-mode toggle (Parent vs School/Admin) */}
      <div
        style={{
          marginBottom: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>View mode:</div>

        <div
          style={{
            display: "inline-flex",
            borderRadius: "999px",
            border: "1px solid #d1d5db",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setViewerMode("PARENT")}
            style={{
              padding: "0.25rem 0.7rem",
              fontSize: "0.8rem",
              border: "none",
              cursor: "pointer",
              backgroundColor: viewerMode === "PARENT" ? "#4f46e5" : "#ffffff",
              color: viewerMode === "PARENT" ? "#ffffff" : "#111827",
            }}
          >
            Parent view
          </button>

          <button
            type="button"
            onClick={() => setViewerMode("SCHOOL")}
            style={{
              padding: "0.25rem 0.7rem",
              fontSize: "0.8rem",
              border: "none",
              cursor: "pointer",
              backgroundColor: viewerMode === "SCHOOL" ? "#4f46e5" : "#ffffff",
              color: viewerMode === "SCHOOL" ? "#ffffff" : "#111827",
            }}
          >
            School / admin view
          </button>
        </div>
      </div>

      {/* BehaviorLog still owns incident storage; next step is to make it student-scoped */}
      <BehaviorLog viewerMode={viewerMode} />
    </div>
  );
};
