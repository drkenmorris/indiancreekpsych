"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/asq/StudentRecordsPage.tsx

import { useEffect, useMemo, useState } from "react";
import {
  getCurrentStudentId,
  setCurrentStudentId,
  upsertStudent,
  getStudentById,
  type StudentRecord,
} from "./studentStore";

type StudentDemographics = {
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;

  studentPhone: string;
  studentAddress: string;

  motherName: string;
  motherEmail: string;

  fatherName: string;
  fatherEmail: string;

  caretakerName: string;
  caretakerEmail: string;

  homeroomTeacherName: string;
  schoolCounselorName: string;
  principalName: string;

  outsideCounselorName: string;
  outsideCounselorPhone: string;

  currentSchoolName: string;
  currentSchoolAddress: string;
  currentSchoolPhone: string;

  pastSchools: string;
  notes: string;
};

const DEFAULT_DEMO: StudentDemographics = {
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",

  studentPhone: "",
  studentAddress: "",

  motherName: "",
  motherEmail: "",

  fatherName: "",
  fatherEmail: "",

  caretakerName: "",
  caretakerEmail: "",

  homeroomTeacherName: "",
  schoolCounselorName: "",
  principalName: "",

  outsideCounselorName: "",
  outsideCounselorPhone: "",

  currentSchoolName: "",
  currentSchoolAddress: "",
  currentSchoolPhone: "",

  pastSchools: "",
  notes: "",
};

function demoKey(studentId: string) {
  return `sentinel_student_demo_${studentId}_v1`;
}

function safeParseDemo(raw: string | null): StudentDemographics {
  if (!raw) return { ...DEFAULT_DEMO };
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return { ...DEFAULT_DEMO };
    return { ...DEFAULT_DEMO, ...(obj as Partial<StudentDemographics>) };
  } catch {
    return { ...DEFAULT_DEMO };
  }
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { label, value, onChange, placeholder } = props;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#111827" }}>
        {label}
      </label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "0.5rem 0.65rem",
          borderRadius: 10,
          border: "1px solid #d1d5db",
          fontSize: "0.9rem",
        }}
      />
    </div>
  );
}

function TextArea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { label, value, onChange, placeholder } = props;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#111827" }}>
        {label}
      </label>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{
          width: "100%",
          padding: "0.55rem 0.65rem",
          borderRadius: 10,
          border: "1px solid #d1d5db",
          fontSize: "0.9rem",
          lineHeight: 1.35,
        }}
      />
    </div>
  );
}

export default function StudentRecordsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Create/select student without exposing list of names
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");

  const currentStudentId = useMemo(() => {
    void refreshKey;
    return getCurrentStudentId();
  }, [refreshKey]);

  const currentStudent = useMemo<StudentRecord | null>(() => {
    void refreshKey;
    return currentStudentId ? getStudentById(currentStudentId) : null;
  }, [refreshKey, currentStudentId]);

  const [demo, setDemo] = useState<StudentDemographics>({ ...DEFAULT_DEMO });
  const [status, setStatus] = useState<string>("");

  // Load demo when selected student changes
  useEffect(() => {
    if (!currentStudentId) {
      setDemo({ ...DEFAULT_DEMO });
      return;
    }
    const loaded = safeParseDemo(clinicalSessionStore.getItem(demoKey(currentStudentId)));
    setDemo(loaded);
  }, [currentStudentId]);

  function createAndSelectStudent() {
    const first = newFirst.trim();
    const last = newLast.trim();
    if (!first || !last) {
      setStatus("Enter at least a first and last name to create a record.");
      return;
    }

    // Use a minimal displayName for the store (tests can show this)
    const displayName = `${first} ${last}`.trim();
    const rec = upsertStudent(displayName);
    setCurrentStudentId(rec.id);

    // seed demographics using the split fields
    const seeded: StudentDemographics = {
      ...DEFAULT_DEMO,
      firstName: first,
      lastName: last,
    };
    clinicalSessionStore.setItem(demoKey(rec.id), JSON.stringify(seeded));

    setNewFirst("");
    setNewLast("");
    setStatus("Student record created and selected.");
    setRefreshKey((k) => k + 1);
    window.dispatchEvent(new Event("sentinel_student_changed"));
  }

  function clearCurrentStudent() {
    setCurrentStudentId("");
    setStatus("");
    setRefreshKey((k) => k + 1);
    window.dispatchEvent(new Event("sentinel_student_changed"));
  }

  function saveDemographics() {
    if (!currentStudentId) {
      setStatus("No student selected.");
      return;
    }
    clinicalSessionStore.setItem(demoKey(currentStudentId), JSON.stringify(demo));
    setStatus("Saved.");
  }

  function clearDemographics() {
    if (!currentStudentId) return;
    clinicalSessionStore.removeItem(demoKey(currentStudentId));
    setDemo({ ...DEFAULT_DEMO });
    setStatus("Cleared demographics for this student.");
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Student Records</h1>
      <div style={{ opacity: 0.8, marginBottom: "1rem" }}>
        Create/select a student here. Testing + behavior logging will use the{" "}
        <b>current student</b> selection.
      </div>

      {/* Create */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "0.9rem",
          background: "#fff",
          marginBottom: "1rem",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10 }}>
          Create student (minimal)
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10 }}>
          <Field
            label="First name"
            value={newFirst}
            onChange={setNewFirst}
            placeholder="e.g., Aiden"
          />
          <Field
            label="Last name"
            value={newLast}
            onChange={setNewLast}
            placeholder="e.g., Smith"
          />
          <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
            <button type="button" onClick={createAndSelectStudent}>
              Create &amp; Select
            </button>
            <button type="button" onClick={clearCurrentStudent} disabled={!currentStudentId}>
              Clear Selection
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: "0.9rem" }}>
          Current student: <b>{currentStudent?.displayName ?? "(none selected)"}</b>
        </div>

        {status ? (
          <div style={{ marginTop: 10, color: "#111827", opacity: 0.9 }}>
            {status}
          </div>
        ) : null}
      </div>

      {/* Demographics */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "0.9rem",
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800 }}>Demographics & Contacts</div>
            <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
              Stored separately (per-student) to keep `studentStore` simple and stable.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={saveDemographics} disabled={!currentStudentId}>
              Save
            </button>
            <button type="button" onClick={clearDemographics} disabled={!currentStudentId}>
              Clear
            </button>
          </div>
        </div>

        {!currentStudentId ? (
          <div style={{ marginTop: 12, opacity: 0.75 }}>
            Select or create a student above to edit demographics.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field
                label="First name"
                value={demo.firstName}
                onChange={(v) => setDemo((d) => ({ ...d, firstName: v }))}
              />
              <Field
                label="Middle name / initial"
                value={demo.middleName}
                onChange={(v) => setDemo((d) => ({ ...d, middleName: v }))}
              />
              <Field
                label="Last name"
                value={demo.lastName}
                onChange={(v) => setDemo((d) => ({ ...d, lastName: v }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field
                label="DOB"
                value={demo.dob}
                onChange={(v) => setDemo((d) => ({ ...d, dob: v }))}
                placeholder="YYYY-MM-DD"
              />
              <Field
                label="Student phone"
                value={demo.studentPhone}
                onChange={(v) => setDemo((d) => ({ ...d, studentPhone: v }))}
              />
            </div>

            <Field
              label="Student address"
              value={demo.studentAddress}
              onChange={(v) => setDemo((d) => ({ ...d, studentAddress: v }))}
              placeholder="Street, City, State ZIP"
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field
                label="Mother / guardian name"
                value={demo.motherName}
                onChange={(v) => setDemo((d) => ({ ...d, motherName: v }))}
              />
              <Field
                label="Mother / guardian email"
                value={demo.motherEmail}
                onChange={(v) => setDemo((d) => ({ ...d, motherEmail: v }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field
                label="Father / guardian name"
                value={demo.fatherName}
                onChange={(v) => setDemo((d) => ({ ...d, fatherName: v }))}
              />
              <Field
                label="Father / guardian email"
                value={demo.fatherEmail}
                onChange={(v) => setDemo((d) => ({ ...d, fatherEmail: v }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field
                label="Caretaker name"
                value={demo.caretakerName}
                onChange={(v) => setDemo((d) => ({ ...d, caretakerName: v }))}
              />
              <Field
                label="Caretaker email"
                value={demo.caretakerEmail}
                onChange={(v) => setDemo((d) => ({ ...d, caretakerEmail: v }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field
                label="Homeroom teacher"
                value={demo.homeroomTeacherName}
                onChange={(v) => setDemo((d) => ({ ...d, homeroomTeacherName: v }))}
              />
              <Field
                label="School counselor"
                value={demo.schoolCounselorName}
                onChange={(v) => setDemo((d) => ({ ...d, schoolCounselorName: v }))}
              />
              <Field
                label="Principal"
                value={demo.principalName}
                onChange={(v) => setDemo((d) => ({ ...d, principalName: v }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field
                label="Outside counselor name"
                value={demo.outsideCounselorName}
                onChange={(v) => setDemo((d) => ({ ...d, outsideCounselorName: v }))}
              />
              <Field
                label="Outside counselor phone"
                value={demo.outsideCounselorPhone}
                onChange={(v) => setDemo((d) => ({ ...d, outsideCounselorPhone: v }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field
                label="Current school name"
                value={demo.currentSchoolName}
                onChange={(v) => setDemo((d) => ({ ...d, currentSchoolName: v }))}
              />
              <Field
                label="Current school phone"
                value={demo.currentSchoolPhone}
                onChange={(v) => setDemo((d) => ({ ...d, currentSchoolPhone: v }))}
              />
              <Field
                label="Current school address"
                value={demo.currentSchoolAddress}
                onChange={(v) => setDemo((d) => ({ ...d, currentSchoolAddress: v }))}
              />
            </div>

            <TextArea
              label="Past schools"
              value={demo.pastSchools}
              onChange={(v) => setDemo((d) => ({ ...d, pastSchools: v }))}
              placeholder="List prior schools and approximate years attended…"
            />

            <TextArea
              label="Notes"
              value={demo.notes}
              onChange={(v) => setDemo((d) => ({ ...d, notes: v }))}
              placeholder="IEP/504 notes, key triggers, important considerations…"
            />
          </div>
        )}
      </div>
    </div>
  );
}
