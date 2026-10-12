import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/asq/studentStore.ts

export type StudentRecord = {
  id: string; // stable key used in clinicalSessionStore
  displayName: string; // usually "First Last" or whatever you choose to store
  createdAt: string; // ISO
  updatedAt?: string; // ISO

  // Optional demographics / identifiers
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dob?: string; // YYYY-MM-DD (recommended)
  studentIdExternal?: string; // optional external ID (district SIS, etc.)

  // Caregivers
  motherName?: string;
  motherEmail?: string;
  motherPhone?: string;

  fatherName?: string;
  fatherEmail?: string;
  fatherPhone?: string;

  caretakerName?: string;
  caretakerEmail?: string;
  caretakerPhone?: string;

  // School contacts
  homeroomTeacherName?: string;
  homeroomTeacherEmail?: string;

  counselorName?: string;
  counselorPhone?: string;
  counselorEmail?: string;

  principalName?: string;
  principalEmail?: string;

  // School info
  currentSchoolName?: string;
  currentSchoolAddress?: string;
  currentSchoolPhone?: string;

  pastSchoolName?: string;

  // Notes (keep minimal / non-sensitive if you’re avoiding HIPAA exposure)
  notes?: string;
};

export type StudentDraft = Partial<Omit<StudentRecord, "id" | "createdAt">> & {
  displayName?: string;
};

const LS_STUDENTS = "asq_students_v1";
const LS_CURRENT_STUDENT_ID = "asq_current_student_id_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function makeId() {
  // good-enough local ID; no PII
  return `stu_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function readAll(): StudentRecord[] {
  const arr = safeParse<StudentRecord[]>(clinicalSessionStore.getItem(LS_STUDENTS), []);
  return Array.isArray(arr) ? arr : [];
}

function writeAll(students: StudentRecord[]) {
  clinicalSessionStore.setItem(LS_STUDENTS, JSON.stringify(students));
}

export function getStudents(): StudentRecord[] {
  return readAll();
}

export function getStudentById(id: string): StudentRecord | null {
  if (!id) return null;
  const students = readAll();
  return students.find((s) => s.id === id) ?? null;
}

export function getCurrentStudentId(): string {
  return clinicalSessionStore.getItem(LS_CURRENT_STUDENT_ID) ?? "";
}

export function setCurrentStudentId(id: string) {
  if (!id) {
    clinicalSessionStore.removeItem(LS_CURRENT_STUDENT_ID);
  } else {
    clinicalSessionStore.setItem(LS_CURRENT_STUDENT_ID, id);
  }
}

/**
 * Finds a student by displayName (case-insensitive, whitespace-normalized).
 * Returns null if not found.
 */
export function findStudentByName(name: string): StudentRecord | null {
  const q = normalizeName(name || "");
  if (!q) return null;
  const students = readAll();
  return students.find((s) => normalizeName(s.displayName) === q) ?? null;
}

/**
 * Create a student if not found; otherwise return existing match by displayName.
 * Also sets current student id.
 */
export function upsertStudent(displayNameOrFirstLast: string): StudentRecord {
  const name = (displayNameOrFirstLast || "").trim();
  if (!name) {
    throw new Error("upsertStudent requires a non-empty name.");
  }

  const existing = findStudentByName(name);
  if (existing) {
    setCurrentStudentId(existing.id);
    return existing;
  }

  const students = readAll();
  const rec: StudentRecord = {
    id: makeId(),
    displayName: name,
    createdAt: nowIso(),
  };

  students.unshift(rec);
  writeAll(students);
  setCurrentStudentId(rec.id);
  return rec;
}

/**
 * Update an existing student by id. Only updates provided fields.
 */
export function updateStudent(id: string, patch: StudentDraft): StudentRecord | null {
  if (!id) return null;
  const students = readAll();
  const idx = students.findIndex((s) => s.id === id);
  if (idx < 0) return null;

  const prev = students[idx];
  const next: StudentRecord = {
    ...prev,
    ...patch,
    updatedAt: nowIso(),
  };

  // Keep displayName sane if first/last are present
  if (!next.displayName || !next.displayName.trim()) {
    const fn = (next.firstName || "").trim();
    const ln = (next.lastName || "").trim();
    const built = `${fn} ${ln}`.trim();
    if (built) next.displayName = built;
    else next.displayName = prev.displayName; // fallback
  }

  students[idx] = next;
  writeAll(students);

  return next;
}

/**
 * Delete a student record and clear current student if it was selected.
 */
export function deleteStudent(id: string): boolean {
  if (!id) return false;
  const students = readAll();
  const next = students.filter((s) => s.id !== id);
  if (next.length === students.length) return false;

  writeAll(next);

  const cur = getCurrentStudentId();
  if (cur === id) setCurrentStudentId("");

  return true;
}
