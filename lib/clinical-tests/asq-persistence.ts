import { clinicalSessionStore } from "./clinicalSessionStore";
import { getCurrentStudentId, getStudentById } from "./legacy/src/asq/studentStore";

/**
 * ASQ/ASEQ QA snapshot covers every existing assessment, student, demographic,
 * report and incident key. Raw values are JSON-serialized legacy data, preserving
 * all fields without silently discarding new questionnaire items.
 */
export type AsqSnapshot = Record<string,string>;
export type AsqKind = "student"|"parent"|"teacher"|"legacy_parent"|"student_demographics"|"combined_report"|"support_incidents";
export type AsqDocument = {
  document_kind: AsqKind;
  form_version: string;
  status: "draft";
  responses: Record<string,unknown>;
  scores: Record<string,unknown>;
  narrative: string;
};

function parseObject(value: string|undefined): Record<string,unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string,unknown> : {};
  } catch { return {}; }
}

export function readAsqSnapshot(): AsqSnapshot {
  return clinicalSessionStore.exportAsq();
}

export function importAsqSnapshot(value: AsqSnapshot): void {
  clinicalSessionStore.importAsq(value);
}

export function currentAsqStudentProfile(): Record<string,unknown> {
  const id = getCurrentStudentId();
  return id ? (getStudentById(id) as unknown as Record<string,unknown>|null) ?? {} : {};
}

export function asqDocuments(snapshot: AsqSnapshot): AsqDocument[] {
  const studentId = snapshot["asq_current_student_id_v1"] ?? "";
  const profile = (type: string) => parseObject(snapshot[`asq_profile_${type}_${studentId}_v1`]);
  const answers = (key: string) => parseObject(snapshot[key]);
  const records: AsqDocument[] = [
    {
      document_kind: "student", form_version: "ASQ-self-179-v1", status: "draft",
      responses: answers("asq_self_responses_v1"), scores: profile("student"),
      narrative: snapshot[`asq_narrative_student_${studentId}_v1`] ?? "",
    },
    {
      document_kind: "parent", form_version: "ASQ-parent-v1", status: "draft",
      responses: answers("asq_parent_responses_v1"), scores: profile("parent"),
      narrative: snapshot[`asq_narrative_parent_${studentId}_v1`] ?? "",
    },
    {
      document_kind: "teacher", form_version: "ASQ-teacher-v1", status: "draft",
      responses: answers("asq_teacher_responses_v1"), scores: profile("teacher"),
      narrative: snapshot[`asq_narrative_teacher_${studentId}_v1`] ?? "",
    },
    {
      document_kind: "legacy_parent", form_version: "ASQ-legacy-parent-v1", status: "draft",
      responses: answers("asq_legacy_parent_responses_v1"),
      scores: answers(`asq_legacy_parent_scores_${studentId}_v1`), narrative: "",
    },
    {
      document_kind: "student_demographics", form_version: "ASQ-student-details-v1", status: "draft",
      responses: answers(`sentinel_student_demo_${studentId}_v1`),
      scores: {}, narrative: "",
    },
    {
      document_kind: "combined_report", form_version: "ASQ-combined-v1", status: "draft",
      responses: {}, scores: {},
      narrative: snapshot[`asq_combined_report_${studentId}_v1`] ?? "",
    },
    {
      document_kind: "support_incidents", form_version: "ASQ-support-v1", status: "draft",
      responses: answers("asq_app_data_v1"), scores: {}, narrative: "",
    },
  ];
  return records;
}
