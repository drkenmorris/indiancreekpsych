import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/asq/storage.ts




// A generic result we can reuse for ANY assessment (autism, anxiety, etc.)
export interface StoredAssessmentResult {
  id: string;
  childId: string;
  type: string; // e.g. "AUTISM_PARENT", "AUTISM_TEACHER", "ANXIETY_CHILD"
  formVersion?: string;
  respondentRole?: string; // e.g. "PARENT", "TEACHER", "SELF"

  createdAt: string; // ISO string

  scores: {
    total: number;
    domainScores?: Record<string, number>;
    interpretation: string;
  };

  // Raw item responses, keyed by itemId (e.g. "SOCIAL_01")
  rawResponses: Record<string, number>;
}






import type { BehaviorIncident } from "./behavior";


export interface ChildProfile {
  id: string;
  name: string;
  dateOfBirth?: string; // ISO date string (optional)
  grade?: string;
  notes?: string;
}




export interface ChildData {
  profile: ChildProfile;
  incidents: BehaviorIncident[];
  assessments?: StoredAssessmentResult[]; // ← NEW
}


export interface AppData {
  children: ChildData[];
  activeChildId?: string | null;
}

const STORAGE_KEY = "asq_app_data_v1";










export function loadAppData(): AppData {
  if (typeof window === "undefined") {
    return { children: [], activeChildId: null };
  }

  try {
    const raw = clinicalSessionStore.getItem(STORAGE_KEY);
    if (!raw) {
      return { children: [], activeChildId: null };
    }
    const parsed = JSON.parse(raw) as AppData;

    // Basic sanity checks
    if (!Array.isArray(parsed.children)) {
      return { children: [], activeChildId: null };
    }

    return {
      children: parsed.children,
      activeChildId: parsed.activeChildId ?? null,
    };
  } catch {
    return { children: [], activeChildId: null };
  }
}

export function saveAppData(data: AppData): void {
  if (typeof window === "undefined") return;

  try {
    const toStore: AppData = {
      children: data.children,
      activeChildId: data.activeChildId ?? null,
    };
    clinicalSessionStore.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Fail quietly; we don't want to crash the app if storage is full/blocked.
  }
}

export function createChildProfile(
  name: string,
  options?: { dateOfBirth?: string; grade?: string; notes?: string }
): ChildProfile {
  const id = `child_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return {
    id,
    name: name.trim(),
    dateOfBirth: options?.dateOfBirth,
    grade: options?.grade,
    notes: options?.notes,
  };
}
export interface SaveAssessmentArgs {
  childId: string;
  type: string; // e.g. "AUTISM_PARENT"
  formVersion?: string;
  respondentRole?: string; // "PARENT", "TEACHER", etc.

  scores: {
    total: number;
    domainScores?: Record<string, number>;
    interpretation: string;
  };

  rawResponses: Record<string, number>;
}

/**
 * Append an assessment result to a specific child's record.
 * Returns the new assessment id.
 */
export function appendAssessmentResult({
  childId,
  type,
  formVersion,
  respondentRole,
  scores,
  rawResponses,
}: SaveAssessmentArgs): string {
  const data = loadAppData();
  const children: ChildData[] = data.children || [];

  const now = new Date().toISOString();
  const id =
    type +
    "-" +
    now +
    "-" +
    Math.random().toString(36).slice(2, 8);

  const updatedChildren = children.map((child) => {
    if (child.profile.id !== childId) return child;

    const existing = child.assessments ?? [];
    const newResult: StoredAssessmentResult = {
      id,
      childId,
      type,
      formVersion,
      respondentRole,
      createdAt: now,
      scores,
      rawResponses,
    };

    return {
      ...child,
      assessments: [...existing, newResult],
    };
  });

  // If the childId didn't match any existing child, we just keep data as-is.
  // (You could also decide to throw here if you want it stricter.)
  saveAppData({
    ...data,
    children: updatedChildren,
  });

  return id;
}
